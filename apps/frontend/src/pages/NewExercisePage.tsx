import React, { useState } from "react";
import { createExercise } from "../services/exercises";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NewExercisePage() {
  const nav = useNavigate();
  const { isPro } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bodyFocus, setBodyFocus] = useState("TRUNK");
  const [analysisKind, setAnalysisKind] = useState("V1_LITE_THRESHOLDS");

  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isPro) return <div style={{ padding: 24 }}>Acesso negado (somente PRO).</div>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const resp = await createExercise({
        title,
        description,
        body_focus: bodyFocus,
        analysis_kind: analysisKind,
      });
      setStatus(`Exercício criado: ${resp.title} (id=${resp.id})`);
      nav("/dashboard");
    } catch (err: any) {
      setStatus(err?.message || "Erro ao criar exercício");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h2>Cadastrar Exercício</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label>
          Descrição
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          Body focus
          <input value={bodyFocus} onChange={(e) => setBodyFocus(e.target.value)} />
        </label>

        <label>
          Analysis kind
          <input value={analysisKind} onChange={(e) => setAnalysisKind(e.target.value)} />
        </label>

        <button disabled={saving} type="submit">
          {saving ? "Salvando..." : "Criar"}
        </button>

        {status && <p>{status}</p>}
      </form>
    </div>
  );
}