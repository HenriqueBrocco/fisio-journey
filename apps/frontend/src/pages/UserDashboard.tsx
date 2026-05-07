import FisioPlayLogo from "@/components/FisioPlayLogo";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Calendar, LogOut, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { me, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl bg-card/80 px-6 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <FisioPlayLogo />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Portal do Paciente</h1>
            <p className="text-xs text-muted-foreground">
              Bem-vindo(a), {me?.name || me?.email} 👋
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </header>

      {/* Conteúdo principal */}
      <main className="mx-auto mt-6 flex max-w-6xl flex-col gap-6">
        {/* Cards de resumo */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pacientes ativos</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">12</p>
            <p className="mt-1 text-xs text-muted-foreground">+3 esta semana</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Sessões de hoje</span>
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">5</p>
            <p className="mt-1 text-xs text-muted-foreground">2 concluídas, 3 agendadas</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Adesão aos exercícios</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">87%</p>
            <p className="mt-1 text-xs text-muted-foreground">Média dos últimos 7 dias</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4">
            <h2 className="text-sm font-semibold tracking-tight">Sessão de Exercício</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Acesse sua sessão para iniciar a análise em tempo real.
            </p>
          </div>

          <button
            onClick={() => navigate("/user/session")}
            className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Abrir sessão de teste
          </button>
        </section>

        {/* Lista / próximos passos */}
        <section className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Próximas sessões</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Em breve aqui vão entrar os dados que virão da API com seus pacientes e horários.
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <div>
                  <p className="font-medium">João Silva</p>
                  <p className="text-xs text-muted-foreground">Treino de ombro · 09:30</p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-500">
                  Online
                </span>
              </li>
              <li className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                <div>
                  <p className="font-medium">Maria Souza</p>
                  <p className="text-xs text-muted-foreground">Joelho · 10:15</p>
                </div>
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
                  Aguardando
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Próximos passos</h2>
            <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Integrar este dashboard com os dados reais da API.</li>
              <li>Criar página de listagem de pacientes.</li>
              <li>Conectar com o módulo de câmera / MediaPipe futuramente.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;