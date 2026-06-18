import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  createAssignment,
  createAssignmentConfig,
  updateAssignment,
  updateAssignmentConfigParams,
} from "@/services/assignments";
import { ArrowLeft, RefreshCw, Search, Sparkles } from "lucide-react";

type Exercise = {
  id: number;
  title: string;
  description?: string;
  body_focus?: string;
  analysis_kind?: string;
};

type Assignment = {
  id: number;
  patient_user_id: string;
  exercise_id: number;
  config_id: number;
  schedule: "DAILY" | "WEEKLY" | "MONTHLY";
  active: boolean;
  created_at: string;
};

type AssignmentConfigResponse = {
  id: number;
  exercise_id: number;
  patient_user_id: string;
  params: Record<string, unknown>;
  num_series: number | null;
  num_reps: number | null;
  descanso_rep: number | null;
  descanso_serie: number | null;
  lado_ativo: string | null;
  meta_extensao: number | null;
  repouso_max: number | null;
  limite_tronco: number | null;
  tolerancia: number | null;
  created_at: string;
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

  const [schedule, setSchedule] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [active, setActive] = useState(true);

  const [patient, setPatient] = useState<Patient | null>(null);

  const [configForm, setConfigForm] = useState({
    num_series: 3,
    num_reps: 5,
    descanso_rep: 3,
    descanso_serie: 30,
    lado_ativo: "Perna direita",
    meta_extensao: 145,
    repouso_max: 110,
    limite_tronco: 15,
    tolerancia: 5,
  });

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
  }, [isPro, patientId]);

  const selectedExercise = useMemo(() => {
    if (selectedExerciseId == null) return null;
    return exercises.find((x) => x.id === selectedExerciseId) || null;
  }, [exercises, selectedExerciseId]);

  const uiLabels = getExerciseUiLabels(selectedExercise?.analysis_kind);

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

  const handleConfigChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setConfigForm((prev) => ({
      ...prev,
      [name]: name === "lado_ativo" ? value : Number(value),
    }));
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

    setSaving(true);
    try {
      if (isEditMode && editingAssignmentId && loadedConfigId) {
        await updateAssignmentConfigParams(loadedConfigId, {
          num_series: configForm.num_series,
          num_reps: configForm.num_reps,
          descanso_rep: configForm.descanso_rep,
          descanso_serie: configForm.descanso_serie,
          lado_ativo: configForm.lado_ativo,
          meta_extensao: configForm.meta_extensao,
          repouso_max: configForm.repouso_max,
          limite_tronco: configForm.limite_tronco,
          tolerancia: configForm.tolerancia,
        });

        await updateAssignment(editingAssignmentId, {
          schedule,
          active,
          config_id: loadedConfigId,
        });

        setSuccess("Prescrição atualizada com sucesso.");
      } else {
        const cfg = await createAssignmentConfig({
          exercise_id: selectedExerciseId,
          patient_user_id: patientId,
          params: {},
          ...configForm,
        });

        const asg = await createAssignment({
          patient_user_id: patientId,
          exercise_id: selectedExerciseId,
          config_id: cfg.id,
          schedule,
          active,
        });

        setSuccess(`Prescrição criada com sucesso (assignment id=${asg.id}).`);
      }
    } catch (err: any) {
      setError(err?.message || (isEditMode ? "Erro ao atualizar prescrição." : "Erro ao criar prescrição."));
    } finally {
      setSaving(false);
    }
  };

  const [searchParams] = useSearchParams();
  const assignmentIdParam = searchParams.get("assignmentId");
  const editingAssignmentId = assignmentIdParam ? Number(assignmentIdParam) : null;
  const isEditMode = Number.isFinite(editingAssignmentId);

  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [loadedConfigId, setLoadedConfigId] = useState<number | null>(null);

  useEffect(() => {
    async function loadAssignmentForEdit() {
      if (!isPro || !isEditMode || !editingAssignmentId) return;

      setLoadingAssignment(true);
      setError(null);

      try {
        const assignment = await apiFetch<Assignment>(`/v1/assignments/${editingAssignmentId}`);

        setSelectedExerciseId(assignment.exercise_id);
        setSchedule(assignment.schedule);
        setActive(assignment.active);
        setLoadedConfigId(assignment.config_id);

        const configs = await apiFetch<AssignmentConfigResponse[]>(
          `/v1/exercise-configs?patient_user_id=${assignment.patient_user_id}&exercise_id=${assignment.exercise_id}`
        );

        const cfg =
          configs.find((item) => item.id === assignment.config_id) ||
          configs[0] ||
          null;

        if (cfg) {
          setConfigForm({
            num_series: cfg.num_series ?? 3,
            num_reps: cfg.num_reps ?? 5,
            descanso_rep: cfg.descanso_rep ?? 3,
            descanso_serie: cfg.descanso_serie ?? 30,
            lado_ativo: cfg.lado_ativo ?? "Perna direita",
            meta_extensao: cfg.meta_extensao ?? 145,
            repouso_max: cfg.repouso_max ?? 110,
            limite_tronco: cfg.limite_tronco ?? 15,
            tolerancia: cfg.tolerancia ?? 5,
          });
        }
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar prescrição para edição.");
      } finally {
        setLoadingAssignment(false);
      }
    }

    loadAssignmentForEdit();
  }, [isPro, isEditMode, editingAssignmentId]);

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
                Voltar para o paciente
              </Link>

              <h1 className="mt-2 text-lg font-semibold tracking-tight">
                {isEditMode
                  ? `Editar prescrição • ${translateExerciseName(selectedExercise?.analysis_kind, selectedExercise?.title)}`
                  : uiLabels.pageTitle}
              </h1>
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

        <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
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
                        onClick={() => {
                          if (isEditMode) return;
                          setSelectedExerciseId(ex.id);
                        }}
                        className={
                          "w-full rounded-2xl border px-4 py-3 text-left transition " +
                          (selected
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-background/60 hover:bg-background/80") +
                          (isEditMode ? " cursor-default" : "")
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

          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60">
              <h2 className="text-sm font-semibold tracking-tight">
                {isEditMode ? "2 - Configurar e atualizar" : "2 - Configurar e criar"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEditMode
                  ? `Atualize os parâmetros de ${translateExerciseName(selectedExercise?.analysis_kind, selectedExercise?.title).toLowerCase()}.`
                  : `Defina os parâmetros de ${translateExerciseName(selectedExercise?.analysis_kind, selectedExercise?.title).toLowerCase()} e crie a prescrição.`}
              </p>
            </div>

            <div className="p-4 grid gap-4">
              <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                <p className="text-xs text-muted-foreground">Exercício selecionado</p>
                <p className="mt-1 text-sm font-semibold">
                  {selectedExercise
                    ? translateExerciseName(selectedExercise.analysis_kind, selectedExercise.title)
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedExercise?.description || "Selecione um exercício para configurar a prescrição."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.numSeries}</label>
                  <input
                    type="number"
                    name="num_series"
                    value={configForm.num_series}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.numReps}</label>
                  <input
                    type="number"
                    name="num_reps"
                    value={configForm.num_reps}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.descansoRep}</label>
                  <input
                    type="number"
                    name="descanso_rep"
                    value={configForm.descanso_rep}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.descansoSerie}</label>
                  <input
                    type="number"
                    name="descanso_serie"
                    value={configForm.descanso_serie}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.ladoAtivo}</label>
                  <select
                    name="lado_ativo"
                    value={configForm.lado_ativo}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  >
                    <option value="Perna direita">Lado direito</option>
                    <option value="Perna esquerda">Lado esquerdo</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.metaExtensao}</label>
                  <input
                    type="number"
                    name="meta_extensao"
                    value={configForm.meta_extensao}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.repousoMax}</label>
                  <input
                    type="number"
                    name="repouso_max"
                    value={configForm.repouso_max}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.limiteTronco}</label>
                  <input
                    type="number"
                    name="limite_tronco"
                    value={configForm.limite_tronco}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="grid gap-1.5 sm:col-span-2">
                  <label className="text-sm font-medium">{uiLabels.tolerancia}</label>
                  <input
                    type="number"
                    name="tolerancia"
                    value={configForm.tolerancia}
                    onChange={handleConfigChange}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.schedule}</label>
                  <select
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  >
                    <option value="DAILY">Diário</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">{uiLabels.active}</label>
                  <select
                    value={active ? "true" : "false"}
                    onChange={(e) => setActive(e.target.value === "true")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  >
                    <option value="true">{uiLabels.activeTrue}</option>
                    <option value="false">{uiLabels.activeFalse}</option>
                  </select>
                </div>
              </div>

              <button
                onClick={onSubmit}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" />
                {saving ? (isEditMode ? "Salvando..." : "Criando...") : (isEditMode ? "Salvar alterações" : "Criar prescrição")}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function getExerciseUiLabels(analysisKind?: string) {
  if (analysisKind === "LATERAL_LUNGE_V1") {
    return {
      pageTitle: "Prescrever passada lateral",
      configTitle: "Parâmetros da passada lateral",
      numSeries: "Séries",
      numReps: "Repetições por lado",
      descansoRep: "Descanso entre repetições (s)",
      descansoSerie: "Descanso entre séries (s)",
      ladoAtivo: "Lado de referência",
      metaExtensao: "Meta de abertura (cm)",
      repousoMax: "Limite máximo de abertura (cm)",
      limiteTronco: "Limite de compensação do tronco",
      tolerancia: "Tolerância",
      schedule: "Frequência",
      active: "Status da prescrição",
      activeTrue: "Ativa",
      activeFalse: "Inativa",
    };
  }

  return {
    pageTitle: "Prescrever exercício",
    configTitle: "Parâmetros clínicos",
    numSeries: "Séries",
    numReps: "Repetições por série",
    descansoRep: "Descanso repetição (s)",
    descansoSerie: "Descanso série (s)",
    ladoAtivo: "Lado ativo",
    metaExtensao: "Meta de extensão (°)",
    repousoMax: "Repouso máximo (°)",
    limiteTronco: "Limite de tronco (°)",
    tolerancia: "Tolerância (%)",
    schedule: "Frequência",
    active: "Status da prescrição",
    activeTrue: "Ativa",
    activeFalse: "Inativa",
  };
}

function translateExerciseName(analysisKind?: string, fallback?: string) {
  if (analysisKind === "KNEE_EXTENSION_V1") return "Extensão de joelho";
  if (analysisKind === "LATERAL_LUNGE_V1") return "Passada lateral";
  return fallback || "Exercício";
}