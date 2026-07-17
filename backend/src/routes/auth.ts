import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AppDataSource } from "../db/data-source.js";
import { env } from "../shared/env.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AuthRequest } from "../middleware/auth.js";

const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const repo = AppDataSource.getRepository("User");
  const user = await repo.findOneBy({ username });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username: user.username, role: user.role, displayName: user.displayName }, env.JWT_SECRET, {
    expiresIn: "24h"
  });

  return res.json({ token });
});

authRouter.get("/users", authMiddleware, async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const repo = AppDataSource.getRepository("User");
  const users = await repo.find({ select: ["id", "username", "displayName", "role", "createdAt"] });
  return res.json(users);
});

const createUserSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(3).max(100),
  role: z.enum(["admin", "user"]).default("user"),
  displayName: z.string().trim().min(1).max(200).optional()
});

authRouter.post("/users", authMiddleware, async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
  }

  const { username, password, role, displayName } = parsed.data;
  const repo = AppDataSource.getRepository("User");

  const existing = await repo.findOneBy({ username });
  if (existing) {
    return res.status(409).json({ error: "Usuário já existe" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await repo.save({ username, passwordHash, role, displayName: displayName ?? username });
  return res.status(201).json({
    id: created.id,
    username: created.username,
    displayName: created.displayName,
    role: created.role,
    createdAt: created.createdAt
  });
});

const updateUserSchema = z.object({
  password: z.string().min(3).max(100).optional(),
  role: z.enum(["admin", "user"]).optional(),
  displayName: z.string().trim().min(1).max(200).optional()
});

authRouter.put("/users/:id", authMiddleware, async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" });
  }

  const { id } = req.params;
  const repo = AppDataSource.getRepository("User");
  const user = await repo.findOneBy({ id });
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role;
  if (parsed.data.displayName !== undefined) updateData.displayName = parsed.data.displayName;
  if (parsed.data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await repo.update({ id }, updateData);
  const updated = await repo.findOneBy({ id });
  return res.json({
    id: updated!.id,
    username: updated!.username,
    displayName: updated!.displayName,
    role: updated!.role,
    createdAt: updated!.createdAt
  });
});

authRouter.delete("/users/:id", authMiddleware, async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { id } = req.params;
  const repo = AppDataSource.getRepository("User");
  const user = await repo.findOneBy({ id });
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  if (user.username === req.user?.username) {
    return res.status(400).json({ error: "Você não pode excluir o próprio usuário" });
  }

  const taskRepo = AppDataSource.getRepository("Task");
  await taskRepo.delete({ userId: id });

  await repo.remove(user);
  return res.status(204).send();
});

authRouter.post("/impersonate", authMiddleware, async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { username } = req.body;
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username required" });
  }

  const repo = AppDataSource.getRepository("User");
  const user = await repo.findOneBy({ username });
  if (!user) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  const token = jwt.sign(
    { username: user.username, role: user.role, displayName: user.displayName, impersonatedBy: req.user?.username },
    env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  return res.json({ token });
});

export { authRouter };
