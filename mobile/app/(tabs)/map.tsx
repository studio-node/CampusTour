import { IconSymbol } from '@/components/ui/IconSymbol';
import { Location, Region, locationService, schoolService, userTypeService, UserType } from '@/services/supabase';
import { appStateManager, PersistedAppState } from '@/services/appStateManager';
import { wsManager } from '@/services/ws';
import * as ExpoLocation from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Overlay, Polygon, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import HamburgerMenu from '@/components/HamburgerMenu';
import RaiseHandNotificationModal from '@/components/RaiseHandNotificationModal';
import { useRaiseHand } from '@/contexts/RaiseHandContext';
import { parseDeadzonesFromSchool } from '@/services/deadzones';
import { fetchWalkingRoute } from '@/services/directionsService';

// Define the location type based on our supabase service
type LocationItem = Location;

// Default fallback region (Utah Tech University campus)
const FALLBACK_REGION: Region = {
  latitude: 37.10191426300314, 
  longitude: -113.56546471154138,
  latitudeDelta: 0.007,
  longitudeDelta: 0.007,
};

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  // const [selectedBuilding, setSelectedBuilding] = useState<LocationItem | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [defaultRegion, setDefaultRegion] = useState<Region>(FALLBACK_REGION);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000'); // Utah Tech red as fallback
  
  // Map state tracking
  const [currentMapRegion, setCurrentMapRegion] = useState<Region>(FALLBACK_REGION);
  const [lastViewedLocationId, setLastViewedLocationId] = useState<string | null>(null);
  
  // Modal state for tour generation prompt
  const [showTourModal, setShowTourModal] = useState(false);
  const [hasTour, setHasTour] = useState<boolean | null>(null); // null = checking, true = has tour, false = no tour
  const [hasShownModalThisSession, setHasShownModalThisSession] = useState(false); // Track if modal was shown this session
  
  // Tour state for self-guided: next stop (first unvisited) and user type
  const [nextStop, setNextStop] = useState<LocationItem | null>(null);
  const [isSelfGuided, setIsSelfGuided] = useState(false);
  
  // Map vs Directions view (only relevant when self-guided with active tour and next stop)
  const [mapViewMode, setMapViewMode] = useState<'map' | 'directions'>('map');
  
  // Walking route for Directions view
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  
  // School deadzones for route filtering (from school.deadzones)
  const [schoolDeadzones, setSchoolDeadzones] = useState<Array<Array<{ latitude: number; longitude: number }>>>([]);
  
  // Raise hand notification state from shared context
  const { showModal: showRaiseHandModal, memberName: raiseHandMemberName, dismissModal: dismissRaiseHandModal } = useRaiseHand();

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
      
      // Get school details including coordinates, primary color, and deadzones
      const schoolDetails = await schoolService.getSchoolById(selectedSchoolId);
      if (schoolDetails) {
        // Set primary color if available
        if (schoolDetails.primary_color) {
          setPrimaryColor(schoolDetails.primary_color);
        }
        
        // Set default region if coordinates are available
        if (schoolDetails.coordinates) {
          setDefaultRegion(schoolDetails.coordinates);
        }
        
        // Set deadzones for route filtering (areas to avoid when computing walking directions)
        setSchoolDeadzones(parseDeadzonesFromSchool(schoolDetails.deadzones));
      }
    };

    getSelectedSchool();
  }, [router]);

  // Load locations from Supabase
  useEffect(() => {
    const fetchLocations = async () => {
      if (!schoolId) return;
      
      try {
        setIsLoading(true);
        const locationsData = await locationService.getLocations(schoolId);
        setLocations(locationsData);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setErrorMsg('Failed to load location data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, [schoolId]);

  // Check if we need to focus on a specific building (from params)
  useEffect(() => {
    if (params.building && typeof params.building === 'string' && locations.length > 0) {
      const buildingId = params.building;
      const building = locations.find(loc => 
        loc.id.toLowerCase() === buildingId.toLowerCase()
      );
      
      if (building && mapRef.current && mapReady) {
        // Focus on the building
        const region = {
          latitude: building.coordinates.latitude,
          longitude: building.coordinates.longitude,
          latitudeDelta: 0.002,
          longitudeDelta: 0.002,
        };
        mapRef.current.animateToRegion(region, 500);
        // setSelectedBuilding(building);
      }
    }
  }, [params.building, mapReady, locations]);

  // Request location permissions and get user location
  const requestLocationPermission = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setLocationPermissionStatus(status);
      
      if (status === 'granted') {
        try {
          const location = await ExpoLocation.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.004,
            longitudeDelta: 0.004,
          });
        } catch (error) {
          console.error('Error getting location:', error);
          // No need to set error - we'll just default to the campus center
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setErrorMsg('Error requesting location permissions');
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Load map state on mount
  useEffect(() => {
    if (schoolId) {
      loadMapState();
    }
  }, [schoolId]);

  // Save map state when it changes
  useEffect(() => {
    if (schoolId && currentMapRegion) {
      saveMapState();
    }
  }, [currentMapRegion, lastViewedLocationId, schoolId]);

  // When switching to map view, clear the route so we don't show it
  useEffect(() => {
    if (mapViewMode === 'map') {
      setRouteCoordinates(null);
    }
  }, [mapViewMode]);

  // Fetch walking route when in Directions view with user location and next stop
  useEffect(() => {
    if (mapViewMode !== 'directions' || !userLocation || !nextStop) {
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    setRouteCoordinates(null);
    const origin = { latitude: userLocation.latitude, longitude: userLocation.longitude };
    const destination = nextStop.coordinates;
    fetchWalkingRoute(origin, destination, { deadzonePolygons: schoolDeadzones }).then((result) => {
      if (cancelled) return;
      setRouteLoading(false);
      if (result?.coordinates?.length) {
        setRouteCoordinates(result.coordinates);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mapViewMode, userLocation?.latitude, userLocation?.longitude, nextStop?.id, schoolDeadzones]);

  // Fit map to route when route is loaded in Directions view
  useEffect(() => {
    if (mapViewMode !== 'directions' || !routeCoordinates?.length || !mapRef.current || !mapReady) {
      return;
    }
    const points = [...routeCoordinates];
    if (userLocation) {
      points.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
    }
    if (nextStop?.coordinates) {
      points.push(nextStop.coordinates);
    }
    mapRef.current.fitToCoordinates(points, { edgePadding: { top: 60, right: 40, bottom: 60, left: 40 }, animated: true });
  }, [mapViewMode, routeCoordinates, mapReady, nextStop?.id, userLocation?.latitude, userLocation?.longitude]);

  // Check for existing tour whenever the map screen is focused; compute next stop for self-guided
  useFocusEffect(
    React.useCallback(() => {
      const checkForTour = async () => {
        try {
          // Check if user is in an ambassador-led tour or is an ambassador
          const userType = await userTypeService.getUserType();
          const isAmbassadorLed = userType === 'ambassador-led';
          const isAmbassador = userType === 'ambassador';
          const isAmbassadorTour = isAmbassadorLed || isAmbassador;
          setIsSelfGuided(userType === 'self-guided');

          // Check for active tour using appStateManager
          const currentState = appStateManager.getCurrentState();
          let hasActiveTour = false;
          let next: LocationItem | null = null;

          if (currentState?.tourState) {
            const { stops, selectedInterests, visitedLocations } = currentState.tourState;
            hasActiveTour = stops.length > 0 && selectedInterests.length > 0;
            // Next stop = first stop not in visitedLocations (for directions view)
            if (hasActiveTour && userType === 'self-guided') {
              const firstUnvisited = stops.find((stop) => !visitedLocations?.includes(stop.id));
              next = firstUnvisited ?? null;
            }
          }

          setHasTour(hasActiveTour);
          setNextStop(next);
          
          // Don't show modal for ambassador-led tours or ambassadors, as they follow a different flow
          // Show modal only for self-guided users with no tour and hasn't been shown this session
          if (!isAmbassadorTour && !hasActiveTour && !hasShownModalThisSession) {
            setShowTourModal(true);
          }
        } catch (error) {
          console.error('Error checking for tour:', error);
          const userType = await userTypeService.getUserType();
          const isAmbassadorLed = userType === 'ambassador-led';
          const isAmbassador = userType === 'ambassador';
          const isAmbassadorTour = isAmbassadorLed || isAmbassador;
          
          setHasTour(false);
          setNextStop(null);
          setIsSelfGuided(userType === 'self-guided');
          // Only show modal for self-guided users if hasn't been shown this session
          if (!isAmbassadorTour && !hasShownModalThisSession) {
            setShowTourModal(true);
          }
        }
      };

      checkForTour();
    }, [hasShownModalThisSession])
  );

  // Function to handle the "recenter map" button press
  const handleRecenterPress = () => {
    if (mapRef.current) {
      if (userLocation) {
        mapRef.current.animateToRegion(userLocation, 500);
      } else {
        // If user location is not available, center on the default region
        mapRef.current.animateToRegion(defaultRegion, 500);
      }
    }
  };

  // Function to handle the "Zoom Out" button press
  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(defaultRegion, 500);
    }
  };
  
  // Handle marker press - Navigate to building info page
  const handleMarkerPress = (location: LocationItem) => {
    console.log(`Selected location: ${location.name}`);
    setLastViewedLocationId(location.id);
    router.push({
      pathname: '/building/[id]',
      params: { id: location.id }
    });
  };

  // Handle callout press - This provides a backup way to navigate if needed
  const handleCalloutPress = (location: LocationItem) => {
    handleMarkerPress(location);
  };

  // Load map state from app state manager
  const loadMapState = async () => {
    try {
      const persistedState = appStateManager.getCurrentState();
      
      if (!persistedState) {
        console.log('No persisted map state found, using defaults');
        return;
      }

      const { mapState } = persistedState;
      
      // Restore map region
      if (mapState.region) {
        setCurrentMapRegion(mapState.region);
      }
      
      // Restore last viewed location
      if (mapState.lastViewedLocationId) {
        setLastViewedLocationId(mapState.lastViewedLocationId);
      }
      
      console.log('Map state restored from app state manager');
    } catch (error) {
      console.error('Error loading map state:', error);
    }
  };

  // Save map state to app state manager
  const saveMapState = async () => {
    try {
      if (!schoolId) return;

      // Get current state or create new one
      let currentState = appStateManager.getCurrentState();
      if (!currentState) {
        // Create new state if none exists
        appStateManager.updateState({
          schoolId,
          userType: await userTypeService.getUserType(),
          currentRoute: '/(tabs)/map',
        });
        currentState = appStateManager.getCurrentState();
      }

      if (!currentState) return;

      // Update map state
      const updatedState: Partial<PersistedAppState> = {
        currentRoute: '/(tabs)/map',
        mapState: {
          region: currentMapRegion,
          lastViewedLocationId,
        },
      };

      appStateManager.updateState(updatedState);
      
      // console.log('Map state saved to app state manager');
    } catch (error) {
      console.error('Error saving map state:', error);
    }
  };

  // Handle map region change
  const handleMapRegionChange = (region: Region) => {
    setCurrentMapRegion(region);
  };

  // Determine which map provider to use based on platform
  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

  // Handle school change
  const handleRestartExperience = async () => {
    await schoolService.clearSelectedSchool();
    router.replace('/');
  };

  // Handle modal actions
  const handleGoToTour = () => {
    setShowTourModal(false);
    setHasShownModalThisSession(true);
    router.push('/tour');
  };

  const handleDismissModal = () => {
    setShowTourModal(false);
    setHasShownModalThisSession(true);
  };

  // Create dynamic styles with the primary color
  const dynamicStyles = {
    headerBorder: {
      borderBottomColor: primaryColor,
    },
    detailsButtonText: {
      color: primaryColor,
    },
    recenterButton: {
      backgroundColor: primaryColor,
    },
    changeSchoolButton: {
      backgroundColor: '#666', // Keep this neutral
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      marginRight: 15,
    },
    modalPrimaryButton: {
      backgroundColor: primaryColor,
    },
    viewToggleButtonActive: {
      backgroundColor: primaryColor,
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <HamburgerMenu primaryColor={primaryColor} />
        <Text style={styles.headerText}>Map</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={dynamicStyles.changeSchoolButton}
            onPress={handleRestartExperience}
          >
            <Text style={styles.buttonTextSmall}>Back to Start</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleZoomOut}
          >
            <Text style={styles.resetButtonText}>See Campus</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map / Directions toggle: only for self-guided with active tour and a next stop */}
      {isSelfGuided && hasTour && nextStop !== null && (
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              mapViewMode === 'map' && [styles.viewToggleButtonActive, dynamicStyles.viewToggleButtonActive],
            ]}
            onPress={() => setMapViewMode('map')}
          >
            <IconSymbol name="map" size={16} color={mapViewMode === 'map' ? '#fff' : '#666'} />
            <Text style={[styles.viewToggleLabel, mapViewMode === 'map' && styles.viewToggleLabelActive]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              mapViewMode === 'directions' && [styles.viewToggleButtonActive, dynamicStyles.viewToggleButtonActive],
            ]}
            onPress={() => setMapViewMode('directions')}
          >
            <IconSymbol name="figure.walk" size={16} color={mapViewMode === 'directions' ? '#fff' : '#666'} />
            <Text style={[styles.viewToggleLabel, mapViewMode === 'directions' && styles.viewToggleLabelActive]}>Directions</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.mapContainer}>
        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading map data...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={mapProvider}
            mapType="standard"
            initialRegion={currentMapRegion}
            region={currentMapRegion}
            showsUserLocation={locationPermissionStatus === 'granted'}
            showsMyLocationButton={false}
            showsCompass={true}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            onMapReady={() => setMapReady(true)}
            onRegionChangeComplete={handleMapRegionChange}
          >
            <Overlay image={require('@/assets/images/buildings_overlay_3.png')} bounds={[
              // [ 37.09798939695663, -113.57067719268706 ],
              [ 37.09755260505361, -113.57264516743909 ],
              [ 37.10815778141483, -113.55942540472526 ]
              // [ 37.097589, -113.572708 ]
              // new bottom left: 37.10815778141483, -113.55942540472526
            ]}  />
            {mapViewMode === 'directions' && routeCoordinates && routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={primaryColor}
                strokeWidth={6}
              />
            )}
            {/* Debug: translucent red deadzones (only in Directions view) */}
            {mapViewMode === 'directions' &&
              schoolDeadzones.map((polygon, idx) => (
                <Polygon
                  key={`deadzone-${idx}`}
                  coordinates={polygon}
                  fillColor="rgba(255, 0, 0, 0.35)"
                  strokeColor="rgba(200, 0, 0, 0.8)"
                  strokeWidth={2}
                />
              ))}
            {locations.map((location) => (
              <Marker
                key={location.id}
                coordinate={location.coordinates}
                title={location.name}
                description={location.description}
                pinColor={locationService.getMarkerColor(location.type)}
              >
                <Callout tooltip={false} onPress={() => handleCalloutPress(location)}>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{location.name}</Text>
                    <Text style={styles.calloutDescription} numberOfLines={2}>{location.description}</Text>
                    <View style={styles.calloutButtonContainer}>
                      <TouchableOpacity 
                        style={styles.detailsButton}
                        onPress={() => handleCalloutPress(location)}
                      >
                        <Text style={dynamicStyles.detailsButtonText}>Details</Text>
                        <IconSymbol name="chevron.right" size={14} color={primaryColor} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        )}

        {/* Loading indicator for Directions view */}
        {mapViewMode === 'directions' && routeLoading && (
          <View style={styles.routeLoadingOverlay}>
            <Text style={styles.routeLoadingText}>Loading route…</Text>
          </View>
        )}

        {/* Directions view: no location — prompt to enable */}
        {mapViewMode === 'directions' && nextStop && locationPermissionStatus !== 'granted' && !routeLoading && (
          <View style={styles.routeMessageOverlay}>
            <Text style={styles.routeMessageText}>Enable location to see route</Text>
          </View>
        )}

        {/* Directions view: API failed or no key */}
        {mapViewMode === 'directions' && nextStop && userLocation && !routeLoading && !routeCoordinates && (
          <View style={styles.routeMessageOverlay}>
            <Text style={styles.routeMessageText}>Directions unavailable</Text>
          </View>
        )}

        {/* Recenter button */}
        <TouchableOpacity
          style={[styles.recenterButton, dynamicStyles.recenterButton]}
          onPress={handleRecenterPress}
        >
          <IconSymbol name="location.fill" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Show my Location</Text>
        </TouchableOpacity>
      </View>

      {/* Tour Generation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTourModal}
        onRequestClose={handleDismissModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <IconSymbol name="sparkle" size={48} color={primaryColor} style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Start Your Campus Tour</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              You don't have an active tour yet. Would you like to generate a personalized tour based on your interests?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalPrimaryButton, dynamicStyles.modalPrimaryButton]}
                onPress={handleGoToTour}
              >
                <IconSymbol name="figure.walk" size={16} color="white" style={styles.modalButtonIcon} />
                <Text style={styles.modalPrimaryButtonText}>Generate Tour</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalSecondaryButton}
                onPress={handleDismissModal}
              >
                <Text style={styles.modalSecondaryButtonText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Raise Hand Notification Modal for Ambassadors */}
      <RaiseHandNotificationModal
        visible={showRaiseHandModal}
        memberName={raiseHandMemberName}
        primaryColor={primaryColor}
        onClose={dismissRaiseHandModal}
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    padding: 16,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 70, // Increased to be above tab bar
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  calloutContainer: {
    width: 300,
    padding: 6,
    borderRadius: 8,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  calloutButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#282828',
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#444',
  },
  viewToggleButtonActive: {
    backgroundColor: '#990000',
  },
  viewToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  viewToggleLabelActive: {
    color: '#fff',
  },
  routeLoadingOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    alignItems: 'center',
  },
  routeLoadingText: {
    color: '#fff',
    fontSize: 14,
  },
  routeMessageOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    alignItems: 'center',
  },
  routeMessageText: {
    color: '#fff',
    fontSize: 14,
  },
  buttonTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalButtonIcon: {
    marginRight: 8,
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSecondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalSecondaryButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
});
