import { PersistedAppState } from './appStateManager';

// State version history
export const STATE_VERSIONS = {
  '1.0.0': '1.0.0',
} as const;

export type StateVersion = keyof typeof STATE_VERSIONS;

// Migration functions for each version
const migrations: Record<string, (state: any) => any> = {
  // Future migrations will be added here
  // Example:
  // '1.1.0': (state) => migrateToV1_1_0(state),
};

/**
 * Migrate state to the latest version
 */
export async function migrateState(state: any): Promise<PersistedAppState> {
  if (!state.version) {
    // Legacy state without version - assume it's from before versioning
    return migrateFromLegacy(state);
  }

  const currentVersion = state.version as StateVersion;
  const latestVersion = STATE_VERSIONS['1.0.0'];

  if (currentVersion === latestVersion) {
    return state as PersistedAppState;
  }

  // Apply migrations in sequence
  let migratedState = { ...state };
  
  // For now, we only have one version, so no migrations needed
  // In the future, add migration logic here:
  // 
  // if (currentVersion < '1.1.0') {
  //   migratedState = migrations['1.1.0'](migratedState);
  // }
  // if (currentVersion < '1.2.0') {
  //   migratedState = migrations['1.2.0'](migratedState);
  // }

  // Update to latest version
  migratedState.version = latestVersion;
  migratedState.lastUpdated = new Date().toISOString();

  return migratedState as PersistedAppState;
}

/**
 * Migrate from legacy state (before versioning)
 */
function migrateFromLegacy(legacyState: any): PersistedAppState {
  console.log('Migrating from legacy state format');
  
  // Create a new state structure with defaults
  const migratedState: PersistedAppState = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    currentRoute: '/',
    schoolId: legacyState.schoolId || '',
    userType: legacyState.userType || null,
    tourState: {
      stops: legacyState.tourStops || [],
      selectedInterests: legacyState.selectedInterests || [],
      visitedLocations: legacyState.visitedLocations || [],
      currentStopIndex: legacyState.currentStopIndex || 0,
      tourStarted: legacyState.tourStarted || false,
      tourFinished: legacyState.tourFinished || false,
      isEditingTour: legacyState.isEditingTour || false,
    },
    mapState: {
      region: legacyState.mapRegion || {
        latitude: 37.10191426300314,
        longitude: -113.56546471154138,
        latitudeDelta: 0.007,
        longitudeDelta: 0.007,
      },
      lastViewedLocationId: legacyState.lastViewedLocationId || null,
    },
    sessionData: {
      sessionId: legacyState.sessionId || '',
      leadId: legacyState.leadId || null,
      tourAppointmentId: legacyState.tourAppointmentId || null,
    },
    tourProgress: {
      totalStops: (legacyState.tourStops || []).length,
      visitedStops: (legacyState.visitedLocations || []).length,
      currentStopIndex: legacyState.currentStopIndex || 0,
      tourStartedAt: legacyState.tourStartedAt || new Date().toISOString(),
      lastActiveAt: legacyState.lastUpdated || new Date().toISOString(),
    },
  };

  return migratedState;
}

/**
 * Validate state structure
 */
export function validateState(state: any): state is PersistedAppState {
  if (!state || typeof state !== 'object') {
    return false;
  }

  // Check required top-level properties
  const requiredProps = ['version', 'lastUpdated', 'currentRoute', 'schoolId', 'userType', 'tourState', 'mapState', 'sessionData'];
  for (const prop of requiredProps) {
    if (!(prop in state)) {
      console.warn(`Missing required property: ${prop}`);
      return false;
    }
  }

  // Check tourState structure
  if (!state.tourState || typeof state.tourState !== 'object') {
    console.warn('Invalid tourState structure');
    return false;
  }

  const requiredTourProps = ['stops', 'selectedInterests', 'visitedLocations', 'currentStopIndex', 'tourStarted', 'tourFinished'];
  for (const prop of requiredTourProps) {
    if (!(prop in state.tourState)) {
      console.warn(`Missing required tourState property: ${prop}`);
      return false;
    }
  }

  return true;
}

/**
 * Get the latest state version
 */
export function getLatestStateVersion(): StateVersion {
  return '1.0.0';
}

/**
 * Check if a state version is supported
 */
export function isVersionSupported(version: string): version is StateVersion {
  return version in STATE_VERSIONS;
}
