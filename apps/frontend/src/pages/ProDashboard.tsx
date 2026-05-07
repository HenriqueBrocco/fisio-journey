import React, { useEffect, useMemo, useState } from "react";
import FisioPlayLogo from "@/components/FisioPlayLogo";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import CreatePatientModal from "../components/CreatePatientModal";

type Patient = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

type Exercise = {
  id: number;
  title: string;
  description?: string;
  body_focus?: string;
  analysis_kind?: string;
  created_at?: string;
};

export default function ProDashboard() {
  const { me, logout, isPro } = useAuth();

  const [createPatientOpen, setCreatePatientOpen] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, e] = await Promise.all([
        apiFetch<Patient[]>("/v1/my/patients"),
        apiFetch<Exercise[]>("/v1/exercises"),
      ]);
      setPatients(Array.isArray(p) ? p : []);
      setExercises(Array.isArray(e) ? e : []);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  const recentPatients = useMemo(() => {
    // Sem created_at no patient: só pega os primeiros 5 (ou ordena por name)
    return [...patients].sort((a, b) => (a.name || "").localeCompare(b.name || "")).slice(0, 5);
  }, [patients]);

  if (!isPro) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Acesso negado</h2>
        <p>Somente usuários com role PRO podem acessar este dashboard.</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.brand}>
          <FisioPlayLogo />
          <div style={styles.titleRow}>
            <div style={styles.welcome}>Bem-vindo(a), {me?.name} 👋</div>
          </div>
        </div>

        <button onClick={logout} style={styles.logoutBtn}>
          Sair
        </button>
      </div>

      {/* Cards */}
      <div style={styles.cards}>
        <StatCard label="Meus pacientes" value={patients.length} icon="👥" />
        <StatCard label="Exercícios cadastrados" value={exercises.length} icon="🏋️" />
        <StatCard label="Pendências" value={"—"} icon="✅" helper="(em breve)" />
      </div>

      {/* Main grid */}
      <div style={styles.grid}>
        {/* Left panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>Meus pacientes</div>
              <div style={styles.panelSubtitle}>
                Lista inicial (vamos integrar filtros/ordenação depois).
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={fetchAll} style={styles.smallBtn} disabled={loading}>
                {loading ? "Atualizando..." : "Atualizar"}
              </button>
              <button onClick={() => setCreatePatientOpen(true)} style={styles.primaryBtn}>
                + Cadastrar paciente
              </button>
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          {loading ? (
            <div style={{ padding: 16 }}>Carregando...</div>
          ) : recentPatients.length === 0 ? (
            <div style={{ padding: 16, color: "#6b7280" }}>
              Nenhum paciente cadastrado ainda.
            </div>
          ) : (
            <div style={styles.list}>
              {recentPatients.map((p) => (
                <div key={p.id} style={styles.listItem}>
                  <div>
                    <div style={styles.itemTitle}>{p.name}</div>
                    <div style={styles.itemSubtitle}>{p.email}</div>
                  </div>
                  <span style={styles.badge}>Ativo</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: 16, borderTop: "1px solid #eef2f7" }}>
            <Link to="/patients" style={styles.link}>
              Ver todos os pacientes
            </Link>
          </div>
        </div>

        {/* Right panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelTitle}>Ações rápidas</div>
              <div style={styles.panelSubtitle}>Atalhos para as tarefas mais comuns.</div>
            </div>
          </div>

          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <button onClick={() => setCreatePatientOpen(true)} style={styles.actionBtn}>
              Cadastrar paciente
              <span style={styles.actionHint}>Cria um paciente (role PATIENT)</span>
            </button>

            <Link to="/exercises/new" style={{ textDecoration: "none" }}>
              <div style={styles.actionBtn as React.CSSProperties}>
                Cadastrar exercício
                <span style={styles.actionHint}>Cria um exercício no catálogo</span>
              </div>
            </Link>

            <div style={styles.todoBox}>
              <div style={styles.todoTitle}>Próximos passos</div>
              <ul style={styles.todoList}>
                <li>Listagem completa de pacientes (com busca).</li>
                <li>Listagem completa de exercícios (com filtros).</li>
                <li>Prescrição (assignments) por paciente.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <CreatePatientModal
        open={createPatientOpen}
        onClose={() => setCreatePatientOpen(false)}
        onCreated={fetchAll}
      />
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

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: 22,
  },
  header: {
    background: "white",
    borderRadius: 16,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    border: "1px solid #eef2f7",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
  },
  titleRow: { display: "flex", alignItems: "baseline", gap: 10 },
  title: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", fontWeight: 600 },
  welcome: { marginTop: 2, fontSize: 12, color: "#64748b" },

  logoutBtn: {
    borderRadius: 999,
    border: "1px solid #fecaca",
    background: "white",
    color: "#ef4444",
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  cards: {
    marginTop: 18,
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
  cardLabel: { fontSize: 13, color: "#64748b", fontWeight: 700 },
  cardIcon: { fontSize: 16, opacity: 0.9 },
  cardValue: { marginTop: 10, fontSize: 30, fontWeight: 800, color: "#0f172a" },
  cardHelper: { marginTop: 6, fontSize: 12, color: "#94a3b8" },

  grid: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
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
  panelTitle: { fontSize: 14, fontWeight: 800, color: "#0f172a" },
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
  itemTitle: { fontWeight: 800, color: "#0f172a" },
  itemSubtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
  badge: {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    fontWeight: 800,
  },

  errorBox: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    background: "#ffe8e8",
    color: "#9b1c1c",
    fontSize: 13,
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
    fontWeight: 800,
  },
  actionBtn: {
    border: "1px solid #eef2f7",
    background: "white",
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    display: "grid",
    gap: 6,
    fontWeight: 900,
    color: "#0f172a",
  },
  actionHint: { fontSize: 12, color: "#64748b", fontWeight: 600 },

  todoBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 14,
    border: "1px solid #eef2f7",
    background: "#f8fafc",
  },
  todoTitle: { fontWeight: 900, color: "#0f172a", marginBottom: 8 },
  todoList: { margin: 0, paddingLeft: 18, color: "#475569", fontSize: 13, display: "grid", gap: 6 },

  link: { color: "#0ea5e9", fontWeight: 800, textDecoration: "none", fontSize: 13 },
};