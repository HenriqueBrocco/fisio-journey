import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import CreatePatientModal from "@/components/CreatePatientModal";
import { ArrowLeft, RefreshCw, Search, Users } from "lucide-react";

type Patient = {
  id: string;
  name: string;
  email: string;
};

export default function MyPatientsPage() {
  const { isPro } = useAuth();
  const nav = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState("");
  const [createPatientOpen, setCreatePatientOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await apiFetch<Patient[]>("/v1/my/patients");
      setPatients(Array.isArray(p) ? p : []);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar pacientes.");
      setPatients([]);
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
    return base.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q));
  }, [patients, query]);

  if (!isPro) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Somente usuários com role PRO podem acessar esta tela.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/pro/dashboard"
              className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao dashboard
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Meus pacientes</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Gerencie sua lista (ordenado por nome).
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchPatients}
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
                + Cadastrar paciente
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}
        </section>

        {/* Search + Count */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-xl border border-border bg-background px-9 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.35)]"
              />
            </div>

            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              {loading ? "Carregando…" : `${filtered.length} paciente(s)`}
            </div>
          </div>
        </section>

        {/* List */}
        <section className="rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold tracking-tight">Lista</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique em um paciente para ver detalhes e prescrever exercícios.
            </p>
          </div>

          <div className="p-3">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhum paciente encontrado.</div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => nav(`/patients/${p.id}`)}
                    className="w-full rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-left hover:bg-background/80 transition"
                  >
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <CreatePatientModal
          open={createPatientOpen}
          onClose={() => setCreatePatientOpen(false)}
          onCreated={fetchPatients}
        />
      </main>
    </div>
  );
}