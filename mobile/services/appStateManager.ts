import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { Location, Region, UserType, leadsService } from './supabase';

// Storage keys with consistent prefix
const STORAGE_KEYS = {
  APP_STATE: 'CAMPUS_TOUR_APP_STATE',
  LAST_ACTIVE: 'CAMPUS_TOUR_LAST_ACTIVE',
} as const;

// Tour progress interface
export interface TourProgress {
  totalStops: number;
  visitedStops: number;
  currentStopIndex: number;
  tourStartedAt: string;
  lastActiveAt: string;
}

// Map state interface
export interface MapState {
  region: Region;
  lastViewedLocationId: string | null;
}

// Session data interface
export interface SessionData {
  sessionId: string;
  leadId: string | null;
  tourAppointmentId: string | null;
}

// Main persisted app state interface
export interface PersistedAppState {
  lastUpdated: string;
  currentRoute: string;
  schoolId: string;
  userType: UserType;
  tourState: {
    stops: Location[];
    selectedInterests: string[];
    visitedLocations: string[];
    currentStopIndex: number;
    tourStarted: boolean;
    tourFinished: boolean;
    isEditingTour: boolean;
  };
  mapState: MapState;
  sessionData: SessionData;
  tourProgress: TourProgress;
}

// App state manager class
class AppStateManager {
  private appStateSubscription: any = null;
  private isInitialized = false;
  private currentState: PersistedAppState | null = null;

  /**
   * Initialize the app state manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up AppState listener
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
      
      // Load existing state
      await this.loadPersistedState();
      
      this.isInitialized = true;
      console.log('AppStateManager initialized successfully');
    } catch (error) {
      console.error('Error initializing AppStateManager:', error);
    }
  }

  /**
   * Clean up the app state manager
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
  }

  /**
   * Handle app state changes (active/background/inactive)
   */
  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    console.log('App state changed to:', nextAppState);
    
