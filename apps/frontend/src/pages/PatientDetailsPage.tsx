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
  status?: string;
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
      (Array.isArray(e) ? e : []).forEach((ex) => (map[ex.id] = ex));
      setExerciseMap(map);

      setPatient(p);
      setAssignments(Array.isArray(a) ? a : []);
      setSessions(Array.isArray(s) ? s : []);
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
    return [...sessions].slice(0, 5);
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
        {/* Header */}
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

        {/* Cards */}
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
              <span className="text-primary text-sm font-semibold">Em breve</span>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Quando o backend estabilizar métricas</p>
          </div>
        </section>

        {/* Panels */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Prescrições */}
          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Prescrições</h2>
                <p className="mt-1 text-xs text-muted-foreground">Exercícios atribuídos ao paciente.</p>
              </div>

              <Link to={`/patients/${patientId}/assignments`} className="text-xs font-medium text-primary hover:opacity-80">
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
                      a.exercise_id != null ? (exerciseMap[a.exercise_id]?.title || `Exercício #${a.exercise_id}`) : "—";
                    return (
                      <div
                        key={String(a.id)}
                        className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                      >
                        <p className="text-sm font-semibold">{exTitle}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.status ? `Status: ${a.status}` : "Status: —"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sessões */}
          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/60">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Sessões</h2>
                <p className="mt-1 text-xs text-muted-foreground">Sessões registradas do paciente.</p>
              </div>

              {/* Você ainda não tem rota de lista completa de sessões por paciente, então fica em breve */}
              <span className="text-xs text-muted-foreground">Em breve</span>
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
                      s.exercise_id != null ? (exerciseMap[s.exercise_id]?.title || `Exercício #${s.exercise_id}`) : "—";
                    return (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{exTitle}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {s.status ? `Status: ${s.status}` : "Status: —"}
                              {s.created_at ? ` • Criada: ${formatDate(s.created_at)}` : ""}
                            </p>
                          </div>

                          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                            {s.status || "—"}
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}