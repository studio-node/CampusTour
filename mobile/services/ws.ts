import EventEmitter from 'eventemitter3';
import { authService } from '@/services/supabase';

type WebSocketMessage = {
  type: string;
  payload?: any;
  [key: string]: any;
};

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

// WS endpoint from .env (EXPO_PUBLIC_WS_URL), falling back to the backend URL
// (EXPO_PUBLIC_BACKEND_URL) with the scheme swapped to ws(s).
function resolveWsUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_WS_URL?.trim();
  if (explicit) return explicit;
  const backend = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (backend) return backend.replace(/^http/, 'ws');
  return 'wss://campustourbackend.onrender.com';
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private emitter = new EventEmitter();
  private status: ConnectionStatus = 'idle';
  private url = resolveWsUrl();
  private shouldAuthenticate = false;
  private pendingMessages: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  // Last create_session / join_session sent, replayed after a reconnect so the
  // server re-adds this socket to the session (server state is per-connection).
  private lastSessionMessage: WebSocketMessage | null = null;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  connect(url?: string) {
    if (this.socket && (this.status === 'open' || this.status === 'connecting')) {
      return;
    }
    if (url) this.url = url;
    this.intentionalClose = false;
    this.clearReconnectTimer();
    this.status = 'connecting';
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.status = 'open';
      const isReconnect = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      void this.onSocketOpen(isReconnect);
    };

    this.socket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket Message:', JSON.stringify(data, null, 2));
        // Emit by specific type and a generic message event
        if (data?.type) {
          this.emitter.emit(data.type, data);
        }
        this.emitter.emit('message', data);
      } catch (e) {
        this.emitter.emit('error', e);
      }
    };

    this.socket.onerror = (e) => {
      this.status = 'error';
      this.emitter.emit('error', e);
    };

    this.socket.onclose = () => {
      this.status = 'closed';
      this.socket = null;
      this.emitter.emit('close');
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };
  }

  private async onSocketOpen(isReconnect: boolean) {
    // Order matters: authenticate first so the server attaches the verified user
    // before any session message is processed, then rejoin, then flush queued sends.
    if (this.shouldAuthenticate) {
      await this.sendAuth();
    }
    if (isReconnect && this.lastSessionMessage) {
      this.sendRaw(this.lastSessionMessage);
      this.emitter.emit('reconnected');
    }
    this.flushPending();
    this.emitter.emit('open');
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS
    );
    this.reconnectAttempts += 1;
    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  close() {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.pendingMessages = [];
    this.lastSessionMessage = null;
    this.shouldAuthenticate = false;
    this.reconnectAttempts = 0;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.status = 'closed';
    }
  }

  // Sends the current Supabase access token to the server for verification.
  // The token is fetched fresh each time (also on every reconnect) so it never goes stale.
  async authenticate() {
    this.shouldAuthenticate = true;
    if (this.status === 'open') {
      await this.sendAuth();
    } else {
      this.connect();
    }
  }

  private async sendAuth() {
    try {
      const session = await authService.getCurrentSession();
      const token = session?.access_token;
      if (token && this.socket && this.status === 'open') {
        this.socket.send(JSON.stringify({ type: 'auth', payload: { token } }));
      }
    } catch (e) {
      console.error('WebSocket auth failed to fetch session');
      this.emitter.emit('error', e);
    }
  }

  send(type: string, payload?: any) {
    const message: WebSocketMessage = { type, payload };
    if (type === 'create_session' || type === 'join_session') {
      this.lastSessionMessage = message;
    }
    if (this.socket && this.status === 'open') {
      this.sendRaw(message);
    } else {
      this.pendingMessages.push(message);
      this.connect();
    }
  }

  private sendRaw(message: WebSocketMessage) {
    this.socket?.send(JSON.stringify(message));
  }

  private flushPending() {
    const queued = this.pendingMessages;
    this.pendingMessages = [];
    for (const message of queued) {
      this.sendRaw(message);
    }
  }

  on(eventType: string, listener: (data?: any) => void) {
    this.emitter.on(eventType, listener);
  }

  off(eventType: string, listener: (data?: any) => void) {
    this.emitter.off(eventType, listener);
  }
}

export const wsManager = WebSocketManager.getInstance();
