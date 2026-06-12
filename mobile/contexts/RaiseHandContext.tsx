import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Vibration } from 'react-native';
import { wsManager } from '@/services/ws';
import { authService, userTypeService } from '@/services/supabase';

interface RaiseHandContextType {
  showModal: boolean;
  memberName: string;
  dismissModal: () => void;
}

const RaiseHandContext = createContext<RaiseHandContextType | undefined>(undefined);

export function RaiseHandProvider({ children }: { children: ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [isAmbassador, setIsAmbassador] = useState(false);

  // Check if user is an ambassador, and re-check whenever auth state changes
  // (the provider mounts at the root, before an ambassador signs in).
  useEffect(() => {
    const checkUserType = async () => {
      const ambassadorStatus = await userTypeService.isAmbassador();
      setIsAmbassador(ambassadorStatus);
    };

    checkUserType();

    const { data: subscription } = authService.onAuthStateChange(() => {
      void checkUserType();
    });
    return () => {
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  // Listen for WebSocket events (for ambassadors to receive raise hand notifications)
  useEffect(() => {
    if (!isAmbassador) return;

    // Ensure WebSocket is connected
    wsManager.connect();

    const handleAmbassadorPing = (data: any) => {
      if (data?.payload) {
        const { memberName: name, message } = data.payload;
        setMemberName(name || 'A member');
        setShowModal(true);
        
        // Vibrate to get ambassador's attention
        Vibration.vibrate(200);
      }
    };

    wsManager.on('ambassador_ping', handleAmbassadorPing);

    return () => {
      wsManager.off('ambassador_ping', handleAmbassadorPing);
    };
  }, [isAmbassador]);

  const dismissModal = () => {
    setShowModal(false);
  };

  return (
    <RaiseHandContext.Provider value={{ showModal, memberName, dismissModal }}>
      {children}
    </RaiseHandContext.Provider>
  );
}

export function useRaiseHand() {
  const context = useContext(RaiseHandContext);
  if (context === undefined) {
    throw new Error('useRaiseHand must be used within a RaiseHandProvider');
  }
  return context;
}

