import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../shared/env.js";

const authRouter = Router();

const ADMIN_USER = "admin";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync("tsk123", 10);

authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  if (username !== ADMIN_USER) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username, role: "admin" }, env.JWT_SECRET, {
    expiresIn: "24h"
  });

  return res.json({ token });
});

export { authRouter };
