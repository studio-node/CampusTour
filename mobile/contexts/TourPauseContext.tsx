import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { appStateManager } from '@/services/appStateManager';
import { tourGroupSelectionService, userTypeService } from '@/services/supabase';
import { wsManager } from '@/services/ws';

type TourPauseContextValue = {
  tourPaused: boolean;
  tourFinished: boolean;
  setTourPaused: (paused: boolean) => Promise<void>;
  /** Sync paused + finished flags from persisted app state (call after load/reset). */
  syncTourPausedFromStorage: () => void;
  markTourFinished: (finished: boolean) => Promise<void>;
};

const TourPauseContext = createContext<TourPauseContextValue | null>(null);

// When the ambassador finishes, the live session ends for the whole group too.
async function endLiveSessionIfAmbassador() {
  if ((await userTypeService.getUserType()) !== 'ambassador') return;
  const tourId = await tourGroupSelectionService.getSelectedTourGroup();
  if (tourId) wsManager.send('tour:end', { tourId });
}

export function TourPauseProvider({ children }: { children: React.ReactNode }) {
  const [tourPaused, setTourPausedState] = useState(false);
  const [tourFinished, setTourFinishedState] = useState(false);

  const syncTourPausedFromStorage = useCallback(() => {
    const s = appStateManager.getCurrentState();
    setTourPausedState(!!s?.tourState?.tourPaused);
    setTourFinishedState(!!s?.tourState?.tourFinished);
  }, []);

  useEffect(() => {
    syncTourPausedFromStorage();
  }, [syncTourPausedFromStorage]);

  const setTourPaused = useCallback(async (paused: boolean) => {
    const s = appStateManager.getCurrentState();
    if (!s) {
      setTourPausedState(paused);
      return;
    }
    appStateManager.updateState({
      tourState: {
        ...s.tourState,
        tourPaused: paused,
      },
    });
    await appStateManager.saveCurrentState();
    setTourPausedState(paused);
  }, []);

  const persistTourFinished = useCallback(async (finished: boolean) => {
    const s = appStateManager.getCurrentState();
    if (!s) {
      setTourFinishedState(finished);
      return;
    }
    appStateManager.updateState({
      tourState: {
        ...s.tourState,
        tourFinished: finished,
      },
    });
    await appStateManager.saveCurrentState();
    setTourFinishedState(finished);
  }, []);

  const markTourFinished = useCallback(async (finished: boolean) => {
    await persistTourFinished(finished);
    if (finished) await endLiveSessionIfAmbassador();
  }, [persistTourFinished]);

  // The server ended the session (ambassador ended it, or it timed out). The session is already
  // gone, so only update local state.
  useEffect(() => {
    const onSessionEnded = (msg?: { payload?: { message?: string } }) => {
      void persistTourFinished(true);
      Alert.alert('Tour Ended', msg?.payload?.message || 'This tour has ended.');
    };
    wsManager.on('session_ended', onSessionEnded);
    return () => wsManager.off('session_ended', onSessionEnded);
  }, [persistTourFinished]);

  const value = useMemo(
    () => ({
      tourPaused,
      tourFinished,
      setTourPaused,
      syncTourPausedFromStorage,
      markTourFinished,
    }),
    [tourPaused, tourFinished, setTourPaused, syncTourPausedFromStorage, markTourFinished]
  );

  return (
    <TourPauseContext.Provider value={value}>{children}</TourPauseContext.Provider>
  );
}

export function useTourPause(): TourPauseContextValue {
  const ctx = useContext(TourPauseContext);
  if (!ctx) {
    throw new Error('useTourPause must be used within TourPauseProvider');
  }
  return ctx;
}
