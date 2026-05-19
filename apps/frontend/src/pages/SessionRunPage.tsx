import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import CameraStream from "@/components/CameraStream";
import { ArrowLeft, RefreshCw } from "lucide-react";

type Session = {
  id: string;
  patient_user_id: string;
  exercise_id: number;
  assignment_id: number;
  status: "CREATED" | "RUNNING" | "FINISHED" | string;
  config_snapshot: Record<string, any>;
  started_at: string | null;
  finished_at: string | null;
};

type Summary = {
  session_id: string;
  reps: number;
  rom: number;
  cadence: number;
  alerts: string[];
  created_at: string;
};

type Exercise = {
  id: number;
  title: string;
  body_focus?: string;
  analysis_kind?: string;
};

export default function SessionRunPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id || "";

  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        apiFetch<Session>(`/v1/sessions/${sessionId}`),
        apiFetch<Exercise[]>(`/v1/exercises`),
      ]);

      setSession(s);

      const map: Record<number, Exercise> = {};
      (Array.isArray(e) ? e : []).forEach((ex) => (map[ex.id] = ex));
      setExerciseMap(map);

      // tenta summary (pode não existir ainda)
      try {
        const sum = await apiFetch<Summary>(`/v1/sessions/${sessionId}/summary`);
        setSummary(sum);
      } catch {
        setSummary(null);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar sessão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const exerciseTitle = useMemo(() => {
    if (!session) return "";
    return exerciseMap[session.exercise_id]?.title || `Exercício #${session.exercise_id}`;
  }, [session, exerciseMap]);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/sessions" className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80">
                <ArrowLeft className="h-4 w-4" />
                Voltar para sessões
              </Link>
              <h1 className="mt-2 text-lg font-semibold tracking-tight">Sessão</h1>
              <p className="mt-1 text-xs text-muted-foreground break-all">id: {sessionId}</p>
            </div>

            <button
              onClick={fetchAll}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
              disabled={loading}
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

        {/* Top panels */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Status</h2>

            {loading ? (
              <p className="mt-3 text-sm text-muted-foreground">Carregando...</p>
            ) : !session ? (
              <p className="mt-3 text-sm text-muted-foreground">Sessão não encontrada.</p>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <b>{session.status}</b></div>
                <div><span className="text-muted-foreground">Exercício:</span> <b>{exerciseTitle}</b></div>
                <div><span className="text-muted-foreground">Atribuição:</span> <b>{session.assignment_id}</b></div>
                <div><span className="text-muted-foreground">Iniciada em:</span> <b>{session.started_at || "—"}</b></div>
                <div><span className="text-muted-foreground">Finalizada em:</span> <b>{session.finished_at || "—"}</b></div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Resumo</h2>

            {!summary ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum resumo disponível ainda.</p>
            ) : (
              <div className="mt-4 grid gap-2 text-sm">
                <div><span className="text-muted-foreground">Reps:</span> <b>{summary.reps}</b></div>
                <div><span className="text-muted-foreground">ROM:</span> <b>{summary.rom}</b></div>
                <div><span className="text-muted-foreground">Cadência:</span> <b>{summary.cadence}</b></div>
                <div className="text-muted-foreground text-xs">
                  Alerts: {summary.alerts?.length ? summary.alerts.join(", ") : "—"}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Camera / WS */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold tracking-tight">Câmera</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Inicie a câmera e envie frames para a análise em tempo real.
          </p>

          <div className="mt-5">
            <CameraStream sessionId={sessionId} fps={4} />
          </div>
        </section>
      </main>
    </div>
  );
}