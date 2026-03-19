import { EventEmitter } from 'node:events';

export class FakeWs extends EventEmitter {
  constructor() {
    super();
    this.readyState = 1; // WebSocket.OPEN
    this.sentMessages = [];
    this.closed = false;
  }

  send(payload) {
    this.sentMessages.push(JSON.parse(payload));
  }

  close() {
    this.closed = true;
    this.readyState = 3; // WebSocket.CLOSED
    this.emit('close');
  }
}

export function emitClientMessage(ws, message) {
  ws.emit('message', JSON.stringify(message));
}

export async function flushAsync() {
  await new Promise((resolve) => setImmediate(resolve));
}
