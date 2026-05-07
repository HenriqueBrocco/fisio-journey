import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";

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
      <div style={{ padding: 24 }}>
        <h2>Acesso negado</h2>
        <p>Somente usuários com role PRO podem acessar esta tela.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <Link to={`/patients/${patientId}`} style={styles.backLink}>
            ← Voltar
          </Link>
          <div style={styles.title}>Prescrições do paciente</div>
          <div style={styles.subtitle}>Paciente: {patientId}</div>
        </div>

        <button onClick={fetchAll} style={styles.smallBtn} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelTitle}>Assignments</div>
          <div style={styles.panelSubtitle}>{loading ? "…" : `${sorted.length} item(s)`}</div>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Carregando...</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 16, color: "#6b7280" }}>Nenhuma prescrição encontrada.</div>
        ) : (
          <div style={{ padding: 10 }}>
            {sorted.map((a) => {
              const ex = exerciseMap[a.exercise_id];
              const title = ex?.title || `Exercício #${a.exercise_id}`;
              return (
                <div key={a.id} style={styles.row}>
                  <div>
                    <div style={styles.rowTitle}>{title}</div>
                    <div style={styles.rowSub}>
                      schedule: {a.schedule} • active: {String(a.active)} • config: #{a.config_id}
                      {ex?.analysis_kind ? ` • ${ex.analysis_kind}` : ""}
                      {ex?.body_focus ? ` • ${ex.body_focus}` : ""}
                    </div>
                  </div>
                  <span style={a.active ? styles.badgeOn : styles.badgeOff}>
                    {a.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, color: "#64748b", fontSize: 12 }}>
        Próximo upgrade: botões “Desativar/Ativar” e “Editar schedule”, se você tiver endpoints de update.
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
  smallBtn: {
    height: 36,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "white",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 700,
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "#ffe8e8",
    color: "#9b1c1c",
    fontSize: 13,
  },
  panel: {
    marginTop: 14,
    background: "white",
    borderRadius: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },
  panelHeader: { padding: 16, borderBottom: "1px solid #eef2f7" },
  panelTitle: { fontSize: 14, fontWeight: 900, color: "#0f172a" },
  panelSubtitle: { marginTop: 4, fontSize: 12, color: "#64748b" },
  row: {
    padding: 12,
    margin: 6,
    borderRadius: 14,
    border: "1px solid #eef2f7",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: { fontWeight: 900, color: "#0f172a" },
  rowSub: { marginTop: 4, fontSize: 12, color: "#64748b" },
  badgeOn: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  badgeOff: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
};