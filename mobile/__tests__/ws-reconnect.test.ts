jest.mock('@/services/supabase', () => ({
  authService: {
    getCurrentSession: jest.fn(async () => ({ access_token: 'test-access-token' })),
  },
}));

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

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('wsManager reconnect behavior', () => {
  let lastSocket: MockWebSocket;
  let socketCount: number;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.resetModules();
    // Keep setImmediate real so flushAsync can drain microtasks under fake timers.
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    socketCount = 0;
    global.WebSocket = jest.fn().mockImplementation((url: string) => {
      socketCount += 1;
      lastSocket = new MockWebSocket(url);
      return lastSocket as unknown as WebSocket;
    }) as unknown as typeof WebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('queues sends made before the socket opens and flushes them on open', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    wsManager.send('get_members_snapshot', { tourId: 't-1' });
    expect(lastSocket.send).not.toHaveBeenCalled();

    lastSocket.onopen?.();
    await flushAsync();

    expect(lastSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'get_members_snapshot', payload: { tourId: 't-1' } })
    );
  });

  it('reconnects with backoff after an unexpected close and replays the last session message', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();

    wsManager.send('join_session', { tourId: 't-1', leadId: 'lead-1' });
    const firstSocket = lastSocket;

    // Unexpected drop -> a reconnect should be scheduled.
    firstSocket.onclose?.();
    expect(socketCount).toBe(1);
    jest.advanceTimersByTime(1000);
    expect(socketCount).toBe(2);

    lastSocket.onopen?.();
    await flushAsync();

    // The join_session is replayed on the new socket so the server re-adds us.
    expect(lastSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'join_session', payload: { tourId: 't-1', leadId: 'lead-1' } })
    );
  });

  it('does not reconnect after an intentional close', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();

    wsManager.close();
    jest.advanceTimersByTime(60000);
    expect(socketCount).toBe(1);
  });

  it('sends the fetched access token when authenticating', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();

    await wsManager.authenticate();

    expect(lastSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth', payload: { token: 'test-access-token' } })
    );
  });

  it('re-authenticates automatically after a reconnect', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();
    await wsManager.authenticate();

    lastSocket.onclose?.();
    jest.advanceTimersByTime(1000);
    lastSocket.onopen?.();
    await flushAsync();

    expect(lastSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'auth', payload: { token: 'test-access-token' } })
    );
  });
});
