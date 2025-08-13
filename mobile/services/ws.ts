import EventEmitter from 'eventemitter3';

type WebSocketMessage = {
  type: string;
  payload?: any;
  [key: string]: any;
};

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private emitter = new EventEmitter();
  private status: ConnectionStatus = 'idle';
  private url = 'wss://campustourbackend.onrender.com';
  private ambassadorId: string | null = null;

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
    this.status = 'connecting';
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.status = 'open';
      this.emitter.emit('open');
      if (this.ambassadorId) {
        this.authenticate(this.ambassadorId);
      }
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
      this.emitter.emit('close');
      this.socket = null;
    };
  }

  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.status = 'closed';
    }
  }

  authenticate(ambassadorId: string) {
    this.ambassadorId = ambassadorId;
    this.send('auth', { sub: ambassadorId });
  }

  send(type: string, payload?: any) {
    const message: WebSocketMessage = { type, payload };
    if (this.socket && this.status === 'open') {
      this.socket.send(JSON.stringify(message));
    } else {
      // queue by attempting connection then sending after open
      if (!this.socket) this.connect();
      const onOpen = () => {
        this.socket?.send(JSON.stringify(message));
        this.emitter.off('open', onOpen);
      };
      this.emitter.on('open', onOpen);
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


