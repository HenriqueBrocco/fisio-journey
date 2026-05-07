import React, { useState } from "react";
import { createPatient } from "../services/patients";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void; // pra dar refresh na lista/counters depois
};

export default function CreatePatientModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
  };

  const handleClose = () => {
    if (!saving) {
      reset();
      onClose();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await createPatient({ name, email, password });
      onCreated?.();
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao criar paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.backdrop} onMouseDown={handleClose}>
      <div style={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Cadastrar paciente</h3>
          <button onClick={handleClose} style={styles.closeBtn} aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <label style={styles.label}>
            Nome
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label style={styles.label}>
            Email
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
            />
          </label>

          <label style={styles.label}>
            Senha
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
            />
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={handleClose} disabled={saving} style={styles.secondaryBtn}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? "Salvando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  modal: {
    width: "100%",
    maxWidth: 520,
    background: "white",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: 18,
    cursor: "pointer",
  },
  label: {
    display: "grid",
    gap: 6,
    fontSize: 14,
  },
  input: {
    height: 38,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "0 12px",
    outline: "none",
  },
  primaryBtn: {
    height: 38,
    borderRadius: 10,
    border: "none",
    padding: "0 14px",
    cursor: "pointer",
  },
  secondaryBtn: {
    height: 38,
    borderRadius: 10,
    border: "1px solid #d0d7de",
    padding: "0 14px",
    cursor: "pointer",
    background: "white",
  },
  error: {
    padding: 10,
    borderRadius: 10,
    background: "#ffe8e8",
    color: "#9b1c1c",
    fontSize: 14,
  },
};