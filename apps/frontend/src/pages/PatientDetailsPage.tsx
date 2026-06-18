import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Calendar, ClipboardList, RefreshCw, Sparkles } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  email: string;
};

type Assignment = {
  id: number | string;
  exercise_id?: number;
  active?: boolean;
  schedule?: string;
  created_at?: string;
};

type Session = {
  id: string;
  exercise_id?: number;
  assignment_id?: number;
  status?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string;
};

type SessionSummary = {
  session_id: string;
  reps: number;
  rom: number;
  cadence: number | null;
  alerts: string[];
  accuracy?: number | null;
};

type Exercise = {
  id: number;
  title: string;
  analysis_kind?: string;
  body_focus?: string;
};

export default function PatientDetailsPage() {
  const { isPro } = useAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const patientId = id || "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summaryMap, setSummaryMap] = useState<Record<string, SessionSummary>>({});
  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    try {
      const [p, a, s, e] = await Promise.all([
        apiFetch<Patient>(`/v1/patients/${patientId}`),
        apiFetch<Assignment[]>(`/v1/assignments?patient_user_id=${encodeURIComponent(patientId)}`),
        apiFetch<Session[]>(`/v1/patients/${patientId}/sessions`),
        apiFetch<Exercise[]>(`/v1/exercises`),
      ]);

      const map: Record<number, Exercise> = {};
      (Array.isArray(e) ? e : []).forEach((ex) => {
        map[ex.id] = ex;
      });
      setExerciseMap(map);

      const sessionList = Array.isArray(s) ? s : [];

      const summaryEntries = await Promise.all(
        sessionList.map(async (sess) => {
          try {
            const summary = await apiFetch<SessionSummary>(`/v1/sessions/${sess.id}/summary`);
            return [sess.id, summary] as const;
          } catch {
            return [sess.id, null] as const;
          }
        })
      );

      const sMap: Record<string, SessionSummary> = {};
      summaryEntries.forEach(([sessionId, summary]) => {
        if (summary) sMap[sessionId] = summary;
      });

      setSummaryMap(sMap);
      setPatient(p);
      setAssignments(Array.isArray(a) ? a : []);
      setSessions(sessionList);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar dados do paciente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, patientId]);

  const recentAssignments = useMemo(() => {
    return [...assignments].slice(0, 5);
  }, [assignments]);

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => {
        const ta = a.finished_at
          ? new Date(a.finished_at).getTime()
          : a.created_at
            ? new Date(a.created_at).getTime()
            : 0;
        const tb = b.finished_at
          ? new Date(b.finished_at).getTime()
          : b.created_at
            ? new Date(b.created_at).getTime()
            : 0;
        return tb - ta;
      })
      .slice(0, 5);
  }, [sessions]);

  const resultsStats = useMemo(() => {
    const summaries = Object.values(summaryMap);

    const finishedSessions = sessions.filter((s) => s.status === "FINISHED").length;

    if (summaries.length === 0) {
      return {
        finishedSessions,
        averageAccuracy: null as number | null,
        averageRom: null as number | null,
        totalAlerts: 0,
      };
    }

    const summariesWithAccuracy = summaries.filter(
      (s) => typeof s.accuracy === "number"
    );

    const averageAccuracy =
      summariesWithAccuracy.length > 0
        ? Math.round(
          summariesWithAccuracy.reduce((acc, s) => acc + (s.accuracy ?? 0), 0) /
          summariesWithAccuracy.length
        )
        : null;

    const averageRom = Math.round(
      summaries.reduce((acc, s) => acc + (s.rom ?? 0), 0) / summaries.length
    );

    const totalAlerts = summaries.reduce(
      (acc, s) => acc + (Array.isArray(s.alerts) ? s.alerts.length : 0),
      0
    );

    return {
      finishedSessions,
      averageAccuracy,
      averageRom,
      totalAlerts,
    };
  }, [sessions, summaryMap]);

  if (!isPro) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente usuários com role PRO podem acessar esta tela.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/patients"
                className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para pacientes
              </Link>

              <h1 className="mt-2 text-lg font-semibold tracking-tight">Paciente</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {patient ? `${patient.name} • ${patient.email}` : "Carregando..."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchAll}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
              >
                <RefreshCw className="h-4 w-4" />
                {loading ? "Atualizando..." : "Atualizar"}
              </button>

              <button
                onClick={() => nav(`/patients/${patientId}/prescribe`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
              >
                <Sparkles className="h-4 w-4" />
                Prescrever exercício
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Prescrições</span>
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? "…" : assignments.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total atribuídas</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sessões</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? "…" : sessions.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total registradas</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Resultados</span>
              <span className="text-primary text-sm font-semibold">
                {loading ? "…" : `${resultsStats.finishedSessions} sessão(ões)`}
              </span>
            </div>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : resultsStats.averageAccuracy != null ? `${resultsStats.averageAccuracy}%` : "—"}
            </p>

            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <p>
                <strong>Acurácia média:</strong>{" "}
                {resultsStats.averageAccuracy != null ? `${resultsStats.averageAccuracy}%` : "—"}
              </p>
              <p>
                <strong>Amplitude média:</strong>{" "}
                {resultsStats.averageRom != null ? `${resultsStats.averageRom}°` : "—"}
              </p>
              <p>
                <strong>Total de alertas:</strong> {resultsStats.totalAlerts}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Prescrições</h2>
                <p className="mt-1 text-xs text-muted-foreground">Exercícios atribuídos ao paciente.</p>
              </div>

              <Link
                to={`/patients/${patientId}/assignments`}
                className="text-xs font-medium text-primary hover:opacity-80"
              >
                Ver todas
              </Link>
            </div>

            <div className="p-3">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
              ) : recentAssignments.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Nenhuma prescrição ainda.</div>
              ) : (
                <div className="grid gap-3">
                  {recentAssignments.map((a) => {
                    const exTitle =
                      a.exercise_id != null
                        ? exerciseMap[a.exercise_id]?.title || `Exercício #${a.exercise_id}`
                        : "—";

                    return (
                      <div
                        key={String(a.id)}
                        className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                      >
                        <p className="text-sm font-semibold">{exTitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Status: {a.active === true ? "Ativa" : a.active === false ? "Inativa" : "—"}
                          {a.schedule ? ` • Frequência: ${translateSchedule(a.schedule)}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Sessões</h2>
                <p className="mt-1 text-xs text-muted-foreground">Sessões registradas do paciente.</p>
              </div>

              <Link
                to={`/patients/${patientId}/sessions`}
                className="text-xs font-medium text-primary hover:opacity-80"
              >
                Ver todas
              </Link>
            </div>

            <div className="p-3">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
              ) : recentSessions.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Nenhuma sessão ainda.</div>
              ) : (
                <div className="grid gap-3">
                  {recentSessions.map((s) => {
                    const exTitle =
                      s.exercise_id != null
                        ? exerciseMap[s.exercise_id]?.title || `Exercício #${s.exercise_id}`
                        : "—";

                    const summary = summaryMap[s.id];

                    return (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{exTitle}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Status: {translateSessionStatus(s.status)}
                              {s.finished_at
                                ? ` • Finalizada: ${formatDate(s.finished_at)}`
                                : s.created_at
                                  ? ` • Criada: ${formatDate(s.created_at)}`
                                  : ""}
                            </p>

                            {summary ? (
                              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                                <p><strong>Repetições:</strong> {summary.reps}</p>
                                <p><strong>Amplitude:</strong> {summary.rom}°</p>
                                <p><strong>Cadência:</strong> {summary.cadence ?? "—"}</p>
                                <p><strong>Acurácia:</strong> {summary.accuracy ?? "—"}%</p>
                                <p>
                                  <strong>Alertas:</strong>{" "}
                                  {summary.alerts?.length ? summary.alerts.join(", ") : "Nenhum"}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-muted-foreground">Resumo indisponível.</p>
                            )}
                          </div>

                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                            {translateSessionStatus(s.status)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function translateSchedule(schedule: string) {
  if (schedule === "DAILY") return "Diário";
  if (schedule === "WEEKLY") return "Semanal";
  if (schedule === "MONTHLY") return "Mensal";
  return schedule;
}

function translateSessionStatus(status?: string) {
  if (status === "CREATED") return "Pendente";
  if (status === "RUNNING") return "Em andamento";
  if (status === "FINISHED") return "Concluída";
  return status || "—";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}