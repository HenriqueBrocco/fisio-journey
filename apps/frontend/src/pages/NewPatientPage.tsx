import React, { useState } from "react";
import { createPatient } from "../services/patients";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NewPatientPage() {
  const nav = useNavigate();
  const { isPro } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isPro) return <div style={{ padding: 24 }}>Acesso negado (somente PRO).</div>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const resp = await createPatient({ name, email, password });
      setStatus(`Paciente criado: ${resp.name} (${resp.email})`);
      nav("/dashboard");
    } catch (err: any) {
      setStatus(err?.message || "Erro ao criar paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h2>Cadastrar Paciente</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
        </label>

        <label>
          Senha
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
        </label>

        <button disabled={saving} type="submit">
          {saving ? "Salvando..." : "Criar"}
        </button>

        {status && <p>{status}</p>}
      </form>
    </div>
  );
}