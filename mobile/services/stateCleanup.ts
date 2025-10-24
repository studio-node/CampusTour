import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys to clean up
const CLEANUP_KEYS = [
  'CAMPUS_TOUR_APP_STATE',
  'CAMPUS_TOUR_LAST_ACTIVE',
  'tourStops',
  'selectedInterests',
  'showInterestSelection',
  'visitedLocations',
  'tourStarted',
  'tourFinished',
  'locationPermissionStatus',
  'currentLocationId',
  'locationEntryTimes',
  'previouslyEnteredLocations',
  'isEditingTour',
  'LEAD_ID',
  'SELECTED_SCHOOL_ID',
  'selectedTourType',
  'selectedTourGroup',
  'AUTHENTICATED_USER',
  'AUTH_SESSION_DATA',
  'DAILY_SESSION_ID',
  'SESSION_DATE',
] as const;

// Configuration
const CLEANUP_CONFIG = {
  // Remove state older than 7 days
  MAX_AGE_DAYS: 7,
  // Remove analytics data older than 30 days
  ANALYTICS_MAX_AGE_DAYS: 30,
} as const;

/**
 * Clean up stale app state data
 */
export async function cleanupStaleData(): Promise<void> {
  try {
    console.log('Starting stale data cleanup...');
    
    // Clean up old app state
    await cleanupOldAppState();
    
    // Clean up old session data
    await cleanupOldSessions();
    
    // Clean up orphaned data
    await cleanupOrphanedData();
    
    console.log('Stale data cleanup completed');
  } catch (error) {
    console.error('Error during stale data cleanup:', error);
  }
}

/**
 * Clean up app state older than MAX_AGE_DAYS
 */
async function cleanupOldAppState(): Promise<void> {
  try {
    const lastActive = await AsyncStorage.getItem('CAMPUS_TOUR_LAST_ACTIVE');
    
    if (!lastActive) {
      console.log('No last active timestamp found, skipping app state cleanup');
      return;
    }

    const lastActiveDate = new Date(lastActive);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.MAX_AGE_DAYS);

    if (lastActiveDate < cutoffDate) {
      console.log('App state is older than 7 days, clearing...');
      await clearAllTourData();
    }
  } catch (error) {
    console.error('Error cleaning up old app state:', error);
  }
}

/**
 * Clean up old session data
 */
async function cleanupOldSessions(): Promise<void> {
  try {
    // For now, we don't have specific session cleanup logic
    // This would be expanded if we start storing more session data
    console.log('Session cleanup completed (no sessions to clean)');
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
}

/**
 * Clean up orphaned data (data without corresponding app state)
 */
async function cleanupOrphanedData(): Promise<void> {
  try {
    const appState = await AsyncStorage.getItem('CAMPUS_TOUR_APP_STATE');
    
    if (!appState) {
      // No app state exists, clean up all tour-related data
      console.log('No app state found, cleaning up orphaned tour data...');
      await clearAllTourData();
    }
  } catch (error) {
    console.error('Error cleaning up orphaned data:', error);
  }
}

/**
 * Clear all tour-related data (for "Start Fresh" action)
 */
export async function clearAllTourData(): Promise<void> {
  try {
    console.log('Clearing all tour data...');
    
    // Remove all tour-related keys
    await AsyncStorage.multiRemove(CLEANUP_KEYS);
    
    console.log('All tour data cleared successfully');
  } catch (error) {
    console.error('Error clearing tour data:', error);
  }
}

/**
 * Clear only tour progress data (keep school/user selections)
 */
export async function clearTourProgress(): Promise<void> {
  try {
    console.log('Clearing tour progress data...');
    
    const tourProgressKeys = [
      'tourStops',
      'selectedInterests',
      'showInterestSelection',
      'visitedLocations',
      'tourStarted',
      'tourFinished',
      'currentLocationId',
      'locationEntryTimes',
      'previouslyEnteredLocations',
      'isEditingTour',
    ];
    
    await AsyncStorage.multiRemove(tourProgressKeys);
    
    console.log('Tour progress data cleared successfully');
  } catch (error) {
    console.error('Error clearing tour progress:', error);
  }
}

/**
 * Clear only authentication data
 */
export async function clearAuthData(): Promise<void> {
  try {
    console.log('Clearing authentication data...');
    
    const authKeys = [
      'AUTHENTICATED_USER',
      'AUTH_SESSION_DATA',
    ];
    
    await AsyncStorage.multiRemove(authKeys);
    
    console.log('Authentication data cleared successfully');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}

/**
 * Clear only session data
 */
export async function clearSessionData(): Promise<void> {
  try {
    console.log('Clearing session data...');
    
    const sessionKeys = [
      'LEAD_ID',
      'selectedTourGroup',
      'DAILY_SESSION_ID',
      'SESSION_DATE',
    ];
    
    await AsyncStorage.multiRemove(sessionKeys);
    
    console.log('Session data cleared successfully');
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
}

