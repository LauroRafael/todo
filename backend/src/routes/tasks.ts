import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../db/data-source.js";
import { logTaskEvent } from "../services/audit.js";
import type { AuthRequest } from "../middleware/auth.js";

const TaskStatus = ["pendente", "em_execução", "concluída", "cancelada"] as const;

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimatedHours: z.number().min(0).optional()
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(TaskStatus).optional(),
  completed: z.boolean().optional(),
  deadline: z.string().optional().nullable(),
  estimatedHours: z.number().min(0).optional()
});

const createApontamentoSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().trim().max(5000).optional().nullable(),
  hoursSpent: z.number().min(0),
  workDate: z.string().optional().nullable()
});

const updateApontamentoSchema = z.object({
  content: z.string().trim().max(5000).optional().nullable(),
  hoursSpent: z.number().min(0).optional(),
  workDate: z.string().optional().nullable()
});

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

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
  const deadline = parseDate(parsed.data.deadline);

  const task = repo.create({
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    deadline,
    estimatedHours: parsed.data.estimatedHours ?? 0,
    postponedCount: 0,
    completed: false,
    status: "pendente"
  });
  await repo.save(task);
  await logTaskEvent(req as AuthRequest, task.id, "task_created", { title: task.title });
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
  const oldDeadlineTime = task.deadline ? new Date(task.deadline).getTime() : null;
  const oldStatus = task.status;

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (updateData["deadline"] !== undefined) {
    updateData["deadline"] = parseDate(updateData["deadline"]);
  }

  // Sincroniza completed <-> status="concluída"
  if (parsed.data.status === "concluída" && !task.completed) {
    updateData["completed"] = true;
  } else if (
    parsed.data.status &&
    parsed.data.status !== "concluída" &&
    task.completed &&
    parsed.data.completed === undefined
  ) {
    updateData["completed"] = false;
  }
  if (parsed.data.completed === true && task.status !== "concluída") {
    updateData["status"] = "concluída";
  } else if (parsed.data.completed === false && task.status === "concluída" && parsed.data.status === undefined) {
    updateData["status"] = "em_execução";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await repo.update({ id }, updateData as any);
  const updatedTask = await repo.findOneBy({ id });
  if (!updatedTask) return res.status(404).json({ error: "Task não encontrada" });

  const newExecutedHours = updatedTask.executedHours;
  const newDeadlineTime = updatedTask.deadline ? new Date(updatedTask.deadline).getTime() : null;
  const newEstimatedHours = updatedTask.estimatedHours;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let postponeIncrement = 0;

  if (oldDeadlineTime && newDeadlineTime && newDeadlineTime < oldDeadlineTime) {
    postponeIncrement = 1;
  }

  if (newDeadlineTime && newDeadlineTime < today.getTime() && !updatedTask.completed) {
    postponeIncrement = 1;
  }

  if (newEstimatedHours > 0 && newExecutedHours > newEstimatedHours && oldExecutedHours <= newEstimatedHours) {
    postponeIncrement = 1;
  }

  if (postponeIncrement > 0) {
    const newCount = (updatedTask.postponedCount || 0) + postponeIncrement;
    await repo.update({ id: updatedTask.id }, { postponedCount: newCount });
    updatedTask.postponedCount = newCount;
    await logTaskEvent(req as AuthRequest, id, "task_postponed", {
      reason: "deadline_or_hours_exceeded",
      count: newCount
    });
  }

  if (oldStatus !== updatedTask.status) {
    await logTaskEvent(req as AuthRequest, id, "task_status_changed", { from: oldStatus, to: updatedTask.status });
  }
  await logTaskEvent(req as AuthRequest, id, "task_updated", { fields: Object.keys(parsed.data) });

  return res.json(updatedTask);
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
  const workDate = parsed.data.workDate ? (parseDate(parsed.data.workDate) ?? new Date()) : new Date();

  const apontamento = repo.create({
    taskId: parsed.data.taskId,
    content: parsed.data.content ?? null,
    hoursSpent: parsed.data.hoursSpent,
    workDate
  });
  await repo.save(apontamento);

  const oldExecutedHours = task.executedHours || 0;
  const newExecutedHours = oldExecutedHours + parsed.data.hoursSpent;

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

  const taskUpdate: Record<string, number> = { executedHours: newExecutedHours };
  if (postponeIncrement > 0) {
    taskUpdate.postponedCount = (task.postponedCount || 0) + postponeIncrement;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await taskRepo.update({ id: task.id }, taskUpdate as any);
  await logTaskEvent(req as AuthRequest, task.id, "apontamento_added", {
    apontamentoId: apontamento.id,
    hoursSpent: parsed.data.hoursSpent
  });

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

  const apontUpdate: Record<string, unknown> = { ...parsed.data };
  if (apontUpdate["workDate"]) {
    apontUpdate["workDate"] = parseDate(apontUpdate["workDate"]) ?? apontamento.workDate;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await repo.update({ id }, apontUpdate as any);

  const taskRepo = AppDataSource.getRepository("Task");
  if (apontamento.taskId) {
    const task = await taskRepo.findOneBy({ id: apontamento.taskId });
    if (task) {
      const diff = newHours - oldHours;
      await taskRepo.update({ id: apontamento.taskId }, { executedHours: Math.max(0, task.executedHours + diff) });
      await logTaskEvent(req as AuthRequest, apontamento.taskId, "apontamento_updated", {
        apontamentoId: id,
        oldHours,
        newHours
      });
    }
  }

  const updated = await repo.findOneBy({ id });
  return res.json(updated ?? apontamento);
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
    const newHours = Math.max(0, task.executedHours - hoursToRemove);
    await taskRepo.update({ id: taskId }, { executedHours: newHours });
    await logTaskEvent(req as AuthRequest, taskId, "apontamento_removed", {
      apontamentoId: id,
      hoursRemoved: hoursToRemove
    });
  }

  return res.status(204).send();
});

tasksRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const repo = AppDataSource.getRepository("Task");
  const task = await repo.findOneBy({ id });
  if (!task) return res.status(404).json({ error: "Task não encontrada" });

  await repo.remove(task);
  await logTaskEvent(req as AuthRequest, id, "task_deleted", { title: task.title });
  return res.status(204).send();
});