    switch (nextAppState) {
      case 'active':
        await this.handleAppForeground();
        break;
      case 'background':
      case 'inactive':
        await this.handleAppBackground();
        break;
    }
  }

  /**
   * Handle app going to foreground
   */
  private async handleAppForeground(): Promise<void> {
    try {
      // Reload state in case it was modified elsewhere
      await this.loadPersistedState();
      console.log('App foregrounded - state reloaded');
    } catch (error) {
      console.error('Error handling app foreground:', error);
    }
  }

  /**
   * Handle app going to background
   */
  private async handleAppBackground(): Promise<void> {
    try {
      // Save current state before going to background
      await this.saveCurrentState();
      console.log('App backgrounded - state saved');
    } catch (error) {
      console.error('Error handling app background:', error);
    }
  }

  /**
   * Save the current app state to AsyncStorage
   */
  async saveCurrentState(): Promise<void> {
    try {
      if (!this.currentState) {
        console.log('No current state to save');
        return;
      }

      const stateToSave: PersistedAppState = {
        ...this.currentState,
        lastUpdated: new Date().toISOString(),
      };

      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(stateToSave));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());
      
      console.log('App state saved successfully');
    } catch (error) {
      console.error('Error saving app state:', error);
    }
  }

  /**
   * Load persisted state from AsyncStorage
   */
  async loadPersistedState(): Promise<PersistedAppState | null> {
    try {
      const savedState = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE);
      
      if (!savedState) {
        this.currentState = null;
        return null;
      }

      const parsedState = JSON.parse(savedState) as PersistedAppState;
      
      // Check if state is too old (7 days)
      const lastActive = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      if (lastActive) {
        const lastActiveDate = new Date(lastActive);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (lastActiveDate < sevenDaysAgo) {
          console.log('State is older than 7 days, clearing...');
          await this.clearAllState();
          return null;
        }
      }

      this.currentState = parsedState;
      
      return parsedState;
    } catch (error) {
      console.error('Error loading persisted state:', error);
      this.currentState = null;
      return null;
    }
  }


  /**
   * Update the current state
   */
  updateState(updates: Partial<PersistedAppState>): void {
    if (!this.currentState) {
      this.currentState = this.createEmptyState();
    }

    this.currentState = {
      ...this.currentState,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get the current state
   */
  getCurrentState(): PersistedAppState | null {
    return this.currentState;
  }

  /**
   * Check if there's a resumable tour (for self-guided and ambassador-led users)
   */
  async hasResumableTour(): Promise<boolean> {
    try {
      const state = await this.loadPersistedState();
      
      console.log('Checking for resumable tour, state:', state);
      
      if (!state) {
        console.log('No persisted state found');
        return false;
      }
      
      // Check for self-guided tours
      if (state.userType === 'self-guided') {
        // For now, assume all tours are resumable if they have any tour state
        // This is a simplified approach for testing
        console.log('Self-guided tour found, considering resumable');
        return true;
      }
      
      // Check for ambassador-led tours
      if (state.userType === 'ambassador-led') {
        // Verify tour ID exists
        if (!state.sessionData?.tourAppointmentId) {
          console.log('Ambassador-led tour but no tour ID found');
          return false;
        }
        
        // Verify tour session is still active via Supabase
        try {
          const sessionData = await leadsService.getLiveTourSession(state.sessionData.tourAppointmentId);
          if (sessionData && sessionData.status === 'active') {
            console.log('Ambassador-led tour found and still active');
            return true;
          } else {
            console.log('Ambassador-led tour found but not active');
            return false;
          }
        } catch (error) {
          console.error('Error checking tour session status:', error);
          return false;
        }
      }
      
      // Check for ambassador tours
      if (state.userType === 'ambassador') {
        // Verify tour ID exists
        if (!state.sessionData?.tourAppointmentId) {
          console.log('Ambassador tour but no tour ID found');
          return false;
        }
        
        // Verify tour session is still active via Supabase
        try {
          const sessionData = await leadsService.getLiveTourSession(state.sessionData.tourAppointmentId);
          if (sessionData && sessionData.status === 'active') {
            console.log('Ambassador tour found and still active');
            return true;
          } else {
            console.log('Ambassador tour found but not active');
            return false;
          }
        } catch (error) {
          console.error('Error checking tour session status:', error);
          return false;
        }
      }
      
      console.log('Not a resumable tour type, userType:', state.userType);
      return false;
    } catch (error) {
      console.error('Error checking for resumable tour:', error);
      return false;
    }
  }

  /**
   * Get tour progress for resume modal
   */
  getTourProgress(): TourProgress | null {
    if (!this.currentState) return null;
    
    const { tourState } = this.currentState;
    const totalStops = tourState?.stops?.length || 0;
    const visitedStops = tourState?.visitedLocations?.length || 0;
    const currentStopIndex = tourState?.currentStopIndex || 0;
    
    return {
      totalStops,
      visitedStops,
      currentStopIndex,
      tourStartedAt: this.currentState.tourProgress?.tourStartedAt || new Date().toISOString(),
      lastActiveAt: this.currentState.lastUpdated,
    };
  }

  /**
   * Get the user type from current state
   */
  getUserType(): UserType | null {
    return this.currentState?.userType || null;
  }

  /**
   * Get the tour appointment ID from current state (for ambassador-led tours)
   */
  getTourAppointmentId(): string | null {
    return this.currentState?.sessionData?.tourAppointmentId || null;
  }

  /**
   * Clear all app state (for "Start Fresh" action)
   */
  async clearAllState(): Promise<void> {
    try {
      // Clear all tour-related state
      const keysToRemove = [
        STORAGE_KEYS.APP_STATE,
        STORAGE_KEYS.LAST_ACTIVE,
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
      ];

      await AsyncStorage.multiRemove(keysToRemove);
      
      this.currentState = null;
      console.log('All app state cleared');
    } catch (error) {
      console.error('Error clearing app state:', error);
    }
  }

  /**
   * Create an empty state structure
   */
  private createEmptyState(): PersistedAppState {
    return {
      lastUpdated: new Date().toISOString(),
      currentRoute: '/',
      schoolId: '',
      userType: null,
      tourState: {
        stops: [],
        selectedInterests: [],
        visitedLocations: [],
        currentStopIndex: 0,
        tourStarted: false,
        tourFinished: false,
        isEditingTour: false,
      },
      mapState: {
        region: {
          latitude: 37.10191426300314,
          longitude: -113.56546471154138,
          latitudeDelta: 0.007,
          longitudeDelta: 0.007,
        },
        lastViewedLocationId: null,
      },
      sessionData: {
        sessionId: '',
        leadId: null,
        tourAppointmentId: null,
      },
      tourProgress: {
        totalStops: 0,
        visitedStops: 0,
        currentStopIndex: 0,
        tourStartedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    };
  }
}

// Export singleton instance
export const appStateManager = new AppStateManager();
