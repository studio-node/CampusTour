import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { appStateManager } from '@/services/appStateManager';
import { cleanupStaleData } from '@/services/stateCleanup';
import ResumeTourModal from '@/components/ResumeTourModal';
import { useResumeTour } from '@/hooks/useResumeTour';
import MediaTakeoverModal from '@/components/MediaTakeoverModal';
import RaiseHandNotificationModal from '@/components/RaiseHandNotificationModal';
import { RaiseHandProvider, useRaiseHand } from '@/contexts/RaiseHandContext';
import { PushedLocationMediaProvider, usePushedLocationMedia } from '@/contexts/PushedLocationMediaContext';
import { useState, useEffect as useReactEffect } from 'react';
import { schoolService } from '@/services/supabase';

function MediaTakeoverModalWrapper() {
  const { takeoverVisible, takeoverMedia, closeTakeover } = usePushedLocationMedia();
  return (
    <MediaTakeoverModal
      visible={takeoverVisible}
      media={takeoverMedia}
      onClose={closeTakeover}
    />
  );
}

// Renders the raise-hand modal exactly once at the root so multiple native
// <Modal>s aren't stacked across tabs. Previously we mounted it per-tab,
// which left dormant native modal instances blocking touches on the tabs the
// ambassador didn't dismiss from.
function RaiseHandNotificationModalWrapper() {
  const { showModal, memberName, dismissModal } = useRaiseHand();
  const [primaryColor, setPrimaryColor] = useState<string>('#990000');

  useReactEffect(() => {
    let cancelled = false;
    const loadColor = async () => {
      try {
        const schoolId = await schoolService.getSelectedSchool();
        if (!schoolId) return;
        const school = await schoolService.getSchoolById(schoolId);
        if (!cancelled && school?.primary_color) {
          setPrimaryColor(school.primary_color);
        }
      } catch (e) {
        console.error('RaiseHand modal: failed to load school primary color', e);
      }
    };
    if (showModal) loadColor();
    return () => {
      cancelled = true;
    };
  }, [showModal]);

  return (
    <RaiseHandNotificationModal
      visible={showModal}
      memberName={memberName}
      primaryColor={primaryColor}
      onClose={dismissModal}
    />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize app state management and resume tour functionality
  const {
    showResumeModal,
    tourProgress,
    isLoading: isResumeLoading,
    tourType,
    handleResume,
    handleStartFresh,
  } = useResumeTour();

  // Initialize app state manager on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the app state manager
        await appStateManager.initialize();
        
        // Clean up stale data on app start
        await cleanupStaleData();
        
        console.log('App state management initialized');
      } catch (error) {
        console.error('Error initializing app state management:', error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      appStateManager.cleanup();
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RaiseHandProvider>
          <PushedLocationMediaProvider>
          <MediaTakeoverModalWrapper />
          <RaiseHandNotificationModalWrapper />
          <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="ambassador-signin" options={{ headerShown: false }} />
        <Stack.Screen name="ambassador-tours" options={{ headerShown: false }} />
        <Stack.Screen name="tour-details" options={{ headerShown: false }} />
        <Stack.Screen name="lead-capture" options={{ headerShown: false }} />
        <Stack.Screen name="school-selection" options={{ headerShown: false }} />
        <Stack.Screen name="tour-group-selection" options={{ headerShown: false }} />
        <Stack.Screen name="interest-selection" options={{ headerShown: false }} />
        <Stack.Screen name="tour-confirmation" options={{ headerShown: false }} />
        <Stack.Screen name="tour-roster" options={{ headerShown: false }} />
        <Stack.Screen name="add-tour-locations" options={{ headerShown: false }} />

        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }}
        />
        <Stack.Screen name="building" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      
      {/* Resume Tour Modal */}
      <ResumeTourModal
        visible={showResumeModal}
        tourProgress={tourProgress}
        onResume={handleResume}
        onStartFresh={handleStartFresh}
        primaryColor="#3B82F6" // Default blue, will be overridden by school color
        tourType={tourType}
      />
      
      <StatusBar style="auto" />
          </PushedLocationMediaProvider>
        </RaiseHandProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
