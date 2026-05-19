import { useEffect, useMemo, useState } from "react";
import FisioJourneyLogo from "@/components/FisioJourneyLogo";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import CreatePatientModal from "@/components/CreatePatientModal";
import { useTheme } from "@/hooks/useTheme";
import { Calendar, Dumbbell, LogOut, Moon, Plus, Sun, Users, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

type Patient = {
  id: string;
  name: string;
  email: string;
};

type Exercise = {
  id: number;
  title: string;
};

export default function ProDashboard() {
  const { me, logout, isPro } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

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
      setPatients([]);
      setExercises([]);
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
    return [...patients].sort((a, b) => (a.name || "").localeCompare(b.name || "")).slice(0, 5);
  }, [patients]);

  if (!isPro) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente usuários com role PRO podem acessar este dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 rounded-2xl bg-card/80 px-4 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <FisioJourneyLogo className="w-10 sm:w-12 h-auto" />
          <div>
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">Fisio Journey</h1>
            <p className="text-xs text-muted-foreground">
              Portal do Profissional · {me?.name || me?.email} 👋
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggle}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium hover:bg-muted/50 transition"
            title="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Claro" : "Escuro"}
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto mt-6 flex w-full max-w-6xl flex-col gap-6">
        {/* Cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Meus pacientes</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? "…" : patients.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total vinculados</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Exercícios</span>
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{loading ? "…" : exercises.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total no catálogo</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Acompanhamento</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">—</p>
            <p className="mt-1 text-xs text-muted-foreground">Em breve (sessões / resultados)</p>
          </div>
        </section>

        {/* Main */}
        <section className="grid gap-4 lg:grid-cols-[2fr,1.2fr]">
          {/* Pacientes recentes */}
          <div className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
            <div className="flex flex-col gap-3 px-5 py-4 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Meus pacientes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ordenado por nome (visão rápida).
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={fetchAll}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
                >
                  <RefreshCw className="h-4 w-4" />
                  {loading ? "Atualizando..." : "Atualizar"}
                </button>

                <button
                  onClick={() => setCreatePatientOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar
                </button>
              </div>
            </div>

            {error && (
              <div className="m-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="p-3">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
              ) : recentPatients.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">Nenhum paciente cadastrado ainda.</div>
              ) : (
                <div className="grid gap-3">
                  {recentPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/patients/${p.id}`)}
                      className="w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-left hover:bg-background/80 transition"
                    >
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{p.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border/60">
              <Link to="/patients" className="text-xs font-medium text-primary hover:opacity-80 transition">
                Ver todos os pacientes →
              </Link>
            </div>
          </div>

          {/* Ações rápidas */}
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Ações rápidas</h2>
            <p className="mt-1 text-xs text-muted-foreground">Atalhos para o que você mais usa.</p>

            <div className="mt-4 grid gap-3">
              <button
                onClick={() => navigate("/patients")}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground shadow-button hover:opacity-90 transition"
              >
                Meus pacientes
              </button>

              <button
                onClick={() => setCreatePatientOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
              >
                <Plus className="h-4 w-4" />
                Cadastrar paciente
              </button>

              <button
                onClick={() => navigate("/exercises/new")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
              >
                <Plus className="h-4 w-4" />
                Cadastrar exercício
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
              Próximo: acompanhar sessões/sumários dos pacientes.
            </div>
          </div>
        </section>
      </main>

      <CreatePatientModal
        open={createPatientOpen}
        onClose={() => setCreatePatientOpen(false)}
        onCreated={fetchAll}
      />
    </div>
  );
}