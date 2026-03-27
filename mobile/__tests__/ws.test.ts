class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
  }
}

describe('wsManager', () => {
  let lastSocket: MockWebSocket;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.resetModules();
    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      lastSocket = new MockWebSocket(url);
      return lastSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;
  });

  it('connects, opens, and emits typed events for JSON messages', () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    const onPing = jest.fn();
    wsManager.on('ping', onPing);

    wsManager.connect('wss://example.test/ws');
    expect(wsManager.getStatus()).toBe('connecting');

    lastSocket.onopen?.();
    expect(wsManager.getStatus()).toBe('open');

    lastSocket.onmessage?.({
      data: JSON.stringify({ type: 'ping', payload: { n: 1 } }),
    });

    expect(onPing).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ping', payload: { n: 1 } })
    );
  });

  it('emits error when message JSON is invalid', () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    const onErr = jest.fn();
    wsManager.on('error', onErr);

    wsManager.connect();
    lastSocket.onopen?.();
    lastSocket.onmessage?.({ data: 'not-json' });

    expect(onErr).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
