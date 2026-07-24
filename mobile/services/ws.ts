import EventEmitter from 'eventemitter3';
import { authService } from '@/services/supabase';
import { WS_URL } from '@/services/config';

type WebSocketMessage = {
  type: string;
  payload?: any;
  [key: string]: any;
};

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

// Heartbeat: on a phone walking across campus, a socket can go half-dead without ever
// firing a 'close' event. We ping periodically and, if no message of any kind arrives
// within the dead-connection window, force-close to trigger the existing reconnect path.
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_DEAD_MS = 45000;

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private emitter = new EventEmitter();
  private status: ConnectionStatus = 'idle';
  private url = WS_URL;
  private shouldAuthenticate = false;
  /** Whether an auth message was successfully sent on the current connection. */
  private authSent = false;
  private pendingMessages: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = 0;
  private intentionalClose = false;
  private authRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private authRetryAttempts = 0;
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
    if (!this.url) {
      console.error('WebSocket connect skipped: no WS URL configured (EXPO_PUBLIC_WS_URL / EXPO_PUBLIC_BACKEND_URL).');
      return;
    }
    this.intentionalClose = false;
    this.authSent = false;
    this.clearReconnectTimer();
    this.status = 'connecting';
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.status = 'open';
      const isReconnect = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      void this.onSocketOpen(isReconnect);
    };

    this.socket.onmessage = (event) => {
      this.recordActivity();
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        // 'pong' is a heartbeat reply — recording activity above is enough; don't emit it.
        if (data?.type === 'pong') return;
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
      this.authSent = false;
      this.stopHeartbeat();
      // A full reconnect re-authenticates via onSocketOpen; don't let a stale
      // auth-retry timer fire concurrently and race it.
      this.clearAuthRetryTimer();
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
      const authed = await this.sendAuth();
      if (!authed) {
        // Don't replay session messages or flush pending sends as an unauthenticated
        // socket — the server would see an unauthenticated ambassador. Surface the failure
        // and self-schedule a retry rather than relying on callers to react to the event.
        this.emitter.emit('auth_failed');
        this.scheduleAuthRetry();
        return;
      }
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

  // Auth can fail transiently (token not refreshed yet, brief network hiccup). Without
  // this, 'auth_failed' was a dead end — nothing in the app ever listened for it, so a
  // failed auth just sat there until something unrelated (like a socket drop) happened
  // to trigger a reconnect.
  private scheduleAuthRetry() {
    if (this.authRetryTimer || this.intentionalClose || !this.shouldAuthenticate) return;
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.authRetryAttempts,
      RECONNECT_MAX_DELAY_MS
    );
    this.authRetryAttempts += 1;
    this.authRetryTimer = setTimeout(() => {
      this.authRetryTimer = null;
      if (this.shouldAuthenticate && !this.authSent) {
        void this.authenticate();
      }
    }, delay);
  }

  private clearAuthRetryTimer() {
    if (this.authRetryTimer) {
      clearTimeout(this.authRetryTimer);
      this.authRetryTimer = null;
    }
    this.authRetryAttempts = 0;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.recordActivity();
    this.heartbeatTimer = setInterval(() => {
      if (this.status !== 'open' || !this.socket) return;
      // No traffic within the dead-connection window → the socket is likely half-open.
      // Close it to trigger onclose → scheduleReconnect rather than broadcasting into a
      // dead connection.
      if (Date.now() - this.lastActivityAt > HEARTBEAT_DEAD_MS) {
        console.log('WebSocket heartbeat: no activity, forcing reconnect');
        this.socket.close();
        return;
      }
      this.sendRaw({ type: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
    // Don't let the heartbeat keep a Node event loop alive (e.g. under Jest). No-op in RN.
    (this.heartbeatTimer as unknown as { unref?: () => void })?.unref?.();
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private recordActivity() {
    this.lastActivityAt = Date.now();
  }

  close() {
    this.intentionalClose = true;
    this.clearReconnectTimer();
    this.clearAuthRetryTimer();
    this.stopHeartbeat();
    this.pendingMessages = [];
    this.lastSessionMessage = null;
    this.shouldAuthenticate = false;
    this.authSent = false;
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
      const authed = await this.sendAuth();
      if (authed) {
        // The socket was already open (no 'open' event will fire to trigger
        // onSocketOpen's flush), so flush here or queued sends would sit forever.
        this.flushPending();
      } else {
        this.emitter.emit('auth_failed');
        this.scheduleAuthRetry();
      }
    } else {
      this.connect();
    }
  }

  // Returns true if an auth message was sent, false if there was no token / send failed.
  private async sendAuth(): Promise<boolean> {
    try {
      const session = await authService.getCurrentSession();
      const token = session?.access_token;
      if (!token) {
        console.error('WebSocket auth: no Supabase session token available.');
        this.authSent = false;
        return false;
      }
      if (this.socket && this.status === 'open') {
        this.socket.send(JSON.stringify({ type: 'auth', payload: { token } }));
        this.authSent = true;
        this.clearAuthRetryTimer();
        return true;
      }
      return false;
    } catch (e) {
      console.error('WebSocket auth failed to fetch session');
      this.authSent = false;
      this.emitter.emit('error', e);
      return false;
    }
  }

  send(type: string, payload?: any) {
    const message: WebSocketMessage = { type, payload };
    if (type === 'create_session' || type === 'join_session') {
      this.lastSessionMessage = message;
    }
    // Same gate as flushPending(): never let a message escape on a socket that's
    // supposed to be authenticated but hasn't sent 'auth' yet (this used to be
    // bypassed here, letting e.g. create_session reach the server unauthenticated
    // while sendAuth()'s async token fetch was still in flight).
    const authGateOpen = !this.shouldAuthenticate || this.authSent;
    if (this.socket && this.status === 'open' && authGateOpen) {
      this.sendRaw(message);
    } else {
      this.pendingMessages.push(message);
      this.connect();
    }
  }

  /**
   * Sends a message once the socket is open, using a one-shot 'open' listener so it does
   * NOT re-fire on every reconnect (the leak that stacked duplicate session/raise-hand
   * senders). If already open, sends immediately.
   */
  sendWhenOpen(type: string, payload?: any) {
    if (this.status === 'open') {
      this.send(type, payload);
      return;
    }
    this.once('open', () => this.send(type, payload));
    this.connect();
  }

  private sendRaw(message: WebSocketMessage) {
    this.socket?.send(JSON.stringify(message));
  }

  private flushPending() {
    // Never flush as an unauthenticated socket when auth is required.
    if (this.shouldAuthenticate && !this.authSent) {
      return;
    }
    const queued = this.pendingMessages;
    this.pendingMessages = [];
    for (const message of queued) {
      this.sendRaw(message);
    }
  }

  on(eventType: string, listener: (data?: any) => void) {
    this.emitter.on(eventType, listener);
  }

  once(eventType: string, listener: (data?: any) => void) {
    this.emitter.once(eventType, listener);
  }

  off(eventType: string, listener: (data?: any) => void) {
    this.emitter.off(eventType, listener);
  }
}

export const wsManager = WebSocketManager.getInstance();
