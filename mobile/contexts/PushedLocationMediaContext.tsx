import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { wsManager } from '@/services/ws';
import { userTypeService } from '@/services/supabase';

export interface PushedMediaItem {
  id: string;
  name?: string;
  media_type: string;
  url: string;
}

type PushedByLocation = Record<string, PushedMediaItem[]>;

interface PushedLocationMediaContextType {
  pushedByLocation: PushedByLocation;
  addMediaToLocation: (locationId: string, media: PushedMediaItem) => void;
  getPushedMedia: (locationId: string) => PushedMediaItem[];
  takeoverVisible: boolean;
  takeoverMedia: PushedMediaItem | null;
  closeTakeover: () => void;
}

const PushedLocationMediaContext = createContext<PushedLocationMediaContextType | undefined>(undefined);

export function PushedLocationMediaProvider({ children }: { children: ReactNode }) {
  const [pushedByLocation, setPushedByLocation] = useState<PushedByLocation>({});
  const [takeoverVisible, setTakeoverVisible] = useState(false);
  const [takeoverMedia, setTakeoverMedia] = useState<PushedMediaItem | null>(null);
  const [isAmbassadorLedMember, setIsAmbassadorLedMember] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const userType = await userTypeService.getUserType();
      setIsAmbassadorLedMember(userType === 'ambassador-led');
    };
    check();
  }, []);

  const addMediaToLocation = useCallback((locationId: string, media: PushedMediaItem) => {
    setPushedByLocation((prev) => {
      const list = prev[locationId] ?? [];
      return { ...prev, [locationId]: [...list, media] };
    });
  }, []);

  const getPushedMedia = useCallback((locationId: string): PushedMediaItem[] => {
    return pushedByLocation[locationId] ?? [];
  }, [pushedByLocation]);

  const closeTakeover = useCallback(() => {
    setTakeoverVisible(false);
    setTakeoverMedia(null);
  }, []);

  useEffect(() => {
    if (isAmbassadorLedMember !== true) return;

    wsManager.connect();
    const onMessage = (msg: { type?: string; locationId?: string; media?: PushedMediaItem }) => {
      if (msg?.type === 'media_added_to_detail' && msg.locationId && msg.media) {
        addMediaToLocation(msg.locationId, msg.media);
      }
      if (msg?.type === 'media_takeover' && msg.media) {
        setTakeoverMedia(msg.media);
        setTakeoverVisible(true);
      }
    };
    wsManager.on('message', onMessage);
    return () => wsManager.off('message', onMessage);
  }, [isAmbassadorLedMember, addMediaToLocation]);

  return (
    <PushedLocationMediaContext.Provider value={{ pushedByLocation, addMediaToLocation, getPushedMedia, takeoverVisible, takeoverMedia, closeTakeover }}>
      {children}
    </PushedLocationMediaContext.Provider>
  );
}

export function usePushedLocationMedia() {
  const context = useContext(PushedLocationMediaContext);
  if (context === undefined) {
    throw new Error('usePushedLocationMedia must be used within a PushedLocationMediaProvider');
  }
  return context;
}
