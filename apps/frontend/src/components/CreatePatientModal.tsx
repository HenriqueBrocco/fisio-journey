import { useState } from "react";
import { createPatient } from "@/services/patients";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
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
    if (saving) return;
    reset();
    onClose();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPatient({ name, email, password });
      onCreated?.();
      handleClose();
    } catch (err: any) {
      setError(err?.message || "Erro ao criar paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      onMouseDown={handleClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card text-foreground shadow-card backdrop-blur p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Cadastrar paciente</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Cria um usuário paciente vinculado ao seu perfil.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-border/60 p-2 hover:bg-muted/50 transition"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              placeholder="Ex.: Julio"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">E-mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              placeholder="julio@exemplo.com"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Senha</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              placeholder="••••••••"
            />
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="w-full sm:w-auto rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? "Criando..." : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}