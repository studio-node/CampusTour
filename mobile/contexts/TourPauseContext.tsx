import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { appStateManager } from '@/services/appStateManager';

type TourPauseContextValue = {
  tourPaused: boolean;
  tourFinished: boolean;
  setTourPaused: (paused: boolean) => Promise<void>;
  /** Sync paused + finished flags from persisted app state (call after load/reset). */
  syncTourPausedFromStorage: () => void;
  markTourFinished: (finished: boolean) => Promise<void>;
};

const TourPauseContext = createContext<TourPauseContextValue | null>(null);

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

  const markTourFinished = useCallback(async (finished: boolean) => {
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
