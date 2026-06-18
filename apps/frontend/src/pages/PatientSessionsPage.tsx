import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  email: string;
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

export default function PatientSessionsPage() {
  const { isPro } = useAuth();
  const { id } = useParams<{ id: string }>();
  const patientId = id || "";

  const [patient, setPatient] = useState<Patient | null>(null);
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
      const [p, s, e] = await Promise.all([
        apiFetch<Patient>(`/v1/patients/${patientId}`),
        apiFetch<Session[]>(`/v1/patients/${patientId}/sessions`),
        apiFetch<Exercise[]>(`/v1/exercises`),
      ]);

      const map: Record<number, Exercise> = {};
      (Array.isArray(e) ? e : []).forEach((ex) => {
        map[ex.id] = ex;
      });

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

      setPatient(p);
      setSessions(sessionList);
      setExerciseMap(map);
      setSummaryMap(sMap);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar sessões do paciente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, patientId]);

  const orderedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
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
    });
  }, [sessions]);

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
                to={`/patients/${patientId}`}
                className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para detalhes do paciente
              </Link>

              <h1 className="mt-2 text-lg font-semibold tracking-tight">Sessões do paciente</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {patient ? `${patient.name} • ${patient.email}` : "Carregando..."}
              </p>
            </div>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Histórico completo</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Sessões registradas com seus respectivos resultados.
              </p>
            </div>

            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${orderedSessions.length} sessão(ões)`}
            </span>
          </div>

          <div className="p-3">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
            ) : orderedSessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma sessão registrada.</div>
            ) : (
              <div className="grid gap-3">
                {orderedSessions.map((s) => {
                  const exTitle =
                    s.exercise_id != null
                      ? exerciseMap[s.exercise_id]?.title || `Exercício #${s.exercise_id}`
                      : "—";

                  const summary = summaryMap[s.id];

                  return (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-border/60 bg-background/60 px-4 py-4"
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
        </section>
      </main>
    </div>
  );
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