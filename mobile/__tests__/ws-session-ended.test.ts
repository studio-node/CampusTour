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

describe('wsManager when the server ends the session', () => {
  let lastSocket: MockWebSocket;
  let socketCount: number;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.resetModules();
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

  it('does not reconnect or replay join_session after session_ended', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');
    const onEnded = jest.fn();
    wsManager.on('session_ended', onEnded);

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();
    wsManager.send('join_session', { tourId: 't-1', leadId: 'lead-1' });

    lastSocket.onmessage?.({
      data: JSON.stringify({ type: 'session_ended', payload: { tourId: 't-1', message: 'Ended.' } }),
    });

    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(lastSocket.close).toHaveBeenCalled();
    jest.advanceTimersByTime(60000);
    expect(socketCount).toBe(1);

    // A later connect (e.g. joining another tour) must not resend the ended tour's join.
    wsManager.connect();
    expect(socketCount).toBe(2);
    lastSocket.onopen?.();
    await flushAsync();
    expect(lastSocket.send).not.toHaveBeenCalled();
  });

  it('still reconnects after an unexpected drop once a new session starts', async () => {
    const { wsManager } = require('@/services/ws') as typeof import('@/services/ws');

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();
    lastSocket.onmessage?.({ data: JSON.stringify({ type: 'tour_ended_confirmation', payload: {} }) });

    wsManager.connect();
    lastSocket.onopen?.();
    await flushAsync();
    wsManager.send('join_session', { tourId: 't-2', leadId: 'lead-2' });

    lastSocket.onclose?.();
    jest.advanceTimersByTime(1000);
    expect(socketCount).toBe(3);
    lastSocket.onopen?.();
    await flushAsync();
    expect(lastSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'join_session', payload: { tourId: 't-2', leadId: 'lead-2' } })
    );
  });
});
