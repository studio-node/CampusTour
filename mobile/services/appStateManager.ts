import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { Location, Region, UserType, leadsService } from './supabase';

// Storage keys with consistent prefix. clearAllState() removes everything under this
// prefix, so new app-state keys can't be forgotten as long as they use it.
const STATE_KEY_PREFIX = 'CAMPUS_TOUR_';
const STORAGE_KEYS = {
  APP_STATE: `${STATE_KEY_PREFIX}APP_STATE`,
  LAST_ACTIVE: `${STATE_KEY_PREFIX}LAST_ACTIVE`,
} as const;

// Bump when the shape of PersistedAppState changes incompatibly. On load, a mismatch
// (including missing version from pre-versioning builds) clears the persisted state rather
// than trusting a blind cast.
const SCHEMA_VERSION = 1;

// Tour progress interface. This is DERIVED from tourState on read (see getTourProgress);
// it is no longer persisted as its own field.
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
  schemaVersion: number;
  lastUpdated: string;
  currentRoute: string;
  schoolId: string;
  userType: UserType;
  tourState: {
    stops: Location[];
    selectedInterests: string[];
    visitedLocations: string[];
    /**
     * Id of the stop the user is currently at (null when not at any stop). We persist the
     * id, not an index: ids survive stops being reordered or deleted, whereas an index
     * silently points at the wrong stop after any such change.
     */
    currentLocationId: string | null;
    /** ISO timestamp stamped once, the first time the tour reports started. */
    tourStartedAt?: string | null;
    tourStarted: boolean;
    tourFinished: boolean;
    isEditingTour: boolean;
    /** When true, Tour and Current Stop tabs show paused UI and pause local location logic. */
    tourPaused?: boolean;
  };
  mapState: MapState;
  sessionData: SessionData;
}

/**
 * Minimal structural validation for state loaded off disk. Guards against shape changes
 * (or corruption) shipping undefined-behavior to users with old state.
 */
function isValidPersistedState(value: unknown): value is PersistedAppState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== SCHEMA_VERSION) return false;
  const ts = v.tourState as Record<string, unknown> | undefined;
  if (!ts || typeof ts !== 'object') return false;
  if (!Array.isArray(ts.stops)) return false;
  if (!Array.isArray(ts.visitedLocations)) return false;
  return true;
}

