import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  Location,
  Region,
  analyticsService,
  leadsService,
  locationService,
  schoolService,
  tourGroupSelectionService,
  userTypeService,
} from '@/services/supabase';
import { appStateManager } from '@/services/appStateManager';
import { getHighlightedLocationIdForCurrentTabLogic } from '@/services/currentLocationHighlight';
import { wsManager } from '@/services/ws';
import * as ExpoLocation from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, {
  Callout,
  CalloutSubview,
  Marker,
  Overlay,
  Polygon,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import HamburgerMenu from '@/components/HamburgerMenu';
import { LocationMapPin } from '@/components/LocationMapPin';
import { useTourPause } from '@/contexts/TourPauseContext';
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

function pickSearchParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function wantsDirectionsParam(dir: string | undefined): boolean {
  return dir === '1' || dir === 'true';
}

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
  
  // Modal state for tour generation prompt
  const [showTourModal, setShowTourModal] = useState(false);
  const [hasTour, setHasTour] = useState<boolean | null>(null); // null = checking, true = has tour, false = no tour
  const [hasShownModalThisSession, setHasShownModalThisSession] = useState(false); // Track if modal was shown this session
  
  // Tour state for self-guided: next stop (first unvisited) and user type
  const [nextStop, setNextStop] = useState<LocationItem | null>(null);
  const [isSelfGuided, setIsSelfGuided] = useState(false);

  /** When opened via ?directions=1&building=…, route to this place instead of tour next stop. */
  const [explicitDirectionsTarget, setExplicitDirectionsTarget] = useState<LocationItem | null>(null);
  
  // Map vs Directions view (self-guided tour next stop and/or explicit directions target)
  const [mapViewMode, setMapViewMode] = useState<'map' | 'directions'>('map');
  
  // Walking route for Directions view
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  
  // School deadzones for route filtering (from school.deadzones)
  const [schoolDeadzones, setSchoolDeadzones] = useState<Array<Array<{ latitude: number; longitude: number }>>>([]);
  
  // Raise hand notification state from shared context
  const { tourPaused, tourFinished, syncTourPausedFromStorage } = useTourPause();

  /** Mirror Current tab: tour stops, visited list, geofence / live session "current" id */
  const [tourStops, setTourStops] = useState<LocationItem[]>([]);
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [isAmbassadorLedMember, setIsAmbassadorLedMember] = useState(false);
  const [isAmbassador, setIsAmbassador] = useState(false);
  const locationWatchSubRef = useRef<{ remove: () => void } | null>(null);

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

  const routeDestination = explicitDirectionsTarget ?? nextStop;
  const showMapDirectionsToggle =
    isSelfGuided &&
    (((hasTour === true && nextStop !== null) || explicitDirectionsTarget !== null));

  const nearestCampusMode = tourPaused || tourFinished;
  const highlightedLocationId = useMemo(
    () =>
      getHighlightedLocationIdForCurrentTabLogic({
        nearestCampusMode,
        nearestCampusLoading: false,
        allCampusLocations: locations,
        userCoords: userLocation
          ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
          : null,
        currentLocationId,
        tourStops,
        visitedLocations,
      }),
    [
      nearestCampusMode,
      locations,
      userLocation?.latitude,
      userLocation?.longitude,
      currentLocationId,
      tourStops,
      visitedLocations,
    ]
  );

  // Open directions mode when linked with ?directions=1&building=<id> (self-guided only)
  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      const userType = await userTypeService.getUserType();
      if (cancelled) return;

      if (userType !== 'self-guided') {
        setExplicitDirectionsTarget(null);
        setMapViewMode('map');
        return;
      }

      const dir = pickSearchParam(params.directions as string | string[] | undefined);
      const bid = pickSearchParam(params.building as string | string[] | undefined);
      const wantDirections = wantsDirectionsParam(dir);

      if (!locations.length) {
        if (!wantDirections) setExplicitDirectionsTarget(null);
        return;
      }

      if (wantDirections && bid) {
        const loc = locations.find((l) => l.id.toLowerCase() === bid.toLowerCase());
        if (loc) {
          setExplicitDirectionsTarget(loc);
          setMapViewMode('directions');
        } else {
          setExplicitDirectionsTarget(null);
        }
        return;
      }

      if (wantDirections && !bid) {
        setExplicitDirectionsTarget(null);
        return;
      }

      if (!wantDirections) {
        setExplicitDirectionsTarget(null);
      }
    };

    void apply();
    return () => {
      cancelled = true;
    };
  }, [params.directions, params.building, locations]);

  // Check if we need to focus on a specific building (from params).
  // Skip this when we're entering Directions view — the fit-to-route effect will
  // frame the camera on the whole route instead. Otherwise the two animations race,
  // the destination zoom can win, and the drawn polyline ends up off-screen.
  // We also check ?directions=1 directly so we don't briefly animate to the
  // building before the async user-type check flips `mapViewMode` to 'directions'.
  useEffect(() => {
    const wantDirections = wantsDirectionsParam(
      pickSearchParam(params.directions as string | string[] | undefined)
    );
    if (mapViewMode === 'directions' || wantDirections) return;
    const buildingId = pickSearchParam(params.building as string | string[] | undefined);
    if (buildingId && locations.length > 0) {
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
  }, [params.building, params.directions, mapReady, locations, mapViewMode]);

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

  // Keep user coordinates fresh while Map is focused (same cadence as Current tab — geofence + nearest-campus highlight)
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const { status } = await ExpoLocation.getForegroundPermissionsAsync();
          if (!alive || status !== 'granted') return;
          const sub = await ExpoLocation.watchPositionAsync(
            {
              accuracy: ExpoLocation.Accuracy.Balanced,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (newLocation) => {
              setUserLocation((prev) => ({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                latitudeDelta: prev?.latitudeDelta ?? 0.004,
                longitudeDelta: prev?.longitudeDelta ?? 0.004,
              }));
            }
          );
          if (!alive) {
            sub.remove();
            return;
          }
          locationWatchSubRef.current = sub;
        } catch (e) {
          console.error('Map tab: location watch error', e);
        }
      })();
      return () => {
        alive = false;
        locationWatchSubRef.current?.remove();
        locationWatchSubRef.current = null;
      };
    }, [])
  );

  // Self-guided: current stop from geofence (ambassador-led members skip — they follow WebSocket state)
  useEffect(() => {
    if (tourPaused || tourFinished || isAmbassadorLedMember) {
      return;
    }
    if (!userLocation || !schoolId || tourStops.length === 0) {
      return;
    }
    let newCurrentLocationId: string | null = null;
    for (const stop of tourStops) {
      const isWithin = analyticsService.isWithinGeofence(
        userLocation.latitude,
        userLocation.longitude,
        stop.coordinates.latitude,
        stop.coordinates.longitude
      );
      if (isWithin) {
        newCurrentLocationId = stop.id;
        break;
      }
    }
    setCurrentLocationId(newCurrentLocationId);
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    tourStops,
    schoolId,
    tourPaused,
    tourFinished,
    isAmbassadorLedMember,
  ]);

  // Ambassador-led members: live current stop from tour session
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const attachLiveUpdates = async () => {
      const isAmbassadorUser = await userTypeService.isAmbassador();
      if (isAmbassadorUser) return;
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) return;
      const leadId = await leadsService.getStoredLeadId();
      if (!leadId) return;
      wsManager.connect();
      const onMessage = (msg: { type?: string; state?: { current_location_id?: string; visited_locations?: string[] } }) => {
        if (msg?.type === 'tour_state_updated' && msg?.state) {
          const { current_location_id, visited_locations } = msg.state;
          if (current_location_id) setCurrentLocationId(current_location_id);
          if (Array.isArray(visited_locations)) setVisitedLocations(visited_locations);
        }
      };
      wsManager.on('message', onMessage);
      wsManager.send('join_session', { tourId, leadId });
      cleanup = () => {
        wsManager.off('message', onMessage);
      };
    };
    attachLiveUpdates();
    return () => {
      cleanup?.();
    };
  }, []);

  // When switching to map view, clear the route so we don't show it
  useEffect(() => {
    if (mapViewMode === 'map') {
      setRouteCoordinates(null);
    }
  }, [mapViewMode]);

  // Fetch walking route when in Directions view with user location and a destination
  useEffect(() => {
    if (mapViewMode !== 'directions' || !userLocation || !routeDestination) {
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    setRouteCoordinates(null);
    const origin = { latitude: userLocation.latitude, longitude: userLocation.longitude };
    const destination = routeDestination.coordinates;
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
  }, [mapViewMode, userLocation?.latitude, userLocation?.longitude, routeDestination?.id, schoolDeadzones]);

  // Fit map to route when route is loaded in Directions view
  useEffect(() => {
    if (mapViewMode !== 'directions' || !routeCoordinates?.length || !mapRef.current || !mapReady) {
      return;
    }
    const points = [...routeCoordinates];
    if (userLocation) {
      points.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
    }
    if (routeDestination?.coordinates) {
      points.push(routeDestination.coordinates);
    }
    // Defer so the native map finishes layout; avoids fit being overwritten and native crashes
    // on some platforms when the camera is updated in the same frame as polyline mount.
    // otherwise fitToCoordinates can be overwritten or crash on some platforms.
    const id = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }, 50);
    return () => clearTimeout(id);
  }, [mapViewMode, routeCoordinates, mapReady, routeDestination?.id, userLocation?.latitude, userLocation?.longitude]);

  // Check for existing tour whenever the map screen is focused; compute next stop for self-guided
  useFocusEffect(
    React.useCallback(() => {
      const refreshTourHighlightState = () => {
        try {
          syncTourPausedFromStorage();
          const currentState = appStateManager.getCurrentState();
          if (currentState?.tourState) {
            const { stops, visitedLocations: vis } = currentState.tourState;
            setTourStops(stops);
            setVisitedLocations(vis ?? []);
          } else {
            setTourStops([]);
            setVisitedLocations([]);
          }
          if (currentState?.tourProgress) {
            const currentStopIndex = currentState.tourProgress.currentStopIndex;
            const loadedStops = currentState.tourState?.stops ?? [];
            if (currentStopIndex >= 0 && currentStopIndex < loadedStops.length) {
              setCurrentLocationId(loadedStops[currentStopIndex]?.id ?? null);
            } else {
              setCurrentLocationId(null);
            }
          } else {
            setCurrentLocationId(null);
          }
        } catch (e) {
          console.error('Map tab: error loading tour highlight state', e);
        }
      };
      refreshTourHighlightState();

      const checkForTour = async () => {
        try {
          // Check if user is in an ambassador-led tour or is an ambassador
          const userType = await userTypeService.getUserType();
          const isAmbassadorLed = userType === 'ambassador-led';
          const isAmbassadorUser = userType === 'ambassador';
          const isAmbassadorTour = isAmbassadorLed || isAmbassadorUser;
          const selfGuided = userType === 'self-guided';
          setIsSelfGuided(selfGuided);
          setIsAmbassadorLedMember(isAmbassadorLed);
          setIsAmbassador(isAmbassadorUser);
          if (!selfGuided) {
            setExplicitDirectionsTarget(null);
            setMapViewMode('map');
          }

          // Check for active tour using appStateManager
          const currentState = appStateManager.getCurrentState();
          let hasActiveTour = false;
          let next: LocationItem | null = null;
          const tourFinished = !!currentState?.tourState?.tourFinished;

          if (currentState?.tourState) {
            const { stops, visitedLocations } = currentState.tourState;
            // Any saved stop list counts as an active tour (resume paths often have empty selectedInterests;
            // self-guided "skip to default" can too). Only exclude explicitly finished tours.
            hasActiveTour = stops.length > 0 && !tourFinished;
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
          if (!isAmbassadorTour && !hasActiveTour && !tourFinished && !hasShownModalThisSession) {
            setShowTourModal(true);
          }
        } catch (error) {
          console.error('Error checking for tour:', error);
          const userType = await userTypeService.getUserType();
          const isAmbassadorLed = userType === 'ambassador-led';
          const isAmbassadorUser = userType === 'ambassador';
          const isAmbassadorTour = isAmbassadorLed || isAmbassadorUser;
          setIsAmbassador(isAmbassadorUser);

          const fallbackState = appStateManager.getCurrentState();
          const fallbackFinished = !!fallbackState?.tourState?.tourFinished;
          const fallbackHasStops =
            (fallbackState?.tourState?.stops?.length ?? 0) > 0;

          setHasTour(false);
          setNextStop(null);
          const selfGuidedFallback = userType === 'self-guided';
          setIsSelfGuided(selfGuidedFallback);
          setIsAmbassadorLedMember(userType === 'ambassador-led');
          if (!selfGuidedFallback) {
            setExplicitDirectionsTarget(null);
            setMapViewMode('map');
          }
          if (
            !isAmbassadorTour &&
            !hasShownModalThisSession &&
            !fallbackFinished &&
            !fallbackHasStops
          ) {
            setShowTourModal(true);
          }
        }
      };

      checkForTour();
    }, [hasShownModalThisSession, syncTourPausedFromStorage])
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
    router.push({
      pathname: '/building/[id]',
      params: { id: location.id }
    });
  };

  // Handle callout press - This provides a backup way to navigate if needed
  const handleCalloutPress = (location: LocationItem) => {
    handleMarkerPress(location);
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

  const renderLocationCalloutActions = (location: LocationItem) => {
    const goDetails = () => handleCalloutPress(location);
    const goDirections = () => {
      router.setParams({
        building: location.id,
        directions: '1',
      });
    };

    const detailsInner = (
      <View style={styles.detailsButton}>
        <Text style={dynamicStyles.detailsButtonText}>Details</Text>
        <IconSymbol name="chevron.right" size={14} color={primaryColor} />
      </View>
    );

    const directionsInner = (
      <View style={[styles.calloutDirectionsButton, { backgroundColor: primaryColor }]}>
        <IconSymbol name="figure.walk" size={14} color="#FFFFFF" style={styles.calloutDirectionsIcon} />
        <Text style={styles.calloutDirectionsButtonText}>Directions</Text>
      </View>
    );

    // iOS: Touchables inside map callouts do not receive taps; CalloutSubview + onPress is required.
    // Android: Use gesture-handler touchables inside the native info window.
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.calloutButtonRow}>
          <CalloutSubview onPress={goDetails} style={styles.calloutSubviewHit}>
            {detailsInner}
          </CalloutSubview>
          {isSelfGuided ? (
            <CalloutSubview onPress={goDirections} style={styles.calloutSubviewHit}>
              {directionsInner}
            </CalloutSubview>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.calloutButtonRow}>
        <TouchableOpacity style={styles.calloutSubviewHit} onPress={goDetails} activeOpacity={0.75}>
          {detailsInner}
        </TouchableOpacity>
        {isSelfGuided ? (
          <TouchableOpacity style={styles.calloutSubviewHit} onPress={goDirections} activeOpacity={0.75}>
            {directionsInner}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <HamburgerMenu primaryColor={primaryColor} showAmbassadorTourRoster={isAmbassador} />
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

      {/* Map / Directions toggle: tour next stop (self-guided) and/or deep-linked directions to a place */}
      {showMapDirectionsToggle && (
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              mapViewMode === 'map' && [styles.viewToggleButtonActive, dynamicStyles.viewToggleButtonActive],
            ]}
            onPress={() => {
              // Clear the polyline first so it unmounts on this render, then
              // flip the mode on the next tick. Unmounting Polyline + Polygons
              // in the same frame as a mode switch has been the source of a
              // native iOS crash (react-native-maps 1.20 on iOS 17+ tears down
              // MKOverlays unsafely when multiple change at once). Deferring
              // the mode flip lets the polyline detach cleanly first.
              setRouteCoordinates(null);
              setExplicitDirectionsTarget(null);
              setTimeout(() => {
                setMapViewMode('map');
              }, 0);
            }}
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
            key={schoolId ?? 'map'}
            ref={mapRef}
            style={styles.map}
            provider={mapProvider}
            mapType="standard"
            initialRegion={defaultRegion}
            showsUserLocation={locationPermissionStatus === 'granted'}
            showsMyLocationButton={false}
            showsCompass={true}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            onMapReady={() => setMapReady(true)}
          >
            {/* ONlY UTAH TECH HAS THIS OVERLAY FOR NOW HEHE */}
            {schoolId == "e5a9dfd2-0c88-419e-b891-0a62283b8abd" && (
              <Overlay image={require('@/assets/images/buildings_overlay_3.png')} bounds={[
              // [ 37.09798939695663, -113.57067719268706 ],
              [ 37.09755260505361, -113.57264516743909 ],
              [ 37.10815778141483, -113.55942540472526 ]
              // [ 37.097589, -113.572708 ]
              // new bottom left: 37.10815778141483, -113.55942540472526
              ]}  />
            )}
            {mapViewMode === 'directions' && !!routeCoordinates && routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={primaryColor}
                strokeWidth={6}
                zIndex={9999}
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
            {locations.map((location) => {
              const isHighlighted = highlightedLocationId === location.id;
              return (
              <Marker
                key={location.id}
                coordinate={location.coordinates}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={isHighlighted ? 10 : 1}
                tracksViewChanges={Platform.OS === 'android'}
              >
                <LocationMapPin
                  color={locationService.getMarkerColor(location.type)}
                  icon={locationService.getMarkerMaterialIcon(location.type)}
                  emphasized={isHighlighted}
                  outlineColor={isHighlighted ? primaryColor : undefined}
                />
                <Callout tooltip>
                  <View style={styles.calloutContainer} collapsable={false}>
                    <Text style={styles.calloutTitle}>{location.name}</Text>
                    <Text style={styles.calloutDescription} numberOfLines={2}>{location.description}</Text>
                    {renderLocationCalloutActions(location)}
                  </View>
                </Callout>
              </Marker>
            );
            })}
          </MapView>
        )}

        {/* Loading indicator for Directions view */}
        {mapViewMode === 'directions' && routeLoading && (
          <View style={styles.routeLoadingOverlay}>
            <Text style={styles.routeLoadingText}>Loading route…</Text>
          </View>
        )}

        {/* Directions view: no location — prompt to enable */}
        {mapViewMode === 'directions' && routeDestination && locationPermissionStatus !== 'granted' && !routeLoading && (
          <View style={styles.routeMessageOverlay}>
            <Text style={styles.routeMessageText}>Enable location to see route</Text>
          </View>
        )}

        {/* Directions view: API failed or no key */}
        {mapViewMode === 'directions' && routeDestination && userLocation && !routeLoading && !routeCoordinates && (
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
    backgroundColor: '#EEEEEE',
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
  calloutButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  calloutSubviewHit: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  calloutDirectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  calloutDirectionsIcon: {
    marginRight: 6,
  },
  calloutDirectionsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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
