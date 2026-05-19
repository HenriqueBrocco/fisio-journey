import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { createAssignment, createAssignmentConfig } from "@/services/assignments";
import { ArrowLeft, RefreshCw, Search, Sparkles } from "lucide-react";

type Exercise = {
  id: number;
  title: string;
  description?: string;
  body_focus?: string;
  analysis_kind?: string;
};

type Patient = { id: string; name: string; email: string };

export default function PrescribeExercisePage() {
  const { isPro } = useAuth();
  const { id } = useParams<{ id: string }>();
  const patientId = id || "";
  const nav = useNavigate();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

  const [paramsText, setParamsText] = useState("{\n  \n}\n");
  const [schedule, setSchedule] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [active, setActive] = useState(true);

  const [patient, setPatient] = useState<Patient | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const e = await apiFetch<Exercise[]>("/v1/exercises");
      setExercises(Array.isArray(e) ? e : []);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar exercícios.");
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, e] = await Promise.all([
          apiFetch<Patient>(`/v1/patients/${patientId}`),
          apiFetch<Exercise[]>("/v1/exercises"),
        ]);

        setPatient(p);
        setExercises(Array.isArray(e) ? e : []);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar dados.");
        setPatient(null);
        setExercises([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, patientId]);

  const selectedExercise = useMemo(() => {
    if (selectedExerciseId == null) return null;
    return exercises.find((x) => x.id === selectedExerciseId) || null;
  }, [exercises, selectedExerciseId]);

  const filteredExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...exercises].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    if (!q) return base;
    return base.filter((x) => {
      return (
        (x.title || "").toLowerCase().includes(q) ||
        (x.description || "").toLowerCase().includes(q) ||
        String(x.id).includes(q)
      );
    });
  }, [exercises, query]);

  const parseParams = () => {
    try {
      const obj = JSON.parse(paramsText || "{}");
      if (obj && typeof obj === "object") return obj;
      throw new Error("Params deve ser um JSON objeto.");
    } catch (e: any) {
      throw new Error(`Params inválido: ${e?.message || "JSON inválido"}`);
    }
  };

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!patientId) {
      setError("patientId inválido.");
      return;
    }
    if (selectedExerciseId == null) {
      setError("Selecione um exercício.");
      return;
    }

    let paramsObj: Record<string, any>;
    try {
      paramsObj = parseParams();
    } catch (e: any) {
      setError(e.message);
      return;
    }

    setSaving(true);
    try {
      const cfg = await createAssignmentConfig({
        exercise_id: selectedExerciseId,
        patient_user_id: patientId,
        params: paramsObj,
      });

      const asg = await createAssignment({
        patient_user_id: patientId,
        exercise_id: selectedExerciseId,
        config_id: cfg.id,
        schedule,
        active,
      });

      setSuccess(`Prescrição criada com sucesso (assignment id=${asg.id}).`);
    } catch (err: any) {
      setError(err?.message || "Erro ao criar prescrição.");
    } finally {
      setSaving(false);
    }
  };

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

              <h1 className="mt-2 text-lg font-semibold tracking-tight">Prescrever exercício</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Paciente: {patient ? `${patient.name} • ${patient.email}` : "Carregando..."}
              </p>
            </div>

            <button
              onClick={fetchExercises}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? "Atualizando..." : "Atualizar exercícios"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600">
              <div className="font-medium">{success}</div>
              <button
                onClick={() => nav(`/patients/${patientId}`)}
                className="mt-3 inline-flex items-center justify-center rounded-xl border px-4 py-2 text-xs hover:bg-muted/50 transition"
              >
                Voltar para o paciente
              </button>
            </div>
          )}
        </section>

        {/* Content */}
        <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
          {/* Left: selecionar exercício */}
          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <h2 className="text-sm font-semibold tracking-tight">1 - Escolher exercício</h2>
              <p className="mt-1 text-xs text-muted-foreground">Selecione um exercício do catálogo.</p>
            </div>

            <div className="p-4 grid gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por título/descrição/id..."
                  className="w-full rounded-xl border border-border bg-background px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
                />
              </div>

              {loading ? (
                <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
              ) : filteredExercises.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">Nenhum exercício encontrado.</div>
              ) : (
                <div className="grid gap-3 max-h-[520px] overflow-auto pr-1">
                  {filteredExercises.map((ex) => {
                    const selected = ex.id === selectedExerciseId;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => setSelectedExerciseId(ex.id)}
                        className={
                          "w-full rounded-2xl border px-4 py-3 text-left transition " +
                          (selected
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-background/60 hover:bg-background/80")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{ex.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              id={ex.id}
                              {ex.body_focus ? ` • ${ex.body_focus}` : ""}
                              {ex.analysis_kind ? ` • ${ex.analysis_kind}` : ""}
                            </p>
                          </div>

                          <span
                            className={
                              "rounded-full px-3 py-1 text-xs font-medium " +
                              (selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")
                            }
                          >
                            {selected ? "Selecionado" : "Selecionar"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: params + schedule */}
          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <h2 className="text-sm font-semibold tracking-tight">2 - Configurar & criar</h2>
              <p className="mt-1 text-xs text-muted-foreground">Defina parâmetros e ative a prescrição.</p>
            </div>

            <div className="p-4 grid gap-4">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Exercício selecionado</p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedExercise ? `${selectedExercise.title}` : "—"}
                </p>
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Parâmetros (JSON)</label>
                <textarea
                  value={paramsText}
                  onChange={(e) => setParamsText(e.target.value)}
                  spellCheck={false}
                  className="min-h-[220px] w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
                />
                <p className="text-xs text-muted-foreground">
                  MVP: params é JSON livre. Depois a gente guia por <code>analysis_kind</code>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Frequência</label>
                  <select
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
                  >
                    <option value="DAILY">Diário</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Ativo</label>
                  <select
                    value={active ? "true" : "false"}
                    onChange={(e) => setActive(e.target.value === "true")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
                  >
                    <option value="true">Verdadeiro</option>
                    <option value="false">Falso</option>
                  </select>
                </div>
              </div>

              <button
                onClick={onSubmit}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {saving ? "Criando..." : "Criar prescrição"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}