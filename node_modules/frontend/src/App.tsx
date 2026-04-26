import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { api, type Apontamento, type Health, type Task, type TaskStatus } from "./lib/api";

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

function ApontamentosPanel({ task, onClose, onUpdate }: { task: Task; onClose: () => void; onUpdate: () => void }) {
  const [apontamentos, setApontamentos] = useState<Apontamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ content: "", hoursSpent: 1, workDate: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.listApontamentos(task.id);
        setApontamentos(data);
      } catch {
        alert("Erro ao carregar apontamentos");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [task.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (draft.hoursSpent <= 0) return;
    setSaving(true);
    try {
      const created = await api.createApontamento({
        taskId: task.id,
        content: draft.content || null,
        hoursSpent: draft.hoursSpent,
        workDate: draft.workDate
      });
      setApontamentos((prev) => [created, ...prev]);
      setDraft({ content: "", hoursSpent: 1, workDate: new Date().toISOString().split("T")[0] });
      onUpdate();
      alert("Apontamento adicionado!");
    } catch {
      alert("Erro ao criar apontamento");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(a: Apontamento) {
    if (!confirm("Remover este apontamento?")) return;
    try {
      await api.deleteApontamento(a.id);
      setApontamentos((prev) => prev.filter((x) => x.id !== a.id));
      onUpdate();
      alert("Apontamento removido!");
    } catch {
      alert("Erro ao remover");
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
              <label className="mb-1 block text-xs text-slate-400">Data do trabalho</label>
              <input
                type="date"
                value={draft.workDate}
                onChange={(e) => setDraft((d) => ({ ...d, workDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Horas dedicadas</label>
              <input
                type="number"
                min="1"
                value={draft.hoursSpent}
                onChange={(e) => setDraft((d) => ({ ...d, hoursSpent: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100"
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
                    <span className="rounded bg-indigo-900/40 px-2 py-0.5 text-xs text-indigo-200">{a.hoursSpent}h</span>
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
  const editingTask = tasks.find((t) => t.id === editingId) ?? null;

  const taskStatuses: TaskStatus[] = ["pendente", "em_execução", "concluída", "cancelada"];

  async function refresh() {
    setLoading(true);
    try {
      setTasks(await api.listTasks());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

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
    void refreshHealth();
    const id = window.setInterval(() => void refreshHealth(), 10_000);
    return () => window.clearInterval(id);
  }, []);

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
      alert("Task criada!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  async function onToggleCompleted(task: Task) {
    try {
      const updated = await api.updateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function onChangeStatus(task: Task, status: TaskStatus) {
    try {
      const updated = await api.updateTask(task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function onDelete(task: Task) {
    try {
      await api.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (editingId === task.id) setEditingId(null);
      alert("Task removida!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao remover");
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
      alert("Task atualizada!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao salvar");
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
                <input type="date" value={draft.deadline} onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))} className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-slate-600" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Horas Estimadas</label>
                <input type="number" min="0" value={draft.estimatedHours} onChange={(e) => setDraft((d) => ({ ...d, estimatedHours: parseInt(e.target.value) || 0 }))} className="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:border-slate-600" />
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
                        <span className="text-sm text-slate-300">{t.executedHours}h</span>
                      </div>
                      <div>
                        <span className="block text-xs text-slate-500">Estouro</span>
                        <span className="text-sm text-slate-300">{t.postponedCount}x</span>
                      </div>
                      <div className="flex-1">
                        <span className="block text-xs text-slate-500">Progresso</span>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${calculatePercent(t)}%` }} />
                          </div>
                          <span className="text-sm text-slate-300">{calculatePercent(t)}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">Status:</span>
                      <select value={t.status} onChange={(e) => onChangeStatus(t, e.target.value as TaskStatus)} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                        {taskStatuses.map((s) => <option key={s} value={s}>{s === "pendente" ? "Pendente" : s === "em_execução" ? "Em Execução" : s === "concluída" ? "Concluída" : "Cancelada"}</option>)}
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