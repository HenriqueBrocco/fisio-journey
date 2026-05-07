/**
 * websocketService.ts
 *
 * Abstração simples de WebSocket para envio de frames binários.
 * O front-end só precisa saber: conectar, enviar, receber, fechar.
 * Toda a lógica de visão computacional fica no backend Python.
 */

export type WsStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type WsMessage = {
  status: string;
  width?: number;
  height?: number;
  landmarks?: unknown;   // futuro: MediaPipe / OpenPose
  angles?: unknown;      // futuro: ângulos articulares
  feedback?: string;     // futuro: feedback de execução
  reps?: number;         // futuro: contagem de repetições
};

type StatusCallback = (status: WsStatus) => void;
type MessageCallback = (msg: WsMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private onStatusChange: StatusCallback;
  private onMessage: MessageCallback;

  constructor(url: string, onStatusChange: StatusCallback, onMessage: MessageCallback) {
    this.url = url;
    this.onStatusChange = onStatusChange;
    this.onMessage = onMessage;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.onStatusChange("connecting");
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.onStatusChange("connected");
    };

    this.ws.onclose = () => {
      this.onStatusChange("disconnected");
      this.ws = null;
    };

    this.ws.onerror = () => {
      this.onStatusChange("error");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        this.onMessage(msg);
      } catch {
        // ignora mensagens malformadas
      }
    };
  }

  /** Envia um frame JPEG como blob binário */
  sendFrame(blob: Blob): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(blob);
  }

  /** Fecha a conexão de forma limpa */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}