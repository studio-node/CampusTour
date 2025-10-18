import { useState, useEffect, useCallback } from 'react';
import { appStateManager, TourProgress } from '@/services/appStateManager';
import { clearAllTourData } from '@/services/stateCleanup';
import { useRouter } from 'expo-router';

interface UseResumeTourReturn {
  showResumeModal: boolean;
  tourProgress: TourProgress | null;
  isLoading: boolean;
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
        // Get tour progress for the modal
        const progress = appStateManager.getTourProgress();
        setTourProgress(progress);
        setShowResumeModal(true);
      } else {
        setShowResumeModal(false);
        setTourProgress(null);
      }
    } catch (error) {
      console.error('Error checking for resumable tour:', error);
      setShowResumeModal(false);
      setTourProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResume = useCallback(() => {
    try {
      // Hide the modal
      setShowResumeModal(false);
      
      // Navigate to the tour screen
      router.push('/(tabs)/tour');
      
      console.log('Resuming tour...');
    } catch (error) {
      console.error('Error resuming tour:', error);
    }
  }, [router]);

  const handleStartFresh = useCallback(async () => {
    try {
      // Hide the modal
      setShowResumeModal(false);
      
      // Clear all tour data
      await clearAllTourData();
      
      // Navigate to interest selection to start fresh
      router.push('/(tabs)/tour');
      
      console.log('Starting fresh tour...');
    } catch (error) {
      console.error('Error starting fresh tour:', error);
    }
  }, [router]);

  return {
    showResumeModal,
    tourProgress,
    isLoading,
    handleResume,
    handleStartFresh,
  };
}
