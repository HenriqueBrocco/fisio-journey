import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Calendar, RefreshCw } from "lucide-react";

type PatientSession = {
    id: string;
    status: "CREATED" | "RUNNING" | "FINISHED" | string;
    exercise_id: number;
    assignment_id: number;
    started_at: string | null;
    finished_at: string | null;
};

type Exercise = {
    id: number;
    title: string;
    body_focus?: string;
    analysis_kind?: string;
};

export default function MySessionsPage() {
    const nav = useNavigate();
    const { me } = useAuth();
    const patientId = me?.id;

    const [sessions, setSessions] = useState<PatientSession[]>([]);
    const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = async () => {
        if (!patientId) return;
        setLoading(true);
        setError(null);
        try {
            const [s, e] = await Promise.all([
                apiFetch<PatientSession[]>(`/v1/patients/${patientId}/sessions`),
                apiFetch<Exercise[]>(`/v1/exercises`),
            ]);

            setSessions(Array.isArray(s) ? s : []);
            const map: Record<number, Exercise> = {};
            (Array.isArray(e) ? e : []).forEach((ex) => (map[ex.id] = ex));
            setExerciseMap(map);
        } catch (err: any) {
            setError(err?.message || "Erro ao carregar sessões.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    const sorted = useMemo(() => {
        const list = [...sessions];
        const rank = (st: string) => (st === "CREATED" ? 0 : st === "RUNNING" ? 1 : st === "FINISHED" ? 2 : 3);

        list.sort((a, b) => {
            const ra = rank(a.status);
            const rb = rank(b.status);
            if (ra !== rb) return ra - rb;

            const ta = a.started_at ? new Date(a.started_at).getTime() : 0;
            const tb = b.started_at ? new Date(b.started_at).getTime() : 0;
            return tb - ta;
        });

        return list;
    }, [sessions]);

    return (
        <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                {/* Header */}
                <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para tela principal
                            </Link>
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">Minhas sessões</h1>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Selecione uma sessão para iniciar/ver resumo.
                            </p>
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

                {/* List */}
                <section className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <h2 className="text-sm font-semibold tracking-tight">Sessões</h2>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {loading ? "…" : `${sorted.length} item(s)`}
                        </span>
                    </div>

                    <div className="p-3">
                        {loading ? (
                            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
                        ) : sorted.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground">Nenhuma sessão disponível.</div>
                        ) : (
                            <div className="grid gap-3">
                                {sorted.map((s) => {
                                    const ex = exerciseMap[s.exercise_id];
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => nav(`/sessions/${s.id}`)}
                                            className="w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-left hover:bg-background/80 transition"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {ex?.title || `Exercício #${s.exercise_id}`}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {ex?.analysis_kind ? `${ex.analysis_kind} • ` : ""}
                                                        {ex?.body_focus ? `${ex.body_focus} • ` : ""}
                                                        assignment #{s.assignment_id}
                                                    </p>
                                                </div>

                                                <StatusBadge status={s.status} />
                                            </div>
                                        </button>
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

function StatusBadge({ status }: { status: string }) {
    const base = "rounded-full px-3 py-1 text-xs font-medium";
    if (status === "CREATED") return <span className={`${base} bg-amber-500/10 text-amber-500`}>Pendente</span>;
    if (status === "RUNNING") return <span className={`${base} bg-sky-500/10 text-sky-500`}>Em andamento</span>;
    if (status === "FINISHED") return <span className={`${base} bg-emerald-500/10 text-emerald-500`}>Concluída</span>;
    return <span className={`${base} bg-muted text-muted-foreground`}>{status}</span>;
}