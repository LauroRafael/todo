import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../db/data-source.js";
import { Task, TaskStatus } from "../entities/Task.js";
import { Apontamento } from "../entities/Apontamento.js";
const createTaskSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).optional().nullable(),
    deadline: z.string().optional().nullable(),
    estimatedHours: z.number().int().min(0).optional(),
    postponedCount: z.number().int().min(0).optional()
});
const updateTaskSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    status: z.nativeEnum(TaskStatus).optional(),
    completed: z.boolean().optional(),
    deadline: z.string().optional().nullable(),
    estimatedHours: z.number().int().min(0).optional(),
    executedHours: z.number().int().min(0).optional(),
    postponedCount: z.number().int().min(0).optional()
});
const createApontamentoSchema = z.object({
    taskId: z.string().uuid(),
    content: z.string().trim().max(5000).optional().nullable(),
    hoursSpent: z.number().int().min(0),
    workDate: z.string().optional().nullable()
});
const updateApontamentoSchema = z.object({
    content: z.string().trim().max(5000).optional().nullable(),
    hoursSpent: z.number().int().min(0).optional(),
    workDate: z.string().optional().nullable()
});
export const tasksRouter = Router();
tasksRouter.use((_req, res, next) => {
    if (!AppDataSource.isInitialized) {
        return res.status(503).json({ error: "Banco ainda conectando. Tente novamente em instantes." });
    }
    return next();
});
tasksRouter.get("/", async (_req, res) => {
    const repo = AppDataSource.getRepository(Task);
    const tasks = await repo.find({ order: { createdAt: "DESC" } });
    return res.json(tasks);
});
tasksRouter.post("/", async (req, res) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const repo = AppDataSource.getRepository(Task);
    const task = repo.create({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        estimatedHours: parsed.data.estimatedHours ?? 0,
        postponedCount: parsed.data.postponedCount ?? 0,
        completed: false
    });
    await repo.save(task);
    return res.status(201).json(task);
});
tasksRouter.put("/:id", async (req, res) => {
    const { id } = req.params;
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const repo = AppDataSource.getRepository(Task);
    const task = await repo.findOneBy({ id });
    if (!task)
        return res.status(404).json({ error: "Task não encontrada" });
    const updateData = { ...parsed.data };
    if (updateData["deadline"]) {
        updateData["deadline"] = new Date(updateData["deadline"]);
    }
    repo.merge(task, updateData);
    await repo.save(task);
    return res.json(task);
});
tasksRouter.get("/:id/apontamentos", async (req, res) => {
    const { id } = req.params;
    const taskRepo = AppDataSource.getRepository(Task);
    const task = await taskRepo.findOneBy({ id });
    if (!task)
        return res.status(404).json({ error: "Task não encontrada" });
    const repo = AppDataSource.getRepository(Apontamento);
    const apontamentos = await repo.find({ where: { task: { id } }, order: { createdAt: "DESC" } });
    return res.json(apontamentos);
});
tasksRouter.post("/apontamentos", async (req, res) => {
    const parsed = createApontamentoSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const taskRepo = AppDataSource.getRepository(Task);
    const task = await taskRepo.findOneBy({ id: parsed.data.taskId });
    if (!task)
        return res.status(404).json({ error: "Task não encontrada" });
    const repo = AppDataSource.getRepository(Apontamento);
    const apontamento = repo.create({
        task,
        content: parsed.data.content ?? null,
        hoursSpent: parsed.data.hoursSpent,
        workDate: parsed.data.workDate ? new Date(parsed.data.workDate) : new Date()
    });
    await repo.save(apontamento);
    task.executedHours += parsed.data.hoursSpent;
    task.apontamentos = [...(task.apontamentos ?? []), apontamento];
    await taskRepo.save(task);
    return res.status(201).json(apontamento);
});
tasksRouter.put("/apontamentos/:id", async (req, res) => {
    const { id } = req.params;
    const parsed = updateApontamentoSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const repo = AppDataSource.getRepository(Apontamento);
    const apontamento = await repo.findOneBy({ id });
    if (!apontamento)
        return res.status(404).json({ error: "Apontamento não encontrado" });
    const oldHours = apontamento.hoursSpent;
    const newHours = parsed.data.hoursSpent ?? oldHours;
    repo.merge(apontamento, parsed.data);
    if (parsed.data.workDate) {
        apontamento.workDate = new Date(parsed.data.workDate);
    }
    await repo.save(apontamento);
    const taskRepo = AppDataSource.getRepository(Task);
    const task = await taskRepo.findOneBy({ id: apontamento.task.id });
    if (task) {
        task.executedHours = task.executedHours - oldHours + newHours;
        await taskRepo.save(task);
    }
    return res.json(apontamento);
});
tasksRouter.delete("/apontamentos/:id", async (req, res) => {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(Apontamento);
    const apontamento = await repo.findOneBy({ id });
    if (!apontamento)
        return res.status(404).json({ error: "Apontamento não encontrado" });
    const hoursToRemove = apontamento.hoursSpent;
    await repo.remove(apontamento);
    const taskRepo = AppDataSource.getRepository(Task);
    const task = await taskRepo.findOneBy({ id: apontamento.task.id });
    if (task) {
        task.executedHours = Math.max(0, task.executedHours - hoursToRemove);
        await taskRepo.save(task);
    }
    return res.status(204).send();
});
tasksRouter.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const repo = AppDataSource.getRepository(Task);
    const task = await repo.findOneBy({ id });
    if (!task)
        return res.status(404).json({ error: "Task não encontrada" });
    await repo.remove(task);
    return res.status(204).send();
});
