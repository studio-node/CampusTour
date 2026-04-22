import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { wsManager } from '@/services/ws';

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
  showTakeover: (media: PushedMediaItem) => void;
  closeTakeover: () => void;
}

const PushedLocationMediaContext = createContext<PushedLocationMediaContextType | undefined>(undefined);

export function PushedLocationMediaProvider({ children }: { children: ReactNode }) {
  const [pushedByLocation, setPushedByLocation] = useState<PushedByLocation>({});
  const [takeoverVisible, setTakeoverVisible] = useState(false);
  const [takeoverMedia, setTakeoverMedia] = useState<PushedMediaItem | null>(null);

  const addMediaToLocation = useCallback((locationId: string, media: PushedMediaItem) => {
    setPushedByLocation((prev) => {
      const list = prev[locationId] ?? [];
      return { ...prev, [locationId]: [...list, media] };
    });
  }, []);

  const getPushedMedia = useCallback((locationId: string): PushedMediaItem[] => {
    return pushedByLocation[locationId] ?? [];
  }, [pushedByLocation]);

  const showTakeover = useCallback((media: PushedMediaItem) => {
    setTakeoverMedia(media);
    setTakeoverVisible(true);
  }, []);

  const closeTakeover = useCallback(() => {
    setTakeoverVisible(false);
    setTakeoverMedia(null);
  }, []);

  // Attach the WebSocket listener once, unconditionally.
  //
  // Previously we only attached it when a one-shot async check of
  // userTypeService.getUserType() returned 'ambassador-led'. That check runs
  // at provider mount time (app boot), which is before the user has selected
  // their tour type on index.tsx. selectedTourType is null at that point, so
  // isAmbassadorLedMember latched to false and the listener was never
  // attached for the rest of the session. Media pushes arrived on the wire
  // but nothing ever acted on them.
  //
  // The server already filters who receives media pushes (only broadcastTo
  // joined session members in backend/tour-sessions.js), so it's safe to
  // listen unconditionally — non-members simply never see these messages.
  useEffect(() => {
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
  }, [addMediaToLocation]);

  return (
    <PushedLocationMediaContext.Provider value={{ pushedByLocation, addMediaToLocation, getPushedMedia, takeoverVisible, takeoverMedia, showTakeover, closeTakeover }}>
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
