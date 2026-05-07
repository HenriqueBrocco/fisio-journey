/**
 * useCameraStream.ts
 *
 * Hook responsável por:
 *  - abrir a webcam via getUserMedia
 *  - capturar frames em um canvas oculto em intervalo controlado
 *  - comprimir frames como JPEG e enviar via WebSocket
 *  - gerenciar todos os estados da câmera e do WebSocket
 *  - fazer cleanup completo ao desmontar
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { WebSocketService, WsMessage, WsStatus } from "@/services/websocketService";

// ─── Tipos públicos exportados para o componente ────────────────────────────

export type CameraStatus =
  | "idle"          // câmera ainda não iniciada
  | "requesting"    // aguardando permissão do usuário
  | "active"        // câmera ativa e transmitindo
  | "permission-denied" // usuário recusou a câmera
  | "error";        // outro erro de câmera

export type StreamState = {
  cameraStatus: CameraStatus;
  wsStatus: WsStatus;
  lastMessage: WsMessage | null;
  frameCount: number;
};

type UseCameraStreamOptions = {
  /** URL do WebSocket (padrão: VITE_WS_URL + /ws/camera) */
  wsUrl?: string;
  /** Frames por segundo enviados (padrão: 8) */
  fps?: number;
  /** Largura do frame capturado (padrão: 640) */
  width?: number;
  /** Altura do frame capturado (padrão: 480) */
  height?: number;
  /** Qualidade JPEG 0–1 (padrão: 0.6) */
  jpegQuality?: number;
};

type UseCameraStreamReturn = StreamState & {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  start: () => Promise<void>;
  stop: () => void;
};

// ─── Hook ───────────────────────────────────────────────────────────────────

const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";

export function useCameraStream(options: UseCameraStreamOptions = {}): UseCameraStreamReturn {
  const {
    wsUrl = `${WS_BASE}/ws/camera`,
    fps = 8,
    width = 640,
    height = 480,
    jpegQuality = 0.6,
  } = options;

  // Refs de DOM (passados ao componente de vídeo)
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs internas (não causam re-render)
  const streamRef = useRef<MediaStream | null>(null);
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado observável pelo componente
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const [frameCount, setFrameCount] = useState(0);

  // ── Captura e envio de um único frame ─────────────────────────────────────
  const captureAndSend = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    if (!wsServiceRef.current?.isConnected) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    // toBlob é async mas sem await — o closure captura o wsService atual
    canvas.toBlob(
      (blob) => {
        if (blob) {
          wsServiceRef.current?.sendFrame(blob);
          setFrameCount((c) => c + 1);
        }
      },
      "image/jpeg",
      jpegQuality
    );
  }, [width, height, jpegQuality]);

  // ── Iniciar câmera + WebSocket ─────────────────────────────────────────────
  const start = useCallback(async () => {
    // Evita dupla inicialização
    if (cameraStatus === "active" || cameraStatus === "requesting") return;

    setCameraStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width, height, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraStatus("active");

      // Configura canvas com a resolução escolhida
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }

      // Instancia e conecta o WebSocket
      const wsService = new WebSocketService(
        wsUrl,
        setWsStatus,
        setLastMessage
      );
      wsServiceRef.current = wsService;
      wsService.connect();

      // Inicia o loop de captura de frames
      const intervalMs = Math.round(1000 / fps);
      intervalRef.current = setInterval(captureAndSend, intervalMs);
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");

      setCameraStatus(isDenied ? "permission-denied" : "error");
      console.error("[useCameraStream] Erro ao abrir câmera:", err);
    }
  }, [cameraStatus, wsUrl, fps, width, height, captureAndSend]);

  // ── Parar câmera + WebSocket ───────────────────────────────────────────────
  const stop = useCallback(() => {
    // Para o loop de captura
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Para todos os tracks da câmera
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Fecha o WebSocket
    wsServiceRef.current?.disconnect();
    wsServiceRef.current = null;

    // Limpa o vídeo
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus("idle");
    setWsStatus("disconnected");
    setFrameCount(0);
  }, []);

  // ── Cleanup ao desmontar o componente ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      wsServiceRef.current?.disconnect();
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    cameraStatus,
    wsStatus,
    lastMessage,
    frameCount,
    start,
    stop,
  };
}