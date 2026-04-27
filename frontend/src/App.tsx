import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { api, type Apontamento, type Health, type Task, type TaskStatus } from "./lib/api";

const SweetAlert = withReactContent(Swal);

const swalDefaults = {
  confirmButtonColor: "#4f46e5",
  cancelButtonColor: "#64748b",
  background: "#1e293b",
  color: "#f1f5f9"
};

const toast = (icon: "success" | "error", title: string) =>
  SweetAlert.fire({ icon, title, timer: 2000, toast: true, position: "bottom-right", ...swalDefaults });

const confirm = (title: string, confirmText = "Remover") =>
  SweetAlert.fire({ icon: "warning", title, showCancelButton: true, confirmButtonText: confirmText, confirmButtonColor: "#dc2626", background: "#1e293b", color: "#f1f5f9" });

type Draft = {
  title: string;
  description: string;
  deadline: string;
  estimatedHours: number;
};

function formatDate(date: string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function calculatePercent(task: Task): number {
  if (task.estimatedHours === 0) return 0;
  return Math.round((task.executedHours / task.estimatedHours) * 100);
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    pendente: "bg-slate-700 text-slate-300",
    em_execução: "bg-amber-900/50 text-amber-200",
    concluída: "bg-emerald-900/50 text-emerald-200",
    cancelada: "bg-red-900/50 text-red-200"
  };
  const labels: Record<TaskStatus, string> = {
    pendente: "Pendente",
    em_execução: "Em Execução",
    concluída: "Concluída",
    cancelada: "Cancelada"
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem("token", res.token);
      onLogin();
    } catch {
      setError("Usuário ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-100">TaskFlow</h1>
        {error ? <p className="mb-4 rounded-lg bg-red-900/30 p-2 text-center text-sm text-red-200">{error}</p> : null}
        <div className="mb-4">
          <label className="mb-1 block text-xs text-slate-400">Usuário</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            placeholder="admin"
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-xs text-slate-400">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            placeholder="••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function ApontamentosPanel({ task, onClose, onUpdate }: { task: Task; onClose: () => void; onUpdate: () => void }) {
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ content: "", workDate: new Date().toISOString().split("T")[0], workTime: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.listApontamentos(task.id);
        setApontamentos(data);
      } catch {
        toast("error", "Erro ao carregar apontamentos");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [task.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.workDate) return;
    setSaving(true);
    try {
      const hoursSpent = parseInt(draft.workTime) || 0;
      const created = await api.createApontamento({
        taskId: task.id,
        content: draft.content || null,
        hoursSpent: hoursSpent,
        workDate: draft.workDate
      });
      setApontamentos((prev) => [created, ...prev]);
      setDraft({ content: "", workDate: new Date().toISOString().split("T")[0], workTime: "0" });
      onUpdate();
      toast("success", "Apontamento adicionado!");
    } catch {
      toast("error", "Erro ao criar apontamento");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(a: Apontamento) {
    const result = await confirm("Remover este apontamento?");
    if (!result.isConfirmed) return;
    try {
      await api.deleteApontamento(a.id);
      setApontamentos((prev) => prev.filter((x) => x.id !== a.id));
      onUpdate();
      toast("success", "Apontamento removido!");
    } catch {
      toast("error", "Erro ao remover");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Apontamentos</h3>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-slate-400 hover:bg-slate-800">
            Fechar
          </button>
        </div>

        <form className="mb-6 grid gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Data</label>
              <DatePicker
                selected={draft.workDate ? new Date(draft.workDate + "T00:00:00") : null}
                onChange={(date: Date | null) => setDraft((d) => ({ ...d, workDate: date ? date.toISOString().split("T")[0] : "" }))}
                dateFormat="dd/MM/yyyy"
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                placeholderText="Selecione a data"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Horas</label>
              <input
                type="number"
                min="0"
                value={draft.workTime}
                onChange={(e) => setDraft((d) => ({ ...d, workTime: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-500"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Descrição do trabalho realizado</label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              className="min-h-20 w-full resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="O que foi feito nesta sessão..."
            />
          </div>
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60">
            {saving ? "Salvando..." : "Adicionar Apontamento"}
          </button>
        </form>

        {loading ? (
          <div className="text-center text-sm text-slate-400">Carregando...</div>
        ) : apontamentos.length === 0 ? (
          <div className="text-center text-sm text-slate-400">Nenhum apontamento ainda.</div>
        ) : (
          <ul className="space-y-3">
            {apontamentos.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{formatDate(a.workDate)}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-indigo-900/40 px-2 py-0.5 text-xs text-indigo-200">{formatHours(a.hoursSpent)}</span>
                    <button onClick={() => onDelete(a)} className="text-xs text-red-400 hover:text-red-300">Excluir</button>
                  </div>
                </div>
                {a.content ? <p className="whitespace-pre-wrap text-sm text-slate-300">{a.content}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [draft, setDraft] = useState<Draft>({ title: "", description: "", deadline: "", estimatedHours: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [apontamentosTask, setApontamentosTask] = useState<Task | null>(null);
  const [screen, setScreen] = useState<"loading" | "login" | "tasks">("loading");
  const editingTask = tasks.find((t) => t.id === editingId) ?? null;

  async function refresh() {
    setLoading(true);
    try {
      setTasks(await api.listTasks());
    } catch (e) {
      if (e instanceof Error && e.message === "Unauthorized") {
        setScreen("login");
        return;
      }
      toast("error", e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  async function refreshHealth() {
    setHealthLoading(true);
    try {
      setHealth(await api.health());
    } catch {
      setHealth({ ok: false });
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    setScreen(!!token ? "tasks" : "login");
  }, []);

  useEffect(() => {
    if (screen === "tasks") {
      void refresh();
    }
  }, [screen]);

  useEffect(() => {
    void refreshHealth();
    const id = window.setInterval(() => void refreshHealth(), 10_000);
    return () => window.clearInterval(id);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setScreen("login");
  }

  if (screen === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  const taskStatuses: TaskStatus[] = ["pendente", "em_execução", "concluída", "cancelada"];

  if (screen === "login") {
    return <LoginScreen onLogin={() => setScreen("tasks")} />;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title) return;

    try {
      const created = await api.createTask({
        title,
        description: description || undefined,
        deadline: draft.deadline || undefined,
        estimatedHours: draft.estimatedHours || undefined
      });
      setTasks((prev) => [created, ...prev]);
      setDraft({ title: "", description: "", deadline: "", estimatedHours: 0 });
      toast("success", "Task criada!");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  async function onToggleCompleted(task: Task) {
    try {
      const updated = await api.updateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function onChangeStatus(task: Task, status: TaskStatus) {
    try {
      const updated = await api.updateTask(task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function onDelete(task: Task) {
    const result = await confirm("Remover esta task?");
    if (!result.isConfirmed) return;
    try {
      await api.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (editingId === task.id) setEditingId(null);
      toast("success", "Task removida!");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    const title = draft.title.trim();
    const description = draft.description.trim();
    if (!title) return;

    try {
      const updated = await api.updateTask(editingTask.id, {
        title,
        description: description || undefined,
        deadline: draft.deadline || undefined,
        estimatedHours: draft.estimatedHours || undefined
      });
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)));
      setEditingId(null);
      setDraft({ title: "", description: "", deadline: "", estimatedHours: 0 });
      toast("success", "Task atualizada!");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
      estimatedHours: task.estimatedHours
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ title: "", description: "", deadline: "", estimatedHours: 0 });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {apontamentosTask && <ApontamentosPanel task={apontamentosTask} onClose={() => setApontamentosTask(null)} onUpdate={refresh} />}

      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-1 text-sm text-slate-400">Gerenciador de Tasks com Apontamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLogout} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800" title="Sair">
              Sair
            </button>
            <span className={["inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", health?.ok ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-200" : "border-slate-800 bg-slate-900 text-slate-200"].join(" ")} title="Status do backend">
              <span className={["h-2 w-2 rounded-full", health?.ok ? "bg-emerald-400" : "bg-slate-500"].join(" ")} aria-hidden="true" />
              {health?.ok ? `Backend OK • DB ${health.db ?? "?"}` : "Backend offline"}
            </span>
            <button type="button" onClick={() => void refreshHealth()} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60" disabled={healthLoading} title="Recarregar status">
              {healthLoading ? "..." : "Status"}
            </button>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-200">{editingTask ? "Editar task" : "Nova task"}</h2>

          <form className="grid gap-3" onSubmit={editingTask ? onSaveEdit : onCreate}>
            <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-slate-600" placeholder="Título" maxLength={200} />
            <textarea value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} className="min-h-20 w-full resize-y rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-slate-600" placeholder="Descrição (opcional)" maxLength={5000} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Deadline</label>
                <DatePicker
                  selected={draft.deadline ? new Date(draft.deadline + "T00:00:00") : null}
                  onChange={(date: Date | null) => setDraft((d) => ({ ...d, deadline: date ? date.toISOString().split("T")[0] : "" }))}
                  dateFormat="dd/MM/yyyy"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
                  placeholderText="Selecione a data"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Horas Estimadas</label>
                <input
                  type="number"
                  min="0"
                  value={draft.estimatedHours}
                  onChange={(e) => setDraft((d) => ({ ...d, estimatedHours: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                {editingTask ? "Salvar" : "Adicionar"}
              </button>
              {editingTask ? <button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900">Cancelar</button> : null}
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-medium text-slate-200">Lista</h2>
            <button onClick={() => void refresh()} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900">Recarregar</button>
          </div>

          {loading ? <div className="p-4 text-sm text-slate-400">Carregando…</div> : null}
          {!loading && tasks.length === 0 ? <div className="p-4 text-sm text-slate-400">Nenhuma task ainda.</div> : null}

          <ul className="divide-y divide-slate-800">
            {tasks.map((t) => (
              <li key={t.id} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => void onToggleCompleted(t)} className={["mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border", t.completed ? "border-emerald-500 bg-emerald-500/20" : "border-slate-700 bg-slate-950/40"].join(" ")} aria-label={t.completed ? "Marcar como não concluída" : "Marcar como concluída"}>
                    {t.completed ? (
                      <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-400" aria-hidden="true" focusable="false" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.416l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className={["text-sm", t.completed ? "text-slate-400 line-through" : "text-slate-100"].join(" ")}>{t.title}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => startEdit(t)} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900">Editar</button>
                        <button onClick={() => void onDelete(t)} className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/50">Excluir</button>
                      </div>
                    </div>

                    {t.description ? <p className="mb-3 whitespace-pre-wrap text-xs text-slate-400">{t.description}</p> : null}

                    <div className="mb-3 flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
                      <div>
                        <span className="block text-xs text-slate-500">Deadline</span>
                        <span className="text-sm text-slate-300">{formatDate(t.deadline)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Estimado</span>
                        <span className="text-sm text-slate-300">{t.estimatedHours}h</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Executado</span>
                        <span className="text-sm text-slate-300">{formatHours(t.executedHours)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Apontamentos</span>
                        <span className="text-sm text-slate-300">{t.apontamentosCount ?? 0}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Estouro</span>
                        <span className="text-sm text-slate-300">{t.postponedCount}x</span>
                      </div>
                      <div className="flex-1">
                        <span className="block text-xs text-slate-500">Progresso</span>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${calculatePercent(t)}%` }} />
                          </div>
                          <span className="text-sm text-slate-300">{calculatePercent(t)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">Status:</span>
                      <select value={t.status} onChange={(e) => onChangeStatus(t, e.target.value as TaskStatus)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-slate-500">
                        {taskStatuses.map((s) => <option key={s} value={s} className="bg-slate-900">{s === "pendente" ? "Pendente" : s === "em_execução" ? "Em Execução" : s === "concluída" ? "Concluída" : "Cancelada"}</option>)}
                      </select>
                      <button onClick={() => setApontamentosTask(t)} className="rounded-lg border border-indigo-800 bg-indigo-950/30 px-3 py-1.5 text-xs text-indigo-200 hover:bg-indigo-950/50">+ Apontamentos</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}