import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { createPatient } from "@/services/patients";
import { ArrowLeft, Save, UserPlus } from "lucide-react";

export default function NewPatientPage() {
  const nav = useNavigate();
  const { isPro } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isPro) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente usuários com role PRO podem acessar esta tela.
          </p>
          <Link to="/pro/dashboard" className="mt-4 inline-flex text-sm font-medium text-primary hover:opacity-80">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const resp = await createPatient({ name, email, password });
      setStatus({ type: "success", text: `Paciente criado: ${resp.name} (${resp.email})` });
      nav("/pro/dashboard");
    } catch (err: any) {
      setStatus({ type: "error", text: err?.message || "Erro ao criar paciente" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Header */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/pro/dashboard"
                className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao dashboard
              </Link>

              <h1 className="mt-2 text-lg font-semibold tracking-tight">Cadastrar paciente</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Cria um usuário paciente e vincula ao seu perfil profissional.
              </p>
            </div>
          </div>

          {status && (
            <div
              className={
                "mt-4 rounded-xl border p-3 text-xs " +
                (status.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-destructive/30 bg-destructive/10 text-destructive")
              }
            >
              {status.text}
            </div>
          )}
        </section>

        {/* Form */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Ex.: Maria Souza"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
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
                placeholder="maria@exemplo.com"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
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
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              />
              <p className="text-xs text-muted-foreground">
                Dica: depois a gente pode trocar por um fluxo de “primeiro acesso” (sem senha fixa).
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition disabled:opacity-60 sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                {saving ? "Salvando..." : "Criar paciente"}
              </button>

              <button
                type="button"
                onClick={() => nav("/pro/dashboard")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition sm:w-auto"
              >
                <Save className="h-4 w-4" />
                Voltar
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}