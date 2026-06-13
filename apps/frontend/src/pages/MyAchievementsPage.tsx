import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Award, Lock, RefreshCw, Sparkles, Trophy } from "lucide-react";

type Achievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon?: string | null;
  points: number;
  active: boolean;
  created_at: string;
};

type UserAchievement = {
  id: number;
  user_id: string;
  achievement_id: number;
  progress: number;
  source?: string | null;
  unlocked_at: string;
  created_at: string;
};

// tolerância caso o endpoint esteja vindo com shape inesperado
function isUserAchievement(item: any): item is UserAchievement {
  return item && typeof item === "object" && "achievement_id" in item;
}

export default function MyAchievementsPage() {
  const { me } = useAuth();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!me?.id) return;

    setLoading(true);
    setError(null);

    try {
      const [catalogData, userData] = await Promise.all([
        apiFetch<Achievement[]>("/v1/achievements"),
        apiFetch<any[]>(`/v1/achievements/users/${me.id}`),
      ]);

      setAchievements(Array.isArray(catalogData) ? catalogData : []);

      // se backend estiver correto, entra aqui
      if (Array.isArray(userData) && userData.every(isUserAchievement)) {
        setUserAchievements(userData);
      } else {
        // fallback defensivo: considera vazio se shape vier inesperado
        setUserAchievements([]);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar conquistas.");
      setAchievements([]);
      setUserAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [me?.id]);

  const unlockedMap = useMemo(() => {
    const map = new Map<number, UserAchievement>();
    userAchievements.forEach((ua) => {
      map.set(ua.achievement_id, ua);
    });
    return map;
  }, [userAchievements]);

  const stats = useMemo(() => {
    const unlocked = userAchievements.length;
    const total = achievements.length;
    const points = achievements.reduce((acc, ach) => {
      return unlockedMap.has(ach.id) ? acc + ach.points : acc;
    }, 0);

    return { unlocked, total, points };
  }, [achievements, userAchievements, unlockedMap]);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para tela principal
              </Link>

              <h1 className="mt-2 text-lg font-semibold tracking-tight">Minhas conquistas</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Veja sua evolução e desbloqueios na jornada.
              </p>
            </div>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted/50 transition"
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Desbloqueadas</span>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : stats.unlocked}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loading ? "Carregando…" : `De ${stats.total} conquista(s)`}
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pontos</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : stats.points}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Pontos acumulados</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Catálogo</span>
              <Award className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {loading ? "…" : stats.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total de conquistas</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Conquistas</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {loading ? "…" : `${achievements.length} item(s)`}
            </span>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            ) : achievements.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhuma conquista disponível.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => {
                  const unlocked = unlockedMap.get(achievement.id);

                  return (
                    <div
                      key={achievement.id}
                      className={
                        "rounded-2xl border px-4 py-4 transition " +
                        (unlocked
                          ? "border-primary/30 bg-card shadow-sm"
                          : "border-border/60 bg-background/50 opacity-50")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={
                              "flex h-11 w-11 items-center justify-center rounded-xl " +
                              (unlocked
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            {unlocked ? (
                              <Trophy className="h-5 w-5" />
                            ) : (
                              <Lock className="h-5 w-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{achievement.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {achievement.points} ponto(s)
                            </p>
                          </div>
                        </div>

                        <span
                          className={
                            "rounded-full px-3 py-1 text-[11px] font-medium " +
                            (unlocked
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {unlocked ? "Desbloqueada" : "Bloqueada"}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {achievement.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Código: {achievement.code}</span>
                        <span>
                          {unlocked?.unlocked_at
                            ? `Em ${formatDate(unlocked.unlocked_at)}`
                            : "Ainda não obtida"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}