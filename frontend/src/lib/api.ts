export type TaskStatus = "pendente" | "em_execução" | "concluída" | "cancelada";

export type Apontamento = {
  id: string;
  taskId: string;
  content: string | null;
  hoursSpent: number;
  workDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  completed: boolean;
  deadline: string | null;
  estimatedHours: number;
  executedHours: number;
  postponedCount: number;
  apontamentosCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Health = {
  ok: boolean;
  db?: "connected" | "connecting";
};

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Erro HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type LoginResponse = {
  token: string;
};

export const api = {
  login: (username: string, password: string) =>
    http<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  health: () => http<Health>("/health"),
  listTasks: () => http<Task[]>("/tasks"),
  createTask: (data: { title: string; description?: string | null; deadline?: string | null; estimatedHours?: number; postponedCount?: number }) =>
    http<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: string, data: { title?: string; description?: string | null; status?: TaskStatus; completed?: boolean; deadline?: string | null; estimatedHours?: number; executedHours?: number; postponedCount?: number }) =>
    http<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTask: (id: string) => http<void>(`/tasks/${id}`, { method: "DELETE" }),
  listApontamentos: (taskId: string) => http<Apontamento[]>(`/tasks/${taskId}/apontamentos`),
  countApontamentos: (taskId: string) => http<{ count: number }>(`/tasks/${taskId}/apontamentos/count`),
  createApontamento: (data: { taskId: string; content?: string | null; hoursSpent: number; workDate?: string }) =>
    http<Apontamento>("/tasks/apontamentos", { method: "POST", body: JSON.stringify(data) }),
  updateApontamento: (id: string, data: { content?: string | null; hoursSpent?: number; workDate?: string }) =>
    http<Apontamento>(`/tasks/apontamentos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteApontamento: (id: string) => http<void>(`/tasks/apontamentos/${id}`, { method: "DELETE" })
};

