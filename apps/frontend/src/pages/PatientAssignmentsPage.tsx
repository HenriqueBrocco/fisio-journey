import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, ClipboardList, RefreshCw } from "lucide-react";

type Exercise = {
  id: number;
  title: string;
  analysis_kind?: string;
  body_focus?: string;
};

type Assignment = {
  id: number;
  patient_user_id: string;
  exercise_id: number;
  config_id: number;
  schedule: string;
  active: boolean;
  created_at?: string;
};

export default function PatientAssignmentsPage() {
  const { isPro } = useAuth();
  const { id } = useParams<{ id: string }>();
  const patientId = id || "";

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);

    try {
      const [a, e] = await Promise.all([
        apiFetch<Assignment[]>(`/v1/assignments?patient_user_id=${encodeURIComponent(patientId)}`),
        apiFetch<Exercise[]>(`/v1/exercises`),
      ]);

      setAssignments(Array.isArray(a) ? a : []);

      const map: Record<number, Exercise> = {};
      (Array.isArray(e) ? e : []).forEach((ex) => (map[ex.id] = ex));
      setExerciseMap(map);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar prescrições.");
      setAssignments([]);
      setExerciseMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, patientId]);

  const sorted = useMemo(() => {
    const list = [...assignments];
    list.sort((x, y) => {
      const tx = exerciseMap[x.exercise_id]?.title || `#${x.exercise_id}`;
      const ty = exerciseMap[y.exercise_id]?.title || `#${y.exercise_id}`;
      return tx.localeCompare(ty);
    });
    return list;
  }, [assignments, exerciseMap]);

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
                to={`/patients/${patientId}`}
                className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o paciente
              </Link>
              <h1 className="mt-2 text-lg font-semibold tracking-tight">Prescrições</h1>
              <p className="mt-1 text-xs text-muted-foreground break-all">Paciente: {patientId}</p>
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

        {/* List */}
        <section className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Assignments</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${sorted.length} item(s)`}
            </span>
          </div>

          <div className="p-3">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            ) : sorted.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma prescrição encontrada.</div>
            ) : (
              <div className="grid gap-3">
                {sorted.map((a) => {
                  const ex = exerciseMap[a.exercise_id];
                  const title = ex?.title || `Exercício #${a.exercise_id}`;
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            freq: {a.schedule} • config #{a.config_id}
                            {ex?.analysis_kind ? ` • ${ex.analysis_kind}` : ""}
                            {ex?.body_focus ? ` • ${ex.body_focus}` : ""}
                          </p>
                        </div>

                        <span
                          className={
                            "shrink-0 rounded-full px-3 py-1 text-xs font-medium " +
                            (a.active
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-rose-500/10 text-rose-500")
                          }
                        >
                          {a.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border/60 text-xs text-muted-foreground">
            Próximo upgrade: botões “Ativar/Desativar” e “Editar frequência”, se você tiver endpoints de update.
          </div>
        </section>
      </main>
    </div>
  );
}