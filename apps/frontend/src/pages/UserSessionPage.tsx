import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/storage";
import { WebSocketService, WsMessage, WsStatus } from "@/services/websocketService";
import { ArrowLeft, Camera, PlugZap, Square, Unplug, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";

const WS_BASE_URL = (import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");

function buildWsUrl(sessionId: string, token: string) {
  return `${WS_BASE_URL}/v1/infer/ws/session/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
}

export default function UserSessionPage() {
  const navigate = useNavigate();
  const { me } = useAuth();

  const token = getToken() || "";
  const [sessionId, setSessionId] = useState("");
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WsMessage | Record<string, unknown> | null>(null);
  const [errorText, setErrorText] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [sending, setSending] = useState(false);

  const wsRef = useRef<WebSocketService | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendIntervalRef = useRef<number | null>(null);

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
    stopSendingFrames();
    wsRef.current?.disconnect();
    wsRef.current = null;
    setWsStatus("disconnected");
  };

  const startCamera = async () => {
    try {
      setErrorText("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Erro ao abrir câmera.");
    }
  };

  const stopCamera = () => {
    stopSendingFrames();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
  };

  const captureAndSendFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current?.isConnected) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        wsRef.current?.sendFrame(blob);
      },
      "image/jpeg",
      0.8
    );
  };

  const startSendingFrames = () => {
    if (!cameraOn) {
      setErrorText("Ligue a câmera antes de enviar frames.");
      return;
    }

    if (!wsRef.current?.isConnected) {
      setErrorText("Conecte o WebSocket antes de enviar frames.");
      return;
    }

    stopSendingFrames();

    sendIntervalRef.current = window.setInterval(() => {
      captureAndSendFrame();
    }, 250); // ~4 fps para teste inicial

    setSending(true);
  };

  const stopSendingFrames = () => {
    if (sendIntervalRef.current !== null) {
      window.clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    setSending(false);
  };

  useEffect(() => {
    return () => {
      stopSendingFrames();
      stopCamera();
      wsRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6">
      <main className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Sessão de teste do paciente</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Agora vamos validar câmera + envio de frames JPEG para o WebSocket.
              </p>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
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

              <div className="flex flex-wrap gap-3">
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Câmera</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ligue a câmera e envie frames em JPEG para o backend.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {!cameraOn ? (
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
                >
                  <Camera className="h-4 w-4" />
                  Ligar câmera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
                >
                  <Square className="h-4 w-4" />
                  Desligar câmera
                </button>
              )}

              {!sending ? (
                <button
                  onClick={startSendingFrames}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white"
                >
                  Enviar frames
                </button>
              ) : (
                <button
                  onClick={stopSendingFrames}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm text-white"
                >
                  Parar envio
                </button>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-auto w-full" />
          </div>

          <canvas ref={canvasRef} className="hidden" />
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