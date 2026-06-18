import { useEffect, useMemo, useState } from "react";
import FisioJourneyLogo from "@/components/FisioJourneyLogo";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useTheme } from "@/hooks/useTheme";
import { Calendar, ClipboardList, LogOut, Moon, Sparkles, Sun } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

type Assignment = {
  id: number;
  patient_user_id: string;
  exercise_id: number;
  config_id: number;
  schedule: string;
  active: boolean;
  created_at: string;
};

type PatientSession = {
  id: string;
  status: "CREATED" | "RUNNING" | "FINISHED" | string;
  started_at?: string | null;
  finished_at?: string | null;
  exercise_id?: number;
  assignment_id?: number;
};

type Exercise = {
  id: number;
  title: string;
  analysis_kind?: string;
  body_focus?: string;
};

type CreateSessionResponse = {
  id: string;
  exercise_id?: number;
  assignment_id?: number;
  status?: string;
};

export default function UserDashboard() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});
  const [loading, setLoading] = useState(true);
  const [startingAssignmentId, setStartingAssignmentId] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!me?.id) return;
      setLoading(true);
      try {
        const [assignmentData, sessionData, exerciseData] = await Promise.all([
          apiFetch<Assignment[]>("/v1/assignments"),
          apiFetch<PatientSession[]>(`/v1/patients/${me.id}/sessions`),
          apiFetch<Exercise[]>("/v1/exercises"),
        ]);

        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        setSessions(Array.isArray(sessionData) ? sessionData : []);

        const map: Record<number, Exercise> = {};
        (Array.isArray(exerciseData) ? exerciseData : []).forEach((ex) => {
          map[ex.id] = ex;
        });
        setExerciseMap(map);
      } catch {
        setAssignments([]);
        setSessions([]);
        setExerciseMap({});
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [me?.id]);

  const availableAssignments = useMemo(() => {
    return assignments.filter((assignment) => canStartAssignment(assignment, sessions));
  }, [assignments, sessions]);

  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const pendingSessions = sessions.filter(
      (s) => s.status === "CREATED" || s.status === "RUNNING"
    ).length;
    const finishedSessions = sessions.filter((s) => s.status === "FINISHED").length;

    return {
      totalSessions,
      pendingSessions,
      finishedSessions,
      availableAssignments: availableAssignments.length,
    };
  }, [sessions, availableAssignments]);

  const exerciseStats = useMemo(() => {
    const ids = new Set(
      availableAssignments
        .map((a) => a.exercise_id)
        .filter((id): id is number => typeof id === "number")
    );

    return {
      distinctExercises: ids.size,
      nextExerciseTitle:
        availableAssignments.length > 0
          ? exerciseMap[availableAssignments[0].exercise_id]?.title || "Exercício disponível"
          : "Nenhum exercício disponível",
    };
  }, [availableAssignments, exerciseMap]);

  async function handleStartAssignment(assignmentId: number) {
    try {
      setStartingAssignmentId(assignmentId);

      const session = await apiFetch<CreateSessionResponse>(
        `/v1/assignments/${assignmentId}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      navigate(`/sessions/${session.id}`);
    } catch (err) {
      console.error("Erro ao iniciar sessão:", err);
      alert("Não foi possível iniciar o exercício.");
    } finally {
      setStartingAssignmentId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
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
          <Link
            to="/about"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium hover:bg-muted/50 transition"
          >
            Sobre
          </Link>
          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium hover:bg-muted/50 transition"
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 flex max-w-6xl flex-col gap-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sessões</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : stats.totalSessions}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Carregando…"
                : `${stats.pendingSessions} pendentes • ${stats.finishedSessions} concluídas`}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Exercícios</span>
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : exerciseStats.distinctExercises}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {loading
                ? "Carregando…"
                : exerciseStats.distinctExercises > 0
                  ? exerciseStats.nextExerciseTitle
                  : "Nenhum exercício disponível"}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Evolução</span>
              <span className="text-primary text-sm font-semibold">Em breve</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">—</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Quando o backend estabilizar métricas.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Exercícios disponíveis</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Escolha um exercício prescrito para iniciar sua sessão.
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
            ) : availableAssignments.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                Nenhum exercício disponível no momento.
              </div>
            ) : (
              availableAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {exerciseMap[assignment.exercise_id]?.title ||
                        `Exercício #${assignment.exercise_id}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getAssignmentAvailabilityLabel(assignment, sessions)}
                      {assignment.schedule ? ` • Frequência: ${translateSchedule(assignment.schedule)}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartAssignment(assignment.id)}
                    disabled={startingAssignmentId === assignment.id}
                    className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition disabled:opacity-60"
                  >
                    {startingAssignmentId === assignment.id ? "Iniciando..." : "Iniciar"}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Conquistas</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Veja suas conquistas desbloqueadas e acompanhe sua evolução.
            </p>
          </div>

          <button
            onClick={() => navigate("/achievements")}
            className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
          >
            Minhas conquistas
          </button>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Sessões</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Veja seu histórico de sessões e acompanhe seus exercícios.
            </p>
          </div>

          <button
            onClick={() => navigate("/sessions")}
            className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
          >
            Minhas sessões
          </button>
        </section>
      </main>
    </div>
  );
}

function translateSchedule(schedule: string) {
  if (schedule === "DAILY") return "Diária";
  if (schedule === "WEEKLY") return "Semanal";
  if (schedule === "MONTHLY") return "Mensal";
  return schedule;
}

function toValidDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(value?: string | null, now = new Date()) {
  const d = toValidDate(value);
  if (!d) return false;

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo, 1=segunda...
  const diff = day === 0 ? -6 : 1 - day; // semana começando na segunda
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function getEndOfWeek(date: Date) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function isSameWeek(value?: string | null, now = new Date()) {
  const d = toValidDate(value);
  if (!d) return false;

  const start = getStartOfWeek(now);
  const end = getEndOfWeek(now);

  return d >= start && d <= end;
}

function isSameMonth(value?: string | null, now = new Date()) {
  const d = toValidDate(value);
  if (!d) return false;

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

function getAssignmentAvailabilityLabel(
  assignment: { id: number; active: boolean; schedule: string },
  sessions: Array<{
    assignment_id?: number;
    status?: string;
    finished_at?: string | null;
  }>
) {
  if (!assignment.active) {
    return "Prescrição inativa";
  }

  const finishedSessions = sessions.filter(
    (s) => s.assignment_id === assignment.id && s.status === "FINISHED"
  );

  const doneToday = finishedSessions.some((s) => isSameDay(s.finished_at));
  const doneThisWeek = finishedSessions.some((s) => isSameWeek(s.finished_at));
  const doneThisMonth = finishedSessions.some((s) => isSameMonth(s.finished_at));

  if (assignment.schedule === "DAILY") {
    return doneToday ? "Já realizado hoje" : "Disponível hoje";
  }

  if (assignment.schedule === "WEEKLY") {
    return doneThisWeek ? "Já realizado esta semana" : "Disponível esta semana";
  }

  if (assignment.schedule === "MONTHLY") {
    return doneThisMonth ? "Já realizado este mês" : "Disponível este mês";
  }

  return doneToday ? "Indisponível no momento" : "Disponível";
}

function canStartAssignment(
  assignment: { id: number; active: boolean; schedule: string },
  sessions: Array<{
    assignment_id?: number;
    status?: string;
    finished_at?: string | null;
  }>
) {
  if (!assignment.active) return false;

  const finishedSessions = sessions.filter(
    (s) => s.assignment_id === assignment.id && s.status === "FINISHED"
  );

  if (assignment.schedule === "DAILY") {
    return !finishedSessions.some((s) => isSameDay(s.finished_at));
  }

  if (assignment.schedule === "WEEKLY") {
    return !finishedSessions.some((s) => isSameWeek(s.finished_at));
  }

  if (assignment.schedule === "MONTHLY") {
    return !finishedSessions.some((s) => isSameMonth(s.finished_at));
  }

  return !finishedSessions.some((s) => isSameDay(s.finished_at));
}