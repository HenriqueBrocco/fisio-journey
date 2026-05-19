/**
 * CameraStream.tsx
 *
 * Componente reutilizável de captura e transmissão de webcam.
 * Exibe o preview ao vivo, controles de start/stop e feedback de status.
 * Não contém lógica de visão computacional — apenas captura e transmite.
 */
import { getToken } from "@/lib/storage";
import { useCameraStream } from "@/hooks/useCameraStream";
import { cn } from "@/lib/utils";
import { Camera, CameraOff, Loader2, Radio, Wifi, WifiOff } from "lucide-react";

// ─── Indicador de status da câmera ──────────────────────────────────────────

const WS_BASE_URL = (import.meta.env.VITE_WS_URL || "").replace(/\/$/, "");

const CAMERA_LABELS: Record<string, string> = {
  idle: "Câmera inativa",
  requesting: "Solicitando permissão…",
  active: "Câmera ativa",
  "permission-denied": "Permissão negada",
  error: "Erro na câmera",
};

const WS_LABELS: Record<string, string> = {
  disconnected: "Desconectado",
  connecting: "Conectando…",
  connected: "Transmitindo",
  error: "Erro de conexão",
};

// ─── Componente principal ────────────────────────────────────────────────────

interface CameraStreamProps {
  className?: string;
  fps?: number;
  width?: number;
  height?: number;
  sessionId: string;
}

function buildWsUrl(sessionId: string, token: string) {
  return `${WS_BASE_URL}/v1/infer/ws/session/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
}

export function CameraStream({ className, fps = 8, width = 640, height = 480, sessionId }: CameraStreamProps) {
  const token = getToken() || "";
  const wsUrl = buildWsUrl(sessionId, token);

  const {
    videoRef,
    canvasRef,
    cameraStatus,
    wsStatus,
    lastMessage,
    frameCount,
    start,
    stop,
  } = useCameraStream({ wsUrl, fps, width, height });

  const isActive = cameraStatus === "active";
  const isLoading = cameraStatus === "requesting";
  const hasError = cameraStatus === "error" || cameraStatus === "permission-denied";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* ── Preview da câmera ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-black aspect-video w-full max-w-xl mx-auto border border-border/60 shadow-sm">

        {/* Vídeo ao vivo */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            isActive ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Canvas oculto: só para captura dos frames, nunca exibido */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay: câmera inativa */}
        {!isActive && !isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <CameraOff className="h-10 w-10 opacity-40" />
            <span className="text-sm">Clique em "Iniciar" para ativar a câmera</span>
          </div>
        )}

        {/* Overlay: carregando */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Aguardando permissão da câmera…</span>
          </div>
        )}

        {/* Overlay: erro */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-destructive">
            <CameraOff className="h-10 w-10" />
            <span className="text-sm font-medium">{CAMERA_LABELS[cameraStatus]}</span>
            {cameraStatus === "permission-denied" && (
              <span className="text-xs text-muted-foreground px-6 text-center">
                Permita o acesso à câmera nas configurações do navegador e tente novamente.
              </span>
            )}
          </div>
        )}

        {/* Badge de transmissão ao vivo */}
        {isActive && wsStatus === "connected" && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            AO VIVO
          </div>
        )}

        {/* FPS / frame count no canto */}
        {isActive && (
          <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white/70 backdrop-blur font-mono">
            {frameCount} frames · {fps} fps
          </div>
        )}
      </div>

      {/* ── Controles ─────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3">
        {!isActive ? (
          <button
            onClick={start}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-button hover:opacity-90 disabled:opacity-50 transition"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {isLoading ? "Iniciando…" : "Iniciar câmera"}
          </button>
        ) : (
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-5 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
          >
            <CameraOff className="h-4 w-4" />
            Parar câmera
          </button>
        )}
      </div>

      {/* ── Status bar ────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-xl items-center justify-between rounded-xl border border-border/60 bg-card/80 px-4 py-2.5 text-xs backdrop-blur">
        {/* Status câmera */}
        <div className="flex items-center gap-1.5">
          <Camera className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn(
            "font-medium",
            isActive && "text-emerald-500",
            hasError && "text-destructive",
            (cameraStatus === "idle" || cameraStatus === "requesting") && "text-muted-foreground"
          )}>
            {CAMERA_LABELS[cameraStatus]}
          </span>
        </div>

        {/* Status WebSocket */}
        <div className="flex items-center gap-1.5">
          {wsStatus === "connected" ? (
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
          ) : wsStatus === "connecting" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
          ) : wsStatus === "error" ? (
            <WifiOff className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            "font-medium",
            wsStatus === "connected" && "text-emerald-500",
            wsStatus === "connecting" && "text-amber-500",
            wsStatus === "error" && "text-destructive",
            wsStatus === "disconnected" && "text-muted-foreground"
          )}>
            {WS_LABELS[wsStatus]}
          </span>
        </div>

        {/* Último frame confirmado pelo backend */}
        {lastMessage?.status === "ok" && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <span>Backend: {lastMessage.width}×{lastMessage.height}</span>
          </div>
        )}

        {lastMessage && (
          <div className="mx-auto w-full max-w-xl rounded-xl border border-border/60 bg-card/80 p-3 text-xs backdrop-blur">
            <p className="mb-2 font-medium">Última mensagem (WS)</p>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(lastMessage, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraStream;