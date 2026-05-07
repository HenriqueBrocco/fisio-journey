import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";

type Patient = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type Assignment = {
  id: string;
  patient_user_id?: string;
  exercise_id?: number;
  config_id?: string;
  status?: string;
  created_at?: string;
};

type Session = {
  id: string;
  patient_user_id?: string;
  assignment_id?: string;
  started_at?: string;
  ended_at?: string;
  created_at?: string;
  status?: string;
};

type Exercise = {
  id: number;
  title: string;
  analysis_kind?: string;
  body_docus?: string;
};

export default function PatientDetailsPage() {
  const { isPro } = useAuth();
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const patientId = id || "";

  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});

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

  const assignmentsCount = assignments.length;
  const sessionsCount = sessions.length;

  const recentAssignments = useMemo(() => {
    // sem saber o schema exato: mostra os primeiros 5
    return [...assignments].slice(0, 5);
  }, [assignments]);

  const recentSessions = useMemo(() => {
    return [...sessions].slice(0, 5);
  }, [sessions]);

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
          <Link to="/patients" style={styles.backLink}>← Voltar</Link>
          <div style={styles.title}>Paciente</div>
          <div style={styles.subtitle}>
            {patient ? `${patient.name} • ${patient.email}` : "Carregando..."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchAll} style={styles.smallBtn} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>

          {/* Próximo passo: rota do wizard de prescrição */}
          <Link to={`/patients/${patientId}/prescribe`} style={{ textDecoration: "none" }}>
            <div style={styles.primaryBtn as React.CSSProperties}>Prescrever exercício</div>
          </Link>
        </div>
      </div>

      <div style={styles.cards}>
        <StatCard label="Prescrições" value={assignmentsCount} icon="📌" />
        <StatCard label="Sessões" value={sessionsCount} icon="🗓️" />
        <StatCard label="Resultados" value={"—"} icon="📈" helper="(em breve)" />
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>Prescrições (assignments)</div>
              <div style={styles.panelSubtitle}>Vínculos de exercícios atribuídos ao paciente.</div>
            </div>
            <Link to={`/patients/${patientId}/assignments`} style={styles.link}>
              Ver todos
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>Carregando...</div>
          ) : recentAssignments.length === 0 ? (
            <div style={{ padding: 16, color: "#6b7280" }}>Nenhuma prescrição ainda.</div>
          ) : (
            <div style={styles.list}>
              {recentAssignments.map((a) => (
                <div key={a.id} style={styles.listItem}>
                  <div>
                    <div style={styles.itemTitle}>Assignment {a.id}</div>
                    <div style={styles.itemSubtitle}>
                      {a.status ? `Status: ${a.status}` : "Status: —"}
                      {a.exercise_id != null
                        ? ` • Exercício: ${exerciseMap[a.exercise_id]?.title || `#${a.exercise_id}`}`
                        : ""}
                    </div>
                  </div>
                  <span style={styles.badge}>OK</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>Sessões</div>
              <div style={styles.panelSubtitle}>Sessões associadas ao paciente.</div>
            </div>
            <Link to={`/patients/${patientId}/sessions`} style={styles.link}>
              Ver todas
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>Carregando...</div>
          ) : recentSessions.length === 0 ? (
            <div style={{ padding: 16, color: "#6b7280" }}>Nenhuma sessão ainda.</div>
          ) : (
            <div style={styles.list}>
              {recentSessions.map((s) => (
                <div key={s.id} style={styles.listItem}>
                  <div>
                    <div style={styles.itemTitle}>Sessão {s.id}</div>
                    <div style={styles.itemSubtitle}>
                      {s.status ? `Status: ${s.status}` : "Status: —"}
                      {s.created_at ? ` • Criada: ${formatDate(s.created_at)}` : ""}
                    </div>
                  </div>
                  <span style={styles.badgeBlue}>Abrir</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading skeleton simples */}
      {loading && !patient && <div style={{ padding: 16, color: "#64748b" }}>Carregando dados…</div>}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  helper,
}: {
  label: string;
  value: number | string;
  icon: string;
  helper?: string;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.cardLabel}>{label}</div>
        <div style={styles.cardIcon}>{icon}</div>
      </div>
      <div style={styles.cardValue}>{value}</div>
      {helper && <div style={styles.cardHelper}>{helper}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
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

  cards: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    minHeight: 92,
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontSize: 13, color: "#64748b", fontWeight: 800 },
  cardIcon: { fontSize: 16, opacity: 0.9 },
  cardValue: { marginTop: 10, fontSize: 30, fontWeight: 900, color: "#0f172a" },
  cardHelper: { marginTop: 6, fontSize: 12, color: "#94a3b8" },

  grid: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
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

  list: { padding: 10 },
  listItem: {
    padding: 12,
    margin: 6,
    borderRadius: 14,
    border: "1px solid #eef2f7",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemTitle: { fontWeight: 900, color: "#0f172a" },
  itemSubtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
  badge: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 900,
  },
  badgeBlue: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: 900,
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
    height: 36,
    borderRadius: 10,
    border: "none",
    background: "#0ea5e9",
    color: "white",
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 900,
    display: "grid",
    placeItems: "center",
  },

  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "#ffe8e8",
    color: "#9b1c1c",
    fontSize: 13,
  },

  link: { color: "#0ea5e9", fontWeight: 900, textDecoration: "none", fontSize: 13 },
};