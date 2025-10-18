import { IconSymbol } from '@/components/ui/IconSymbol';
import { analyticsService, Location, locationService, schoolService, userTypeService, UserType, tourGroupSelectionService, authService } from '@/services/supabase';
import { wsManager } from '@/services/ws';
import { appStateManager, PersistedAppState } from '@/services/appStateManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HamburgerMenu from '@/components/HamburgerMenu';
import StateDebugger from '@/components/StateDebugger';

// Storage keys
const STORAGE_KEYS = {
  TOUR_STOPS: 'tourStops',
  SELECTED_INTERESTS: 'selectedInterests',
  SHOW_INTEREST_SELECTION: 'showInterestSelection',
  VISITED_LOCATIONS: 'visitedLocations',
  TOUR_STARTED: 'tourStarted',
  TOUR_FINISHED: 'tourFinished',
  LOCATION_PERMISSION_STATUS: 'locationPermissionStatus',
  CURRENT_LOCATION_ID: 'currentLocationId',
  LOCATION_ENTRY_TIMES: 'locationEntryTimes',
  PREVIOUSLY_ENTERED_LOCATIONS: 'previouslyEnteredLocations',
  IS_EDITING_TOUR: 'isEditingTour'
};

// Define the interface for a tour stop
type TourStop = Location;

// Define available interests
interface Interest {
  id: string;
  name: string;
}

// Static list of tour interests
const tourInterests: Interest[] = [
  { id: "science_and_labs", name: "🔬 Science & Labs" },
  { id: "engineering", name: "⚙️ Engineering" },
  { id: "business", name: "💼 Business" },
  { id: "computing", name: "💻 Computing" },
  { id: "arts_and_theater", name: "🎭 Arts & Theater" },
  { id: "music", name: "🎶 Music" },
  { id: "athletics", name: "🏟️ Athletics" },
  { id: "recreation_and_fitness", name: "🏋️ Recreation & Fitness" },
  { id: "dorm-life", name: "🛏️ Dorm Life" },
  { id: "campus-dining", name: "🍔 Campus Dining" },
  { id: "clubs", name: "🧑‍🤝‍🧑 Student Clubs" },
  { id: "library_and_study-spaces", name: "📚 Library & Study Spaces" },
  { id: "nature_and_outdoor-spots", name: "🌳 Nature & Outdoor Spots" },
  { id: "history_and_landmarks", name: "🏰 History & Landmarks" },
  { id: "health_and_wellness", name: "🩺 Health & Wellness" },
  { id: "faith_and_spirituality", name: "✝️ Faith & Spirituality" },
  { id: "community", name: "🤝 Community" },
  { id: "career-services", name: "🎓 Career Services" }
];

// Component for an individual tour stop item
const TourStopItem = ({ 
  item, 
  onDetailsPress, 
  onLocationPress,
  visited,
  onToggleVisited,
  primaryColor,
  isEditing,
  isAmbassador,
  canEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}: { 
  item: TourStop; 
  onDetailsPress: (id: string) => void;
  onLocationPress: (id: string) => void;
  visited: boolean;
  onToggleVisited: (id: string) => void;
  primaryColor: string;
  isEditing: boolean;
  isAmbassador: boolean;
  canEdit: boolean;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) => {
  // Create dynamic styles with the primary color
  const dynamicStyles = {
    checkboxContainer: {
      borderColor: primaryColor
    },
    checkboxContainerChecked: {
      backgroundColor: primaryColor,
      borderColor: primaryColor
    },
    locationButton: {
      backgroundColor: primaryColor
    }
  };

  return (
    <View
      style={styles.tourStopCard}
    >
        
        {item.image ? (
          <Image 
            source={{ uri: item.image }} 
            style={styles.tourStopImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.tourStopImagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Building Image</Text>
          </View>
        )}
        
        <View style={styles.tourStopInfo}>
          <View style={styles.tourStopHeader}>
            {!isEditing && (
              <TouchableOpacity 
                style={[
                  styles.checkboxContainer, 
                  dynamicStyles.checkboxContainer,
                  visited && dynamicStyles.checkboxContainerChecked,
                  !canEdit && styles.checkboxContainerDisabled
                ]} 
                onPress={canEdit ? () => onToggleVisited(item.id) : undefined}
                disabled={!canEdit}
              >
                {visited && <IconSymbol name="checkmark" size={14} color="white" />}
              </TouchableOpacity>
            )}
            <Text style={styles.tourStopName}>{item.name}</Text>
            {!isAmbassador && visited && <Text style={styles.visitedText}>Visited</Text>}
          </View>
          <Text style={styles.tourStopDescription} numberOfLines={2}>{item.description}</Text>
          <View style={styles.tourStopButtons}>
            
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => onDetailsPress(item.id)}
              >
              <IconSymbol name="info.circle.fill" size={12} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Details</Text>
            </TouchableOpacity>
              
            {!isEditing && (
              <TouchableOpacity 
              style={[styles.locationButton, dynamicStyles.locationButton]}
              onPress={() => onLocationPress(item.id)}
              >
                <IconSymbol name="location.fill" size={12} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Location</Text>
              </TouchableOpacity>
            )}
            {isEditing && canEdit && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => onDelete(item.id)}
              >
                <IconSymbol name="trash.fill" size={12} color="white" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            )}
            {isEditing && canEdit && (
              <View style={styles.reorderButtons}>
                <TouchableOpacity 
                  style={styles.reorderButton}
                  onPress={() => onMoveUp(item.id)}
                >
                  <IconSymbol name="chevron.up" size={12} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.reorderButton}
                  onPress={() => onMoveDown(item.id)}
                >
                  <IconSymbol name="chevron.down" size={12} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
  );
};