// App state manager class
class AppStateManager {
  private appStateSubscription: any = null;
  private isInitialized = false;
  private currentState: PersistedAppState | null = null;
  /** In-memory only; not persisted. Used to pass selected locations from add-tour-locations screen back to Tour tab. */
  private pendingLocationsToAdd: Location[] | null = null;
  /**
   * Timer that coalesces rapid updateState calls into a single disk write.
   * We can't rely on AppState 'background' alone — in Expo Go and on hard
   * app-kill the event often doesn't fire in time to flush, and the saved
   * tour state gets lost. So every updateState schedules a debounced save.
   */
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SAVE_DEBOUNCE_MS = 250;

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
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
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
      // Flush any pending debounced save so we don't drop the last update.
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = null;
      }
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

      console.log('[Resume] App state saved', {
        userType: stateToSave.userType,
        tourStarted: stateToSave.tourState?.tourStarted,
        tourFinished: stateToSave.tourState?.tourFinished,
        stops: stateToSave.tourState?.stops?.length ?? 0,
        visited: stateToSave.tourState?.visitedLocations?.length ?? 0,
      });
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

      let parsedState: unknown;
      try {
        parsedState = JSON.parse(savedState);
      } catch (parseError) {
        console.warn('Persisted state is not valid JSON, clearing...', parseError);
        await this.clearAllState();
        return null;
      }

      // Validate against the current schema instead of trusting a blind cast. A version
      // mismatch (or missing version from a pre-versioning build) means the shape may be
      // incompatible — clear and start fresh (acceptable: state expires at 7 days anyway).
      if (!isValidPersistedState(parsedState)) {
        console.log('Persisted state is missing/incompatible schemaVersion, clearing...');
        await this.clearAllState();
        return null;
      }

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
   * Update the current state and schedule a debounced persist to AsyncStorage.
   * We persist on every change (debounced) because relying on AppState
   * 'background' alone drops state when the app is reloaded via the Expo
   * dev menu or force-killed before the 'background' event fires.
   */
  updateState(updates: Partial<PersistedAppState>): void {
    if (!this.currentState) {
      this.currentState = this.createEmptyState();
    }

    const now = new Date().toISOString();
    const prevTourState = this.currentState.tourState;

    const merged: PersistedAppState = {
      ...this.currentState,
      ...updates,
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: now,
    };

    // tourStartedAt is stamped once, the first time a tour reports started, and preserved
    // thereafter; it clears when the tour isn't started (so a fresh tour after a reset
    // doesn't inherit a stale start time). Callers replacing tourState needn't manage it.
    if (updates.tourState) {
      const preservedStartedAt = prevTourState?.tourStartedAt ?? null;
      merged.tourState = {
        ...updates.tourState,
        tourStartedAt: updates.tourState.tourStarted
          ? (updates.tourState.tourStartedAt ?? preservedStartedAt ?? now)
          : null,
      };
    }

    this.currentState = merged;

    this.scheduleSave();
  }

  /**
   * Debounced persist. Coalesces rapid successive updateState calls
   * (e.g. from a single render that touches many pieces of state) into
   * one AsyncStorage write.
   */
  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveCurrentState().catch((err) => {
        console.error('Error in debounced saveCurrentState:', err);
      });
    }, this.SAVE_DEBOUNCE_MS);
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

      if (state.tourState?.tourFinished) {
        console.log('Tour marked finished, not offering resume');
        return false;
      }
      
      // Check for self-guided tours. Only offer resume if the user has an
      // actual tour in progress (stops generated, or explicitly started).
      // Otherwise we'd pop the modal even when the user only got as far as
      // the tour-type selection screen last session, which is confusing.
      if (state.userType === 'self-guided') {
        const stops = state.tourState?.stops ?? [];
        const hasStops = Array.isArray(stops) && stops.length > 0;
        const tourStarted = !!state.tourState?.tourStarted;
        const visited = state.tourState?.visitedLocations?.length ?? 0;

        if (hasStops || tourStarted || visited > 0) {
          console.log('Self-guided tour in progress, offering resume');
          return true;
        }
        console.log('Self-guided state exists but no tour in progress; skipping resume');
        return false;
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
    const stops = tourState?.stops ?? [];
    const totalStops = stops.length;
    const visitedStops = tourState?.visitedLocations?.length ?? 0;
    // Derive the index from the persisted location id so it stays correct across reorders.
    const foundIndex = tourState?.currentLocationId
      ? stops.findIndex((s) => s.id === tourState.currentLocationId)
      : -1;
    const currentStopIndex = foundIndex >= 0 ? foundIndex : 0;

    return {
      totalStops,
      visitedStops,
      currentStopIndex,
      tourStartedAt: tourState?.tourStartedAt ?? this.currentState.lastUpdated,
      lastActiveAt: this.currentState.lastUpdated,
    };
  }

  /**
   * The id of the stop the user is currently at (null when not at any stop).
   * Read this instead of deriving from a persisted index.
   */
  getCurrentLocationId(): string | null {
    return this.currentState?.tourState?.currentLocationId ?? null;
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
   * Set pending locations to add to the tour (from add-tour-locations screen).
   * In-memory only; not persisted.
   */
  setPendingLocationsToAdd(locations: Location[]): void {
    this.pendingLocationsToAdd = locations.length > 0 ? locations : null;
  }

  /**
   * Get and clear pending locations to add. Returns null if none.
   * Called by Tour tab when it regains focus.
   */
  getAndClearPendingLocationsToAdd(): Location[] | null {
    const pending = this.pendingLocationsToAdd;
    this.pendingLocationsToAdd = null;
    return pending;
  }

  /**
   * Clear all app state (for "Start Fresh" action)
   */
  async clearAllState(): Promise<void> {
    try {
      // Remove everything under our namespace prefix rather than a hand-maintained key list
      // (which drifts as keys are added). All app-state keys live under STATE_KEY_PREFIX.
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((k) => k.startsWith(STATE_KEY_PREFIX));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

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
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      currentRoute: '/',
      schoolId: '',
      userType: null,
      tourState: {
        stops: [],
        selectedInterests: [],
        visitedLocations: [],
        currentLocationId: null,
        tourStartedAt: null,
        tourStarted: false,
        tourFinished: false,
        isEditingTour: false,
        tourPaused: false,
      },
      mapState: {
        // Neutral, zoomed-out fallback. The real region comes from the selected school;
        // this is only used before one is loaded, so it must not hardcode any one campus.
        region: {
          latitude: 39.5,
          longitude: -98.35,
          latitudeDelta: 60,
          longitudeDelta: 60,
        },
        lastViewedLocationId: null,
      },
      sessionData: {
        sessionId: '',
        leadId: null,
        tourAppointmentId: null,
      },
    };
  }
}

// Export singleton instance
export const appStateManager = new AppStateManager();
