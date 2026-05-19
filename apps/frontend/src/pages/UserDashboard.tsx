import { useEffect, useMemo, useState } from "react";
import FisioJourneyLogo from "@/components/FisioJourneyLogo";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { Calendar, LogOut, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";

type PatientSession = {
  id: string;
  status: "CREATED" | "RUNNING" | "FINISHED" | string;
  started_at?: string | null;
  finished_at?: string | null;
  exercise_id?: number;
  assignment_id?: number;
};

export default function UserDashboard() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!me?.id) return;
      setLoading(true);
      try {
        const data = await apiFetch<PatientSession[]>(`/v1/patients/${me.id}/sessions`);
        setSessions(Array.isArray(data) ? data : []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [me?.id]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const pending = sessions.filter((s) => s.status === "CREATED" || s.status === "RUNNING").length;
    const finished = sessions.filter((s) => s.status === "FINISHED").length;
    return { total, pending, finished };
  }, [sessions]);

  const pendingSessions = useMemo(() => {
    const pend = sessions.filter((s) => s.status === "CREATED" || s.status === "RUNNING");
    // opcional: ordenar por started_at desc
    pend.sort((a, b) => {
      const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
      const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
      return tb - ta;
    });
    return pend.slice(0, 3);
  }, [sessions]);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-2xl bg-card/80 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <FisioJourneyLogo className="w-10 sm:w-12 h-auto" />
          <div>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">Fisio Journey</h1>
            <p className="text-xs text-muted-foreground">
              Bem-vindo(a), {me?.name || me?.email} 👋
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle tema */}
          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium hover:bg-muted/50 transition"
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>

          {/* Sair */}
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto mt-6 flex max-w-6xl flex-col gap-6">
        {/* Resumo real: Sessões */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sessões</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : stats.total}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "Carregando…" : `${stats.pending} pendentes • ${stats.finished} concluídas`}
            </p>
          </div>

          {/* Espaços reservados (com previsão real) */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Exercícios</span>
              <span className="text-primary text-sm font-semibold">Em breve</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Vamos integrar com prescrições/assignments.</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Evolução</span>
              <span className="text-primary text-sm font-semibold">Em breve</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Quando o backend estabilizar métricas.</p>
          </div>
        </section>

        {/* Ação principal */}

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Sessões pendentes</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Inicie uma sessão para começar o exercício com a câmera.
              </p>
            </div>

            <button
              onClick={() => navigate("/sessions")}
              className="text-xs font-medium text-primary hover:opacity-80 transition"
            >
              Ver histórico
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando…</div>
            ) : pendingSessions.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                Nenhuma sessão pendente no momento.
              </div>
            ) : (
              pendingSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      Sessão {s.id.slice(0, 8)}…
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status: {s.status}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/sessions/${s.id}`)}
                    className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
                  >
                    Iniciar
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Sessões</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Veja suas sessões e inicie o exercício com a câmera.
            </p>
          </div>

          <button
            onClick={() => navigate("/sessions")}
            className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
          >
            Minhas sessões
          </button>
        </section>

        {/* Próximos passos (sem mock de dados) */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold tracking-tight">Próximos passos</h2>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Integrar prescrições (assignments) do paciente.</li>
            <li>Melhorar UX da sessão (instruções, estados e resumo).</li>
            <li>Aplicar design tokens e padronizar telas.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}