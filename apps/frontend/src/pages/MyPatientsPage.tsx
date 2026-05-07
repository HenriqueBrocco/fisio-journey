import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import CreatePatientModal from "../components/CreatePatientModal";
import { useNavigate } from "react-router-dom";

type Patient = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export default function MyPatientsPage() {
  const { isPro } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  
  const nav = useNavigate();

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await apiFetch<Patient[]>("/v1/my/patients");
      setPatients(Array.isArray(p) ? p : []);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar pacientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPro) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = [...patients].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    if (!q) return base;
    return base.filter((p) => {
      return (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
    });
  }, [patients, query]);

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
          <div style={styles.title}>Meus pacientes</div>
          <div style={styles.subtitle}>Gerencie seus pacientes (ordenado por nome).</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchPatients} style={styles.smallBtn} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
          <button onClick={() => setCreatePatientOpen(true)} style={styles.primaryBtn}>
            + Cadastrar paciente
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input
          style={styles.search}
          placeholder="Buscar por nome ou email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div style={styles.count}>
          {loading ? "…" : `${filtered.length} paciente(s)`}
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={{ padding: 16 }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 16, color: "#6b7280" }}>
          Nenhum paciente encontrado.
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map((p) => (
            <button
              key={p.id}
              style={styles.rowBtn}
              onClick={() => nav(`/patients/${p.id}`)}
            >
              <div>
                <div style={styles.itemTitle}>{p.name}</div>
                <div style={styles.itemSubtitle}>{p.email}</div>
              </div>
              <span style={styles.chev}>›</span>
            </button>
          ))}
        </div>
      )}

      <CreatePatientModal
        open={createPatientOpen}
        onClose={() => setCreatePatientOpen(false)}
        onCreated={fetchPatients}
      />
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
  title: { fontSize: 16, fontWeight: 900, color: "#0f172a" },
  subtitle: { marginTop: 4, fontSize: 12, color: "#64748b" },

  toolbar: {
    marginTop: 14,
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "0 12px",
    outline: "none",
    background: "white",
  },
  count: { fontSize: 12, color: "#64748b", fontWeight: 800 },

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
  },

  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "#ffe8e8",
    color: "#9b1c1c",
    fontSize: 13,
  },

  list: {
    marginTop: 12,
    background: "white",
    borderRadius: 16,
    border: "1px solid #eef2f7",
    boxShadow: "0 10px 22px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },
  rowBtn: {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "white",
    padding: 14,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #eef2f7",
  },
  itemTitle: { fontWeight: 900, color: "#0f172a" },
  itemSubtitle: { marginTop: 4, fontSize: 12, color: "#64748b" },
  chev: { fontSize: 22, color: "#94a3b8", fontWeight: 900 },
};