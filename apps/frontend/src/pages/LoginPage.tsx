import FisioPlayLogo from "@/components/FisioPlayLogo";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate(); // 👈 novo

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error(err);
      alert("Falha no login: " + (err?.message || "erro"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-bg)] px-4 py-8">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-up">
        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card p-8 shadow-card sm:p-10">
          {/* Logo */}
          <div className="mb-2 flex justify-center">
            <FisioPlayLogo />
          </div>
          <p className="mb-8 text-center text-sm text-muted-foreground">
            Exercícios guiados com acompanhamento inteligente
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <div
                className={`flex items-center gap-3 rounded-lg border-2 bg-background px-4 py-3 transition-all duration-200 ${
                  focusedField === "email"
                    ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <div
                className={`flex items-center gap-3 rounded-lg border-2 bg-background px-4 py-3 transition-all duration-200 ${
                  focusedField === "password"
                    ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[image:var(--gradient-hero)] px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-button transition-all duration-200 hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
            >
              Entrar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          {/* Sign up */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ainda não tem conta?{" "}
            <button className="font-semibold text-primary transition-colors hover:text-primary/80">
              Criar conta
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          © 2026 Fisio Play · Reabilitação inteligente
        </p>
      </div>
    </div>
  );
};

export default Index;