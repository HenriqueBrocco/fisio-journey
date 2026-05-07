import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import { createAssignment, createAssignmentConfig } from "../services/assignments";

type Exercise = {
  id: number;
  title: string;
  description?: string;
  body_focus?: string;
  analysis_kind?: string;
  created_at?: string;
};

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

  // Params como JSON texto (MVP)
  const [paramsText, setParamsText] = useState("{\n  \n}\n");

  const [schedule, setSchedule] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("DAILY");
  const [active, setActive] = useState(true);

  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const e = await apiFetch<Exercise[]>("/v1/exercises");
      setExercises(Array.isArray(e) ? e : []);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar exercícios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;
    fetchExercises();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

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

  if (!isPro) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Acesso negado</h2>
        <p>Somente usuários com role PRO podem acessar esta tela.</p>
      </div>
    );
  }

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
      // 1) cria config
      const cfg = await createAssignmentConfig({
        exercise_id: selectedExerciseId,
        patient_user_id: patientId,
        params: paramsObj,
      });

      // 2) cria assignment
      const asg = await createAssignment({
        patient_user_id: patientId,
        exercise_id: selectedExerciseId,
        config_id: cfg.id,
        schedule,
        active,
      });

      setSuccess(`Prescrição criada com sucesso (assignment id=${asg.id}).`);
      // volta pro detalhe após um pequeno passo do usuário (ou automático)
      // aqui vou só manter um botão "Voltar"
    } catch (err: any) {
      setError(err?.message || "Erro ao criar prescrição.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <Link to={`/patients/${patientId}`} style={styles.backLink}>
            ← Voltar
          </Link>
          <div style={styles.title}>Prescrever exercício</div>
          <div style={styles.subtitle}>Paciente: {patientId}</div>
        </div>

        <button onClick={fetchExercises} style={styles.smallBtn} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar exercícios"}
        </button>
      </div>

      <div style={styles.grid}>
        {/* Left: selecionar exercício */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>1) Escolher exercício</div>
              <div style={styles.panelSubtitle}>Selecione um exercício do catálogo.</div>
            </div>
          </div>

          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            <input
              style={styles.search}
              placeholder="Buscar exercício por título/descrição/id..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {loading ? (
              <div style={{ color: "#64748b" }}>Carregando...</div>
            ) : filteredExercises.length === 0 ? (
              <div style={{ color: "#64748b" }}>Nenhum exercício encontrado.</div>
            ) : (
              <div style={styles.exerciseList}>
                {filteredExercises.map((ex) => {
                  const selected = ex.id === selectedExerciseId;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => setSelectedExerciseId(ex.id)}
                      style={{
                        ...styles.exerciseRow,
                        borderColor: selected ? "#0ea5e9" : "#eef2f7",
                        background: selected ? "#f0f9ff" : "white",
                      }}
                    >
                      <div>
                        <div style={styles.exerciseTitle}>{ex.title}</div>
                        <div style={styles.exerciseMeta}>
                          id={ex.id}
                          {ex.body_focus ? ` • ${ex.body_focus}` : ""}
                          {ex.analysis_kind ? ` • ${ex.analysis_kind}` : ""}
                        </div>
                      </div>
                      <span style={{ fontWeight: 900, color: selected ? "#0ea5e9" : "#94a3b8" }}>
                        {selected ? "Selecionado" : "Selecionar"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: params + schedule */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>2) Configurar & criar</div>
              <div style={styles.panelSubtitle}>Defina params, frequência e status.</div>
            </div>
          </div>

          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div style={styles.selectedBox}>
              <div style={styles.selectedLabel}>Exercício selecionado</div>
              <div style={styles.selectedValue}>
                {selectedExercise ? `${selectedExercise.title} (id=${selectedExercise.id})` : "—"}
              </div>
            </div>

            <label style={styles.label}>
              Parâmetros (JSON)
              <textarea
                style={styles.textarea}
                value={paramsText}
                onChange={(e) => setParamsText(e.target.value)}
                spellCheck={false}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={styles.label}>
                Frequência
                <select style={styles.input} value={schedule} onChange={(e) => setSchedule(e.target.value as any)}>
                  <option value="DAILY">Diário</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="MONTHLY">Mensal</option>
                </select>
              </label>

              <label style={styles.label}>
                Ativo
                <select
                  style={styles.input}
                  value={active ? "true" : "false"}
                  onChange={(e) => setActive(e.target.value === "true")}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}
            {success && (
              <div style={styles.successBox}>
                {success}
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => nav(`/patients/${patientId}`)} style={styles.smallBtn}>
                    Voltar para o paciente
                  </button>
                </div>
              </div>
            )}

            <button onClick={onSubmit} style={styles.primaryBtn} disabled={saving}>
              {saving ? "Criando..." : "Criar prescrição"}
            </button>

            <div style={{ fontSize: 12, color: "#64748b" }}>
              MVP: params é um JSON livre. Depois a gente troca por campos guiados por <code>analysis_kind</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f3f6fb", padding: 22 },
  header: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  backLink: { color: "#0ea5e9", fontWeight: 900, textDecoration: "none", fontSize: 13 },
  title: { marginTop: 8, fontSize: 16, fontWeight: 900, color: "#0f172a" },
  subtitle: { marginTop: 4, fontSize: 12, color: "#64748b" },

  grid: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 16,
  },

  panel: {
    background: "white",
    borderRadius: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },
  panelHeader: {
    padding: 16,
    borderBottom: "1px solid #eef2f7",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  panelTitle: { fontSize: 14, fontWeight: 900, color: "#0f172a" },
  panelSubtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },

  search: {
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "0 12px",
    outline: "none",
    background: "white",
  },

  exerciseList: {
    display: "grid",
    gap: 10,
    maxHeight: 520,
    overflow: "auto",
    paddingRight: 4,
  },
  exerciseRow: {
    border: "1px solid #eef2f7",
    borderRadius: 14,
    padding: 12,
    cursor: "pointer",
    background: "white",
    textAlign: "left",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  exerciseTitle: { fontWeight: 900, color: "#0f172a" },
  exerciseMeta: { marginTop: 4, fontSize: 12, color: "#64748b" },

  selectedBox: {
    border: "1px solid #eef2f7",
    borderRadius: 14,
    padding: 12,
    background: "#f8fafc",
  },
  selectedLabel: { fontSize: 12, color: "#64748b", fontWeight: 800 },
  selectedValue: { marginTop: 6, fontWeight: 900, color: "#0f172a" },

  label: { display: "grid", gap: 6, fontSize: 13, color: "#0f172a", fontWeight: 800 },
  input: {
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "0 12px",
    outline: "none",
    background: "white",
    fontWeight: 800,
  },
  textarea: {
    minHeight: 220,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: 12,
    outline: "none",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
  },

  smallBtn: {
    height: 36,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "white",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryBtn: {
    height: 40,
    borderRadius: 12,
    border: "none",
    background: "#0ea5e9",
    color: "white",
    padding: "0 14px",
    cursor: "pointer",
    fontWeight: 900,
  },

  errorBox: {
    padding: 12,
    borderRadius: 12,
    background: "#ffe8e8",
    color: "#9b1c1c",
    fontSize: 13,
  },
  successBox: {
    padding: 12,
    borderRadius: 12,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 13,
    fontWeight: 800,
  },
};