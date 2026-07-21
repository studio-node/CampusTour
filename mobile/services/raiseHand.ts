import { tourGroupSelectionService } from '@/services/supabase';
import { wsManager } from '@/services/ws';

const RAISE_HAND_OPEN_TIMEOUT_MS = 5000;

/**
 * Notifies the ambassador that a member raised their hand.
 *
 * Resolves { ok: true } only once the ping has actually been sent (socket open), and
 * { ok: false } if there's no active session or the socket doesn't open within the timeout.
 * This replaces the previous copy-pasted call sites that (a) leaked an 'open' listener when
 * the socket never opened and (b) showed a success alert before anything was sent.
 */
export async function raiseHand(): Promise<{ ok: boolean; error?: string }> {
  const tourId = await tourGroupSelectionService.getSelectedTourGroup();
  if (!tourId) {
    return { ok: false, error: 'No active tour session found.' };
  }

  if (wsManager.getStatus() === 'open') {
    wsManager.send('ambassador:ping', { tourId });
    return { ok: true };
  }

  return new Promise((resolve) => {
    let settled = false;
    const onOpen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      wsManager.send('ambassador:ping', { tourId });
      resolve({ ok: true });
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      wsManager.off('open', onOpen);
      resolve({ ok: false, error: 'Could not reach the tour session. Please try again.' });
    }, RAISE_HAND_OPEN_TIMEOUT_MS);

    wsManager.once('open', onOpen);
    wsManager.connect();
  });
}