// Interest tag component
const InterestTag = ({ 
  interest, 
  selected, 
  onPress,
  primaryColor
}: { 
  interest: Interest; 
  selected: boolean;
  onPress: () => void;
  primaryColor: string;
}) => {
  // Create dynamic styles with the primary color
  const dynamicStyles = {
    interestTagSelected: {
      backgroundColor: primaryColor
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.interestTag,
        selected && dynamicStyles.interestTagSelected
      ]}
      onPress={onPress}
    >
      <Text 
        style={[
          styles.interestTagText,
          selected && styles.interestTagTextSelected
        ]}
      >
        {interest.name}
      </Text>
    </TouchableOpacity>
  );
};

export default function TourScreen() {
  const router = useRouter();
  const [showInterestSelection, setShowInterestSelection] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [tourStops, setTourStops] = useState<TourStop[]>([]);
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000'); // Utah Tech red as fallback
  const [isGeneratingTour, setIsGeneratingTour] = useState<boolean>(false);
  const [userType, setUserType] = useState<UserType>(null);
  const isAmbassador: boolean = userType === 'ambassador';
  const isAmbassadorLedMember: boolean = userType === 'ambassador-led' && !isAmbassador;
  const canEditTour: boolean = isAmbassador || userType === 'self-guided';
  
  // Tour update notification state
  const [tourUpdatedByAmbassador, setTourUpdatedByAmbassador] = useState<boolean>(false);
  
  // Location tracking and geofencing state
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  const [tourStarted, setTourStarted] = useState<boolean>(false);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const [processingTourStart, setProcessingTourStart] = useState<boolean>(false);
  const [tourFinished, setTourFinished] = useState<boolean>(false);
  
  // Duration tracking state
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [locationEntryTimes, setLocationEntryTimes] = useState<{[locationId: string]: number}>({});
  const [previouslyEnteredLocations, setPreviouslyEnteredLocations] = useState<Set<string>>(new Set());

  // Tour editing mode state
  const [isEditingTour, setIsEditingTour] = useState<boolean>(false);

  // Debug state (for development/testing)
  const [showDebugger, setShowDebugger] = useState<boolean>(false);


  // Get the selected school ID and details
  useEffect(() => {
    const getSelectedSchool = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      if (!selectedSchoolId) {
        // If no school is selected, redirect to the school selection screen
        router.replace('/');
        return;
      }
      
      setSchoolId(selectedSchoolId);
      
      // Get school details including primary color
      const schoolDetails = await schoolService.getSchoolById(selectedSchoolId);
      if (schoolDetails && schoolDetails.primary_color) {
        setPrimaryColor(schoolDetails.primary_color);
      }

      // Determine user type and set edit gating
      const currentUserType = await userTypeService.getUserType();
      setUserType(currentUserType);
      if (currentUserType === 'ambassador-led') {
        setShowInterestSelection(false);
      }

      // Establish WS and authenticate if logged in
      wsManager.connect();
      const u = await authService.getStoredUser();
      if (u?.id) wsManager.authenticate(u.id);
    };

    getSelectedSchool();
  }, [router]);



  // Load saved state and fetch data when the component mounts
  useEffect(() => {
    const initializeTourData = async () => {
      if (!schoolId) return;
      
      try {
        setIsLoading(true);
        
        // Fetch locations from Supabase
        const locationsData = await locationService.getLocations(schoolId);
        
        // Use static tour interests
        setAvailableInterests(tourInterests);
        
        // Now load saved state
        await loadSavedState();
      } catch (error) {
        console.error('Error initializing tour data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeTourData();
  }, [schoolId]);

  // Save state when it changes
  useEffect(() => {
    if (!isLoading) {
      saveTourState();
    }
  }, [showInterestSelection, selectedInterests, tourStops, visitedLocations, tourStarted, tourFinished, processingTourStart, locationPermissionStatus, currentLocationId, locationEntryTimes, previouslyEnteredLocations, isEditingTour, isLoading]);

  // When ambassador updates state, broadcast to members
  useEffect(() => {
    const syncStateToServer = async () => {
      if (!isAmbassador) return;
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) return;
      wsManager.send('tour:state_update', {
        tourId,
        state: {
          current_location_id: currentLocationId,
          visited_locations: visitedLocations,
        }
      });
    };
    syncStateToServer();
  }, [isAmbassador, currentLocationId, visitedLocations]);

  // Listen for tour list changes from ambassador (for ambassador-led members)
  useEffect(() => {
    if (!isAmbassadorLedMember) return;

    const handleTourListChanged = (data: any) => {
      const { newTourStructure } = data.payload;
      if (newTourStructure && newTourStructure.tour_stops) {
        console.log('Received tour list changes from ambassador:', newTourStructure);
         
        // Update the local tour stops with the ambassador's changes
        setTourStops(newTourStructure.tour_stops);
        
        // Update selected interests if they changed
        if (newTourStructure.interests_used) {
          setSelectedInterests(newTourStructure.interests_used);
        }
        
        // Update visited locations if they changed
        if (newTourStructure.visited_locations) {
          setVisitedLocations(newTourStructure.visited_locations);
        }
        
        // Show notification that tour was updated
        setTourUpdatedByAmbassador(true);
        
        // Hide notification after 5 seconds
        setTimeout(() => setTourUpdatedByAmbassador(false), 5000);
        
        console.log('Tour updated by ambassador');
      }
    };

    const handleTourStateUpdated = (data: any) => {
      const { state } = data;
      if (state) {
        console.log('Received tour state update from ambassador:', state);
        
        // Update visited locations if they changed
        if (state.visited_locations) {
          setVisitedLocations(state.visited_locations);
          console.log('Visited locations updated by ambassador:', state.visited_locations);
          
          // Show notification that tour state was updated
          setTourUpdatedByAmbassador(true);
          
          // Hide notification after 5 seconds
          setTimeout(() => setTourUpdatedByAmbassador(false), 5000);
        }
        
        // Update current location if it changed
        if (state.current_location_id !== undefined) {
          setCurrentLocationId(state.current_location_id);
          console.log('Current location updated by ambassador:', state.current_location_id);
        }
      }
    };

    wsManager.on('tour_list_changed', handleTourListChanged);
    wsManager.on('tour_state_updated', handleTourStateUpdated);

    return () => {
      wsManager.off('tour_list_changed', handleTourListChanged);
      wsManager.off('tour_state_updated', handleTourStateUpdated);
    };
  }, [isAmbassadorLedMember]);

  // Listen for WebSocket events (for ambassadors to confirm their changes)
  useEffect(() => {
    if (!isAmbassador) return;

    const handleWebSocketMessage = (data: any) => {
      // Log all WebSocket messages for debugging
      console.log('WebSocket message received:', data);
    };

    const handleWebSocketError = (error: any) => {
      console.error('WebSocket error:', error);
    };

    wsManager.on('message', handleWebSocketMessage);
    wsManager.on('error', handleWebSocketError);

    return () => {
      wsManager.off('message', handleWebSocketMessage);
      wsManager.off('error', handleWebSocketError);
    };
  }, [isAmbassador]);

  // Load saved state from app state manager
  const loadSavedState = async () => {
    try {
      const persistedState = appStateManager.getCurrentState();
      
      if (!persistedState) {
        console.log('No persisted state found, using defaults');
        return;
      }

      const { tourState } = persistedState;
      
      // Restore tour state
      setShowInterestSelection(tourState.stops.length === 0); // Show interest selection if no stops
      setSelectedInterests(tourState.selectedInterests);
      setTourStops(tourState.stops);
      setVisitedLocations(tourState.visitedLocations);
      setTourStarted(tourState.tourStarted);
      setTourFinished(tourState.tourFinished);
      setIsEditingTour(tourState.isEditingTour);
      
      // Restore location tracking state
      if (persistedState.tourProgress) {
        setCurrentLocationId(persistedState.tourProgress.currentStopIndex.toString());
      }
      
      console.log('Tour state restored from app state manager');
    } catch (error) {
      console.error('Error loading saved tour state:', error);
    }
  };

  // Save tour state to app state manager
  const saveTourState = async () => {
    try {
      if (!schoolId) return;

      // Get current state or create new one
      let currentState = appStateManager.getCurrentState();
      if (!currentState) {
        // Create new state if none exists
        appStateManager.updateState({
          schoolId,
          userType,
          currentRoute: '/(tabs)/tour',
        });
        currentState = appStateManager.getCurrentState();
      }

      if (!currentState) return;

      // Update tour state
      const updatedState: Partial<PersistedAppState> = {
        currentRoute: '/(tabs)/tour',
        tourState: {
          stops: tourStops,
          selectedInterests,
          visitedLocations,
          currentStopIndex: tourStops.findIndex(stop => stop.id === currentLocationId) || 0,
          tourStarted,
          tourFinished,
          isEditingTour,
        },
        tourProgress: {
          totalStops: tourStops.length,
          visitedStops: visitedLocations.length,
          currentStopIndex: tourStops.findIndex(stop => stop.id === currentLocationId) || 0,
          tourStartedAt: currentState.tourProgress?.tourStartedAt || new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        },
      };

      appStateManager.updateState(updatedState);
      
      // Also save to AsyncStorage for backward compatibility
      await AsyncStorage.setItem(STORAGE_KEYS.SHOW_INTEREST_SELECTION, JSON.stringify(showInterestSelection));
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_INTERESTS, JSON.stringify(selectedInterests));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_STOPS, JSON.stringify(tourStops));
      await AsyncStorage.setItem(STORAGE_KEYS.VISITED_LOCATIONS, JSON.stringify(visitedLocations));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_STARTED, JSON.stringify(tourStarted));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_FINISHED, JSON.stringify(tourFinished));
      await AsyncStorage.setItem(STORAGE_KEYS.IS_EDITING_TOUR, JSON.stringify(isEditingTour));
      
      if (locationPermissionStatus) {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION_STATUS, locationPermissionStatus);
      }
      if (currentLocationId) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_LOCATION_ID, currentLocationId);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_ENTRY_TIMES, JSON.stringify(locationEntryTimes));
      await AsyncStorage.setItem(STORAGE_KEYS.PREVIOUSLY_ENTERED_LOCATIONS, JSON.stringify(Array.from(previouslyEnteredLocations)));
    } catch (error) {
      console.error('Error saving tour state:', error);
    }
  };

  // Get tour stops, optionally filtering by selected interests
  const getTourStops = async (filterByInterests = false): Promise<TourStop[]> => {
    if (!schoolId) return [];
    
    try {
      const allTourStops = await locationService.getTourStops(schoolId);
      
      if (!filterByInterests || selectedInterests.length === 0) {
        return allTourStops.filter(stop => stop.isTourStop);
      }
      
      // Filter by selected interests
      return allTourStops.filter(stop => 
        stop.interests.some(interest => 
          selectedInterests.includes(interest.toLowerCase().replace(/\s+/g, '-'))
        )
      );
    } catch (error) {
      console.error('Error getting tour stops:', error);
      return [];
    }
  };

  // Toggle an interest
  const toggleInterest = (interestId: string) => {
    if (!canEditTour) return;
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(id => id !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  // Generate tour based on selected interests
  const generateTour = async () => {
    if (!canEditTour) return;
    setIsGeneratingTour(true); // Set loading state
    
    try {
      // Export analytics event for interests chosen
      if (schoolId && selectedInterests.length > 0) {
        // Convert interest IDs back to display names for metadata
        const selectedInterestNames = selectedInterests.map(interestId => {
          const interest = availableInterests.find(i => i.id === interestId);
          return interest ? interest.name : interestId;
        });
        
        await analyticsService.exportInterestsChosen(schoolId, selectedInterestNames);
      }
      
      // Call server endpoint to generate tour
      if (!schoolId || selectedInterests.length === 0) {
        console.log('❌ Falling back to local generation because:');

        // Fall back to local filtering if no school or no interests
        const filteredTourStops = await getTourStops(true);
        setTourStops(filteredTourStops);
        setShowInterestSelection(false);
        setIsGeneratingTour(false);
        return;
      }

      // Convert interest IDs back to display names for the API call
      const selectedInterestNames = selectedInterests.map(interestId => {
        const interest = availableInterests.find(i => i.id === interestId);
        return interest ? interest.name : interestId;
      });

      const requestBody = {
        school_id: schoolId,
        interests: selectedInterestNames
      };


      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for AI processing

      const response = await fetch('https://campustourbackend.onrender.com/generate-tour', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId); // Clear timeout if request completes


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with status: ${response.status} - ${errorText}`);
      }

      const tourLocationIds = await response.json();
      console.log('✅ Server returned tour location IDs:', tourLocationIds);

      // Get all locations for the school
      const allLocations = await locationService.getTourStops(schoolId);
      
      // Filter locations to only include those returned by the server, in the order returned
      const orderedTourStops = tourLocationIds
        .map((locationId: string) => allLocations.find((location: Location) => location.id === locationId))
        .filter((location: Location | undefined): location is Location => location !== undefined); // Remove any undefined results

      
      setTourStops(orderedTourStops);
      setShowInterestSelection(false);
      setIsGeneratingTour(false);
    } catch (error) {
      // Log error message without the full HTML content
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error generating tour:', errorMessage);
      
      // Check if it's a timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏰ Server request timed out (AI processing takes longer than 90 seconds)');
        console.log('🔄 The server might still be processing your request in the background');
      }
      
      // Fall back to local filtering if server call fails
      console.log('🔄 Falling back to local tour generation');
      try {
        const filteredTourStops = await getTourStops(true);
        setTourStops(filteredTourStops);
        setShowInterestSelection(false);
        setIsGeneratingTour(false);
        console.log('✅ Local tour generation completed as fallback');
      } catch (fallbackError) {
        console.error('❌ Error with fallback tour generation:', fallbackError);
        // If everything fails, show default tour
        console.log('🔄 Falling back to default tour');
        const defaultTourStops = await getTourStops(false);
        setTourStops(defaultTourStops);
        setShowInterestSelection(false);
        setIsGeneratingTour(false);
      }
    }
  };

  // Show default tour
  const showDefaultTour = async () => {
    if (!canEditTour) return;
    const defaultTourStops = await getTourStops(false);
    setTourStops(defaultTourStops);
    setShowInterestSelection(false);
  };

  // Reset tour function - also reset tour started status
  const resetTour = () => {
    if (!canEditTour) return;
    setShowInterestSelection(true);
    setSelectedInterests([]);
    setTourStops([]);
    setVisitedLocations([]);
    setTourStarted(false);
    setTourFinished(false);
    setProcessingTourStart(false);
    setCurrentLocationId(null);
    setLocationEntryTimes({});
    setPreviouslyEnteredLocations(new Set());
    setIsEditingTour(false);
    stopLocationTracking();
  };

  // Toggle the visited status of a location
  const toggleVisited = (locationId: string) => {
    if (visitedLocations.includes(locationId)) {
      setVisitedLocations(visitedLocations.filter(id => id !== locationId));
    } else {
      const newVisitedLocations = [...visitedLocations, locationId];
      setVisitedLocations(newVisitedLocations);
      
      // Check if tour is now complete
      checkTourCompletion(newVisitedLocations);
    }
  };

  // Toggle tour editing mode
  const toggleEditingMode = () => {
    if (!canEditTour) {
      return;
    };

    if (isEditingTour) {
      // User is exiting edit mode - save changes
      saveTourChanges();
    }
    
    setIsEditingTour(!isEditingTour);
  };

  const cancelEditing = () => {
    // Get the current tour stops before editing started
    const currentTourStops = [...tourStops];
    setIsEditingTour(false);
    // Reset tour stops to what they were before editing
    setTourStops(currentTourStops);
  };

  // Save tour changes when exiting edit mode
  const saveTourChanges = async () => {
    try {
      // Save the current tour state to storage
      await saveTourState();
      
      // If this is an ambassador, broadcast the updated tour to group members
      if (isAmbassador) {
        const tourId = await tourGroupSelectionService.getSelectedTourGroup();
        if (tourId) {
          // Send tour list changed event for immediate member updates
          wsManager.send('tour:tour-list-changed', {
            tourId,
            newTourStructure: {
              tour_stops: tourStops,
              interests_used: selectedInterests,
              visited_locations: visitedLocations, // Include checked off stops
              last_updated: new Date().toISOString()
            }
          });
        }
      }
      
      console.log('Tour changes saved successfully');
    } catch (error) {
      console.error('Error saving tour changes:', error);
    }
  };



  // Delete a tour stop
  const deleteTourStop = (locationId: string) => {
    const locationToDelete = tourStops.find(stop => stop.id === locationId);
    if (!locationToDelete) return;

    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${locationToDelete.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Remove from tour stops
            const newTourStops = tourStops.filter(stop => stop.id !== locationId);
            setTourStops(newTourStops);
            
            // If the deleted location was the current one, reset it
            if (currentLocationId === locationId) {
              setCurrentLocationId(null);
            }
            
            // If the deleted location was previously entered, remove it
            setPreviouslyEnteredLocations(prev => new Set([...prev].filter(id => id !== locationId)));
            
            // If the deleted location was visited, remove it
            setVisitedLocations(prev => prev.filter(id => id !== locationId));
            
            // Clean up entry times
            setLocationEntryTimes(prev => {
              const newEntryTimes = { ...prev };
              delete newEntryTimes[locationId];
              return newEntryTimes;
            });
            
            // If no more tour stops, finish the tour
            if (newTourStops.length === 0) {
              setTourFinished(true);
            }
          }
        }
      ]
    );
  };

  // Move a tour stop up in the list
  const moveTourStopUp = (locationId: string) => {
    const currentIndex = tourStops.findIndex(stop => stop.id === locationId);
    if (currentIndex <= 0) return; // Can't move up if already at top
    
    const newTourStops = [...tourStops];
    const temp = newTourStops[currentIndex];
    newTourStops[currentIndex] = newTourStops[currentIndex - 1];
    newTourStops[currentIndex - 1] = temp;
    
    setTourStops(newTourStops);
  };

  // Move a tour stop down in the list
  const moveTourStopDown = (locationId: string) => {
    const currentIndex = tourStops.findIndex(stop => stop.id === locationId);
    if (currentIndex >= tourStops.length - 1) return; // Can't move down if already at bottom
    
    const newTourStops = [...tourStops];
    const temp = newTourStops[currentIndex];
    newTourStops[currentIndex] = newTourStops[currentIndex + 1];
    newTourStops[currentIndex + 1] = temp;
    
    setTourStops(newTourStops);
  };

  // Check if all tour stops have been visited
  const checkTourCompletion = async (currentVisitedLocations: string[]) => {
    if (!schoolId || tourFinished || tourStops.length === 0) {
      return;
    }

    // Check if all tour stops have been visited
    const allStopsVisited = tourStops.every(stop => currentVisitedLocations.includes(stop.id));

    if (allStopsVisited) {
      console.log('All tour stops completed! Exporting tour-finish event...');
      
      try {
        const stopNames = tourStops.map(stop => stop.name);
        await analyticsService.exportTourFinish(schoolId, tourStops.length, stopNames);
        setTourFinished(true);
        console.log('Tour finished event exported successfully');
      } catch (error) {
        console.error('Error exporting tour-finish event:', error);
      }
    }
  };

  // Handle the "Details" button press
  const handleDetailsPress = (buildingId: string) => {
    router.push({
      pathname: '/building/[id]',
      params: { id: buildingId }
    });
  };

  // Handle the "Location" button press
  const handleLocationPress = (buildingId: string) => {
    router.push({
      pathname: '/map',
      params: { building: buildingId }
    });
  };

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        await startLocationTracking();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  // Start location tracking for geofencing
  const startLocationTracking = async () => {
    try {
      // Get initial location
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Start watching location changes
      const watcher = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.Balanced,
          timeInterval: 5000, // Check every 5 seconds
          distanceInterval: 10 // Only update if moved 10 meters
        },
        (newLocation) => {
          setUserLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude
          });
        }
      );

      setLocationWatcher(watcher);
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
  };

  // Check if user is within geofence of any tour stop and handle entry/exit
  const checkGeofences = async () => {
    if (!userLocation || !schoolId || tourStops.length === 0) {
      return;
    }

    let userIsAtAnyLocation = false;
    let newCurrentLocationId = null;

    // Check all tour stops to see if user is within any geofence
    for (const stop of tourStops) {
      const isWithin = analyticsService.isWithinGeofence(
        userLocation.latitude,
        userLocation.longitude,
        stop.coordinates.latitude,
        stop.coordinates.longitude
      );

      if (isWithin) {
        userIsAtAnyLocation = true;
        newCurrentLocationId = stop.id;

        // Check if this is a new location entry
        if (currentLocationId !== stop.id) {
          // User entered a new location
          console.log(`User entered geofence for: ${stop.name}`);
          
          // Record entry time
          const entryTime = Date.now();
          setLocationEntryTimes(prev => ({
            ...prev,
            [stop.id]: entryTime
          }));
          
          setPreviouslyEnteredLocations(prev => new Set([...prev, stop.id]));

          // Export tour-start event if this is the first location and tour hasn't started
          if (!tourStarted && !processingTourStart) {
            setProcessingTourStart(true);
            try {
              await analyticsService.exportTourStart(schoolId, stop.id, stop.name);
              setTourStarted(true);
              console.log('Tour started event exported successfully');
            } catch (error) {
              console.error('Error exporting tour start event:', error);
              setProcessingTourStart(false);
            }
          }
        }
        break; // User can only be at one location at a time
      }
    }

    // Handle location exit
    if (currentLocationId && (!userIsAtAnyLocation || newCurrentLocationId !== currentLocationId)) {
      // User has left the current location
      const exitedLocation = tourStops.find(stop => stop.id === currentLocationId);
      if (exitedLocation && locationEntryTimes[currentLocationId]) {
        const exitTime = Date.now();
        const entryTime = locationEntryTimes[currentLocationId];
        const durationMs = exitTime - entryTime;
        const durationSeconds = Math.round(durationMs / 1000);

        console.log(`User left ${exitedLocation.name} after ${durationSeconds} seconds`);

        // Export duration event
        try {
          await analyticsService.exportLocationDuration(
            schoolId, 
            currentLocationId, 
            exitedLocation.name, 
            durationSeconds
          );
          console.log(`Location duration event exported for ${exitedLocation.name}: ${durationSeconds}s`);
        } catch (error) {
          console.error('Error exporting location duration event:', error);
        }

        // Clean up entry time for this location
        setLocationEntryTimes(prev => {
          const newEntryTimes = { ...prev };
          delete newEntryTimes[currentLocationId];
          return newEntryTimes;
        });
      }
    }

    // Update current location
    setCurrentLocationId(newCurrentLocationId);
  };

  // Effect to handle location tracking when tour is active
  useEffect(() => {
    if (!showInterestSelection && tourStops.length > 0 && !tourStarted) {
      // Tour is active but not started yet - request location permission and start tracking
      if (locationPermissionStatus !== 'granted') {
        requestLocationPermission();
      } else {
        startLocationTracking();
      }
    }

    // Cleanup on unmount or when tour ends
    return () => {
      stopLocationTracking();
    };
  }, [showInterestSelection, tourStops, locationPermissionStatus]);

  // Effect to check geofences when user location changes
  useEffect(() => {
    if (userLocation) {
      checkGeofences();
    }
  }, [userLocation, tourStops, tourStarted, processingTourStart, currentLocationId, locationEntryTimes]);

  // Create dynamic styles with the primary color
  const dynamicStyles = {
    headerBorder: {
      borderBottomColor: primaryColor
    },
    generateTourButton: {
      backgroundColor: primaryColor
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <Text style={styles.headerText}>Campus Tour</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your tour...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <HamburgerMenu primaryColor={primaryColor} />
        <Text style={styles.headerText}>Campus Tour</Text>
        {!showInterestSelection && canEditTour && (
          <View style={styles.headerButtons}>
            {isEditingTour && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelEditing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={toggleEditingMode}
            >
              <Text style={styles.resetButtonText}>
                {isEditingTour ? 'Save Changes' : 'Edit Tour'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {tourUpdatedByAmbassador && (
        <View style={styles.tourUpdateNotification}>
          <Text style={styles.tourUpdateNotificationText}>
            🎯 Tour updated by ambassador
          </Text>
        </View>
      )}
      
      {showInterestSelection ? (
        <View style={styles.interestSelectionContainer}>
          <Text style={styles.interestSelectionText}>Select Your Interests</Text>
          <ScrollView style={styles.interestScrollContainer} contentContainerStyle={styles.interestScrollContent}>
            <View style={styles.interestTagsContainer}>
              {availableInterests.map(interest => (
                <InterestTag
                  key={interest.id}
                  interest={interest}
                  selected={selectedInterests.includes(interest.id)}
                  onPress={() => toggleInterest(interest.id)}
                  primaryColor={primaryColor}
                />
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity 
            style={[
              styles.generateTourButton,
              dynamicStyles.generateTourButton,
              (selectedInterests.length === 0 || isGeneratingTour) && styles.generateTourButtonDisabled
            ]}
            onPress={generateTour}
            disabled={selectedInterests.length === 0 || isGeneratingTour}
          >
            <Text style={styles.buttonText}>
              {isGeneratingTour ? 'Generating Tour with AI...' : 'Generate Tour'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showDefaultTour} disabled={isGeneratingTour}>
            <Text style={[styles.skipText, isGeneratingTour && styles.skipTextDisabled]}>
              {isGeneratingTour ? 'Please wait...' : 'Skip to Default Tour'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tourStops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourStopItem 
              item={item}
              onDetailsPress={handleDetailsPress}
              onLocationPress={handleLocationPress}
              visited={visitedLocations.includes(item.id)}
              onToggleVisited={toggleVisited}
              primaryColor={primaryColor}
              isEditing={isEditingTour}
              isAmbassador={isAmbassador}
              canEdit={canEditTour}
              onDelete={deleteTourStop}
              onMoveUp={isEditingTour ? moveTourStopUp : () => {}}
              onMoveDown={isEditingTour ? moveTourStopDown : () => {}}
            />
          )}
          style={styles.tourList}
          contentContainerStyle={styles.tourListContent}
          ListHeaderComponent={
            <View style={styles.tourHeaderContainer}>
              <Text style={styles.tourHeaderText}>Your Tour</Text>
              {isEditingTour && <Text style={styles.editingHintText}>Use arrows to reorder</Text>}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyTourContainer}>
              <Text style={styles.emptyTourText}>No buildings match your selected interests.</Text>
              <TouchableOpacity 
                style={[styles.generateTourButton, dynamicStyles.generateTourButton]}
                onPress={resetTour}
              >
                <Text style={styles.buttonText}>Select Different Interests</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
      
      {/* Debug State Debugger - Triple tap to show */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => setShowDebugger(true)}
        onLongPress={() => setShowDebugger(true)}
      >
        <Text style={styles.debugButtonText}>🐛</Text>
      </TouchableOpacity>
      
      <StateDebugger
        visible={showDebugger}
        onClose={() => setShowDebugger(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  header: {
    borderBottomWidth: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 15,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  interestSelectionContainer: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    height: '82%',
  },
  interestSelectionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  interestScrollContainer: {
    width: '100%',
    backgroundColor: '#D3D3D3',
    borderRadius: 16,
  },
  interestScrollContent: {
    paddingVertical: 8,
  },
  interestTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  interestTag: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: 14,
    color: '#333333',
  },
  interestTagTextSelected: {
    color: '#FFFFFF',
  },
  generateTourButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateTourButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  skipText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
  skipTextDisabled: {
    color: '#CCCCCC',
    opacity: 0.5,
  },
  tourList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tourListContent: {
    paddingBottom: 50, // Adjust this value based on the height of the tab bar
  },
  tourHeaderContainer: {
    paddingVertical: 6,
    marginBottom: 15,
  },
  tourHeaderText: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  deleteButton: {
    backgroundColor: '#D22B2B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyTourContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTourText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  tourStopCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    overflow: 'hidden',
  },
  tourStopImage: {
    width: 100,
    backgroundColor: '#DDDDDD',
  },
  tourStopImagePlaceholder: {
    width: 100,
    backgroundColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  tourStopInfo: {
    flex: 1,
    padding: 12,
  },
  tourStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tourStopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  tourStopDescription: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 12,
  },
  tourStopButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  detailsButton: {
    backgroundColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxContainerDisabled: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editingHintText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 4,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  reorderButton: {
    padding: 4,
    backgroundColor: '#666666',
    borderRadius: 4,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tourUpdateNotification: {
    backgroundColor: '#FFD700', // Gold color for notification
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  tourUpdateNotificationText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666666',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  visitedText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: 'bold',
  },
  debugButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  debugButtonText: {
    fontSize: 20,
  },
});
