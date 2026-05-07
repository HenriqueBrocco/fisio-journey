import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/storage";
import { WebSocketService, WsMessage, WsStatus } from "@/services/websocketService";
import { ArrowLeft, PlugZap, Unplug, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WS_BASE_URL = (import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");

function buildWsUrl(sessionId: string, token: string) {
  return `${WS_BASE_URL}/v1/infer/ws/session/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
}

export default function UserSessionPage() {
  const navigate = useNavigate();
  const { me } = useAuth();

  const token = getToken() || "";
  const [sessionId, setSessionId] = useState("sess-123");
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [errorText, setErrorText] = useState("");
  const wsRef = useRef<WebSocketService | null>(null);

  const wsUrl = useMemo(() => {
    if (!token || !sessionId.trim()) return "";
    return buildWsUrl(sessionId.trim(), token);
  }, [sessionId, token]);

  const handleConnect = () => {
    try {
      setErrorText("");

      if (!token) {
        setErrorText("Token não encontrado. Faça login novamente.");
        return;
      }

      if (!sessionId.trim()) {
        setErrorText("Informe um session_id válido.");
        return;
      }

      if (!WS_BASE_URL) {
        setErrorText("VITE_WS_URL não configurado.");
        return;
      }

      wsRef.current?.disconnect();

      wsRef.current = new WebSocketService(
        wsUrl,
        (status) => setWsStatus(status),
        (msg) => setLastMessage(msg)
      );

      wsRef.current.connect();
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Erro ao conectar no WebSocket.");
      setWsStatus("error");
    }
  };

  const handleDisconnect = () => {
    wsRef.current?.disconnect();
    wsRef.current = null;
    setWsStatus("disconnected");
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6">
      <main className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Sessão de teste do paciente</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Aqui vamos validar a autenticação e a conexão WebSocket antes de integrar a câmera.
              </p>
            </div>

            <button
              onClick={() => navigate("/dashboard-x")}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium hover:bg-muted/50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Dados da sessão</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Usuário</p>
                <p className="font-medium">{me?.name || me?.email || "Não identificado"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium">{me?.role || "-"}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Session ID</label>
                <input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
                  placeholder="Digite um session_id real"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">URL WS montada</p>
                <p className="break-all rounded-xl bg-background/70 p-3 text-xs">
                  {wsUrl || "Preencha token/session_id e VITE_WS_URL"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-sm font-semibold tracking-tight">Status da conexão</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                <span className="font-medium capitalize">{wsStatus}</span>
              </div>

              {errorText && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {errorText}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleConnect}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                >
                  <PlugZap className="h-4 w-4" />
                  Conectar WS
                </button>

                <button
                  onClick={handleDisconnect}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
                >
                  <Unplug className="h-4 w-4" />
                  Desconectar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold tracking-tight">Última mensagem recebida</h2>
          <div className="mt-4 rounded-xl bg-background/70 p-4 text-xs">
            <pre className="whitespace-pre-wrap break-words">
              {lastMessage ? JSON.stringify(lastMessage, null, 2) : "Nenhuma mensagem recebida ainda."}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}