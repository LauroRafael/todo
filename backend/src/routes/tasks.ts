import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../db/data-source.js";

const TaskStatus = ["pendente", "em_execução", "concluída", "cancelada"] as const;

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
  status: z.enum(TaskStatus).optional(),
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
  const repo = AppDataSource.getRepository("Task");
  const tasks = await repo.find({ order: { createdAt: "DESC" } });
  const apontRepo = AppDataSource.getRepository("Apontamento");
  const tasksWithCount = await Promise.all(
    tasks.map(async (t) => {
      const count = await apontRepo.count({ where: { taskId: t.id } });
      return { ...t, apontamentosCount: count };
    })
  );
  return res.json(tasksWithCount);
});

tasksRouter.post("/", async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const repo = AppDataSource.getRepository("Task");
  let deadline: Date | null = null;
  if (parsed.data.deadline) {
    const [year, month, day] = parsed.data.deadline.split("-").map(Number);
    deadline = new Date(Date.UTC(year, month - 1, day));
  }
  
  const task = repo.create({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    deadline,
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
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const repo = AppDataSource.getRepository("Task");
  const task = await repo.findOneBy({ id });
  if (!task) return res.status(404).json({ error: "Task não encontrada" });

  const oldExecutedHours = task.executedHours;
  const oldDeadline = task.deadline;

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData["deadline"] && typeof updateData["deadline"] === "string") {
    const [year, month, day] = updateData["deadline"].split("-").map(Number);
    updateData["deadline"] = new Date(Date.UTC(year, month - 1, day));
  }

  repo.merge(task, updateData);
  await repo.save(task);

  const newExecutedHours = typeof updateData["executedHours"] === "number" 
    ? updateData["executedHours"] 
    : task.executedHours;
  const newDeadline = updateData["deadline"] 
    ? updateData["deadline"] as Date 
    : task.deadline;
  const newEstimatedHours = typeof updateData["estimatedHours"] === "number" 
    ? updateData["estimatedHours"] 
    : task.estimatedHours;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let postponeIncrement = 0;

  const oldDeadlineTime = oldDeadline ? new Date(oldDeadline).getTime() : null;
  const newDeadlineTime = newDeadline ? new Date(newDeadline).getTime() : null;

  if (oldDeadlineTime && newDeadlineTime && oldDeadlineTime !== newDeadlineTime) {
    postponeIncrement = 1;
  }

  if (newDeadlineTime && newDeadlineTime < today.getTime() && !task.completed) {
    postponeIncrement = 1;
  }

  if (newEstimatedHours > 0 && newExecutedHours > newEstimatedHours && oldExecutedHours <= newEstimatedHours) {
    postponeIncrement = 1;
  }

  if (postponeIncrement > 0) {
    task.postponedCount = (task.postponedCount || 0) + postponeIncrement;
    await repo.save(task);
  }

  return res.json(task);
});

tasksRouter.get("/:id/apontamentos", async (req, res) => {
  const { id } = req.params;
  const taskRepo = AppDataSource.getRepository("Task");
  const task = await taskRepo.findOneBy({ id });
  if (!task) return res.status(404).json({ error: "Task não encontrada" });

  const repo = AppDataSource.getRepository("Apontamento");
  const apontamentos = await repo.find({ where: { taskId: id }, order: { createdAt: "DESC" } });
  return res.json(apontamentos);
});

tasksRouter.get("/:id/apontamentos/count", async (req, res) => {
  const { id } = req.params;
  const taskRepo = AppDataSource.getRepository("Task");
  const task = await taskRepo.findOneBy({ id });
  if (!task) return res.status(404).json({ error: "Task não encontrada" });

  const repo = AppDataSource.getRepository("Apontamento");
  const count = await repo.count({ where: { taskId: id } });
  return res.json({ count });
});

tasksRouter.post("/apontamentos", async (req, res) => {
  const parsed = createApontamentoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const taskRepo = AppDataSource.getRepository("Task");
  const task = await taskRepo.findOneBy({ id: parsed.data.taskId });
  if (!task) return res.status(404).json({ error: "Task não encontrada" });

  const repo = AppDataSource.getRepository("Apontamento");
  let workDate: Date;
  if (parsed.data.workDate) {
    const [year, month, day] = parsed.data.workDate.split("-").map(Number);
    workDate = new Date(Date.UTC(year, month - 1, day));
  } else {
    workDate = new Date();
  }
  
  const apontamento = repo.create({
    taskId: parsed.data.taskId,
    content: parsed.data.content ?? null,
    hoursSpent: parsed.data.hoursSpent,
    workDate
  });
  await repo.save(apontamento);

  const oldExecutedHours = task.executedHours || 0;
  const newExecutedHours = oldExecutedHours + parsed.data.hoursSpent;
  task.executedHours = newExecutedHours;
  
  let postponeIncrement = 0;
  
  if (task.deadline) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const deadline = new Date(new Date(task.deadline).getTime() + 86400000);
    if (deadline.getTime() < today.getTime() && !task.completed) {
      postponeIncrement = 1;
    }
  }
  
  if (task.estimatedHours > 0 && newExecutedHours > task.estimatedHours && oldExecutedHours <= task.estimatedHours) {
    postponeIncrement = 1;
  }
  
  if (postponeIncrement > 0) {
    task.postponedCount = (task.postponedCount || 0) + postponeIncrement;
  }
  
  await taskRepo.save(task);

  return res.status(201).json(apontamento);
});

tasksRouter.put("/apontamentos/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = updateApontamentoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const repo = AppDataSource.getRepository("Apontamento");
  const apontamento = await repo.findOneBy({ id });
  if (!apontamento) return res.status(404).json({ error: "Apontamento não encontrado" });

  const oldHours = apontamento.hoursSpent;
  const newHours = parsed.data.hoursSpent ?? oldHours;

  repo.merge(apontamento, parsed.data);
  if (parsed.data.workDate) {
    const [year, month, day] = parsed.data.workDate.split("-").map(Number);
    apontamento.workDate = new Date(Date.UTC(year, month - 1, day));
  }
  await repo.save(apontamento);

  const taskRepo = AppDataSource.getRepository("Task");
  const task = await taskRepo.findOneBy({ id: apontamento.taskId });
  if (task) {
    task.executedHours = task.executedHours - oldHours + newHours;
    await taskRepo.save(task);
  }

  return res.json(apontamento);
});

tasksRouter.delete("/apontamentos/:id", async (req, res) => {
  const { id } = req.params;
  const repo = AppDataSource.getRepository("Apontamento");
  const apontamento = await repo.findOneBy({ id });
  if (!apontamento) return res.status(404).json({ error: "Apontamento não encontrado" });

  const hoursToRemove = apontamento.hoursSpent;
  const taskId = apontamento.taskId;

  await repo.remove(apontamento);

  const taskRepo = AppDataSource.getRepository("Task");
  const task = await taskRepo.findOneBy({ id: taskId });
  if (task) {
    task.executedHours = Math.max(0, task.executedHours - hoursToRemove);
    await taskRepo.save(task);
  }

  return res.status(204).send();
});

tasksRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const repo = AppDataSource.getRepository("Task");
  const task = await repo.findOneBy({ id });
  if (!task) return res.status(404).json({ error: "Task não encontrada" });

  await repo.remove(task);
  return res.status(204).send();
});