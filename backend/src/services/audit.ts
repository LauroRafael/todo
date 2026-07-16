import { AppDataSource } from "../db/data-source.js";
import type { AuthRequest } from "../middleware/auth.js";

export type TaskEventType =
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_postponed"
  | "task_deleted"
  | "apontamento_added"
  | "apontamento_updated"
  | "apontamento_removed";

export async function logTaskEvent(
  req: AuthRequest,
  taskId: string,
  type: TaskEventType,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    const repo = AppDataSource.getRepository("TaskEvent");
    const actor = req.user?.username ?? "system";
    await repo.save({ taskId, actor, type, payload: JSON.stringify(payload) });
  } catch (err) {
    console.error("[audit] Falha ao registrar evento:", err);
  }
}

export async function listTaskEvents(taskId: string): Promise<unknown[]> {
  const repo = AppDataSource.getRepository("TaskEvent");
  return repo.find({ where: { taskId }, order: { createdAt: "DESC" } });
}
