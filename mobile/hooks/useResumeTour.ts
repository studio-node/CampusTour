import { useState, useEffect, useCallback } from 'react';
import { appStateManager, TourProgress } from '@/services/appStateManager';
import { clearAllTourData } from '@/services/stateCleanup';
import { useRouter } from 'expo-router';
import { 
  leadsService, 
  locationService, 
  schoolService,
  authService,
  tourGroupSelectionService,
  Location 
} from '@/services/supabase';
import { wsManager } from '@/services/ws';

interface UseResumeTourReturn {
  showResumeModal: boolean;
  tourProgress: TourProgress | null;
  isLoading: boolean;
  tourType: 'self-guided' | 'ambassador-led' | 'ambassador' | null;
  handleResume: () => void;
  handleStartFresh: () => void;
}

/**
 * Hook to manage resume tour functionality
 */
export function useResumeTour(): UseResumeTourReturn {
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [tourProgress, setTourProgress] = useState<TourProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tourType, setTourType] = useState<'self-guided' | 'ambassador-led' | 'ambassador' | null>(null);
  const router = useRouter();

  // Check for resumable tour on mount
  useEffect(() => {
    checkForResumableTour();
  }, []);

  const checkForResumableTour = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if there's a resumable tour
      const hasResumableTour = await appStateManager.hasResumableTour();
      
      if (hasResumableTour) {
        // Get user type to determine tour type
        const userType = appStateManager.getUserType();
        if (userType === 'ambassador-led') {
          setTourType('ambassador-led');
        } else if (userType === 'ambassador') {
          setTourType('ambassador');
        } else {
          setTourType('self-guided');
        }
        
        // Get tour progress for the modal (may be null for ambassador-led/ambassador)
        const progress = appStateManager.getTourProgress();
        setTourProgress(progress);
        setShowResumeModal(true);
      } else {
        setShowResumeModal(false);
        setTourProgress(null);
        setTourType(null);
      }
    } catch (error) {
      console.error('Error checking for resumable tour:', error);
      setShowResumeModal(false);
      setTourProgress(null);
      setTourType(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreAmbassadorTour = useCallback(async () => {
    try {
      const tourId = appStateManager.getTourAppointmentId();
      if (!tourId) {
        console.error('No tour ID found for ambassador tour');
        return;
      }

      // Fetch latest tour state from Supabase
      const sessionData = await leadsService.getLiveTourSession(tourId);
      if (!sessionData || sessionData.status !== 'active') {
        console.error('Tour session is not active');
        return;
      }

      const schoolId = await schoolService.getSelectedSchool();
      if (!schoolId || !sessionData.live_tour_structure || !Array.isArray(sessionData.live_tour_structure)) {
        console.error('Missing required data to restore tour');
        return;
      }

      // Fetch all locations to convert IDs to Location objects
      const allLocations = await locationService.getTourStops(schoolId);
      const ordered: Location[] = sessionData.live_tour_structure
        .map((id: string) => allLocations.find((loc: Location) => loc.id === id))
        .filter((loc: Location | undefined): loc is Location => Boolean(loc));
      
      // Convert visited_locations from JSONB array format
      const visitedLocations = Array.isArray(sessionData.visited_locations) 
        ? sessionData.visited_locations 
        : [];
      
      // Find current stop index
      let currentStopIndex = 0;
      if (sessionData.current_location_id) {
        const foundIndex = ordered.findIndex(loc => loc.id === sessionData.current_location_id);
        currentStopIndex = foundIndex >= 0 ? foundIndex : 0;
      }
      
      // Update app state with the current tour state
      appStateManager.updateState({
        tourState: {
          stops: ordered,
          selectedInterests: [],
          visitedLocations: visitedLocations,
          currentStopIndex: currentStopIndex,
          tourStarted: true,
          tourFinished: false,
          isEditingTour: false,
        },
      });
      
      // Save state
      await appStateManager.saveCurrentState();
      
      // Set selected tour group so other parts of the app can access it
      await tourGroupSelectionService.setSelectedTourGroup(tourId);
      
      // Ensure websocket is connected and authenticate
      wsManager.connect();
      const user = await authService.getStoredUser();
      if (user?.id) {
        // Wait for websocket to open, then authenticate and create/attach to session
        const authenticateAndCreateSession = () => {
          wsManager.authenticate(user.id);
          // Create or attach to the live tour session
          wsManager.send('create_session', {
            tourId: tourId,
            initial_structure: {},
            ambassador_id: user.id,
          });
        };
        
        if (wsManager.getStatus() === 'open') {
          authenticateAndCreateSession();
        } else {
          wsManager.on('open', () => {
            authenticateAndCreateSession();
          });
        }
      }
      
      // Navigate to map
      router.replace('/map');
    } catch (error) {
      console.error('Error restoring ambassador tour:', error);
    }
  }, [router]);

  const restoreAmbassadorLedTour = useCallback(async () => {
    try {
      const tourId = appStateManager.getTourAppointmentId();
      if (!tourId) {
        console.error('No tour ID found for ambassador-led tour');
        return;
      }

      // Fetch latest tour state from Supabase
      const sessionData = await leadsService.getLiveTourSession(tourId);
      if (!sessionData || sessionData.status !== 'active') {
        console.error('Tour session is not active');
        return;
      }

      const schoolId = await schoolService.getSelectedSchool();
      if (!schoolId || !sessionData.live_tour_structure || !Array.isArray(sessionData.live_tour_structure)) {
        console.error('Missing required data to restore tour');
        return;
      }

      // Fetch all locations to convert IDs to Location objects
      const allLocations = await locationService.getTourStops(schoolId);
      const ordered: Location[] = sessionData.live_tour_structure
        .map((id: string) => allLocations.find((loc: Location) => loc.id === id))
        .filter((loc: Location | undefined): loc is Location => Boolean(loc));
      
      // Convert visited_locations from JSONB array format
      const visitedLocations = Array.isArray(sessionData.visited_locations) 
        ? sessionData.visited_locations 
        : [];
      
      // Find current stop index
      let currentStopIndex = 0;
      if (sessionData.current_location_id) {
        const foundIndex = ordered.findIndex(loc => loc.id === sessionData.current_location_id);
        currentStopIndex = foundIndex >= 0 ? foundIndex : 0;
      }
      
      // Update app state with the current tour state
      appStateManager.updateState({
        tourState: {
          stops: ordered,
          selectedInterests: [],
          visitedLocations: visitedLocations,
          currentStopIndex: currentStopIndex,
          tourStarted: true,
          tourFinished: false,
          isEditingTour: false,
        },
      });
      
      // Save state
      await appStateManager.saveCurrentState();
      
      // Set selected tour group so other parts of the app can access it
      await tourGroupSelectionService.setSelectedTourGroup(tourId);
      
      // Ensure websocket is connected and join session
      wsManager.connect();
      const leadId = await leadsService.getStoredLeadId();
      if (leadId) {
        // Wait for websocket to open, then join session
        const joinSession = () => {
          wsManager.send('join_session', { tourId, leadId });
        };
        
        if (wsManager.getStatus() === 'open') {
          joinSession();
        } else {
          wsManager.on('open', () => {
            joinSession();
          });
        }
      }
      
      // Navigate to map
      router.replace('/map');
    } catch (error) {
      console.error('Error restoring ambassador-led tour:', error);
    }
  }, [router]);

  const handleResume = useCallback(async () => {
    try {
      // Hide the modal
      setShowResumeModal(false);
      
      // Check tour type and handle accordingly
      if (tourType === 'ambassador-led') {
        await restoreAmbassadorLedTour();
      } else if (tourType === 'ambassador') {
        await restoreAmbassadorTour();
      } else {
        // Navigate to the tour screen for self-guided tours
        router.push('/(tabs)/tour');
      }
      
      console.log('Resuming tour...');
    } catch (error) {
      console.error('Error resuming tour:', error);
    }
  }, [router, tourType, restoreAmbassadorLedTour, restoreAmbassadorTour]);

  const handleStartFresh = useCallback(async () => {
    try {
      // Hide the modal
      setShowResumeModal(false);
      
      // For ambassador-led and ambassador tours, just dismiss the modal without clearing data
      // so they can rejoin later if they want
      if (tourType === 'ambassador-led' || tourType === 'ambassador') {
        console.log('Dismissed ambassador tour rejoin modal');
        return;
      }
      
      // For self-guided tours, clear all tour data
      await clearAllTourData();
      
      // Navigate to interest selection to start fresh
      router.push('/(tabs)/tour');
      
      console.log('Starting fresh tour...');
    } catch (error) {
      console.error('Error starting fresh tour:', error);
    }
  }, [router, tourType]);

  return {
    showResumeModal,
    tourProgress,
    isLoading,
    tourType,
    handleResume,
    handleStartFresh,
  };
}
