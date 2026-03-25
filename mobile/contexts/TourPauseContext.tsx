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
  setTourPaused: (paused: boolean) => Promise<void>;
  syncTourPausedFromStorage: () => void;
};

const TourPauseContext = createContext<TourPauseContextValue | null>(null);

export function TourPauseProvider({ children }: { children: React.ReactNode }) {
  const [tourPaused, setTourPausedState] = useState(false);

  const syncTourPausedFromStorage = useCallback(() => {
    const s = appStateManager.getCurrentState();
    setTourPausedState(!!s?.tourState?.tourPaused);
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

  const value = useMemo(
    () => ({ tourPaused, setTourPaused, syncTourPausedFromStorage }),
    [tourPaused, setTourPaused, syncTourPausedFromStorage]
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
