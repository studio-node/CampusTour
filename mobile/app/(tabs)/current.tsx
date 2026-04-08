import { IconSymbol } from '@/components/ui/IconSymbol';
import { analyticsService, Location, locationService, schoolService, userTypeService, tourGroupSelectionService, leadsService } from '@/services/supabase';
import { findNearestLocation } from '@/services/tourOrderUtils';
import { wsManager } from '@/services/ws';
import { appStateManager } from '@/services/appStateManager';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import HamburgerMenu from '@/components/HamburgerMenu';
import RaiseHandNotificationModal from '@/components/RaiseHandNotificationModal';
import { LocationDetailsView } from '@/components/LocationDetailsView';
import { useRaiseHand } from '@/contexts/RaiseHandContext';
import { useTourPause } from '@/contexts/TourPauseContext';


export default function CurrentLocationScreen() {
  const router = useRouter();
  const { tourPaused, tourFinished, syncTourPausedFromStorage } = useTourPause();
  const [building, setBuilding] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000');
  const [isAmbassador, setIsAmbassador] = useState<boolean>(false);
  const [isAmbassadorLedMember, setIsAmbassadorLedMember] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  
  // Tour state
  const [tourStops, setTourStops] = useState<Location[]>([]);
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  
  // Raise hand notification state from shared context
  const { showModal: showRaiseHandModal, memberName: raiseHandMemberName, dismissModal: dismissRaiseHandModal } = useRaiseHand();

  /** All campus locations when the tour is paused or ended (nearest-location UX). */
  const [nearestCampusLocations, setNearestCampusLocations] = useState<Location[]>([]);
  const [nearestCampusLoading, setNearestCampusLoading] = useState(false);

  // Get the selected school ID and details
  useEffect(() => {
    const getSelectedSchool = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      if (!selectedSchoolId) {
        router.replace('/');
        return;
      }
      
      setSchoolId(selectedSchoolId);
      
      // Get school details including primary color
      const schoolDetails = await schoolService.getSchoolById(selectedSchoolId);
      if (schoolDetails && schoolDetails.primary_color) {
        setPrimaryColor(schoolDetails.primary_color);
      }
    };

    getSelectedSchool();
  }, [router]);

  // Check if user is an ambassador or ambassador-led member
  useEffect(() => {
    const checkUserType = async () => {
      const ambassadorStatus = await userTypeService.isAmbassador();
      setIsAmbassador(ambassadorStatus);
      
      const userType = await userTypeService.getUserType();
      setIsAmbassadorLedMember(userType === 'ambassador-led');
    };

    checkUserType();
  }, []);

  const nearestCampusMode = tourFinished || tourPaused;

  useEffect(() => {
    if (!schoolId || !nearestCampusMode) {
      setNearestCampusLocations([]);
      setNearestCampusLoading(false);
      return;
    }
    let cancelled = false;
    setNearestCampusLoading(true);
    locationService
      .getLocations(schoolId)
      .then((all) => {
        if (!cancelled) setNearestCampusLocations(all);
      })
      .catch((e) => {
        console.error('Error loading campus locations for nearest stop:', e);
        if (!cancelled) setNearestCampusLocations([]);
      })
      .finally(() => {
        if (!cancelled) setNearestCampusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId, nearestCampusMode]);

  // Load tour data from AsyncStorage whenever the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadTourData = async () => {
        syncTourPausedFromStorage();
        try {
          const currentState = appStateManager.getCurrentState();
          
          if (currentState?.tourState) {
            const { stops, visitedLocations } = currentState.tourState;
            setTourStops(stops);
            setVisitedLocations(visitedLocations);
            console.log('Current Location Tab: Loaded', stops.length, 'tour stops from app state manager');
          } else {
            setTourStops([]);
            setVisitedLocations([]);
            console.log('Current Location Tab: No tour state found in app state manager');
          }
          
          // Get current location from tour progress (use `stops` from loaded state, not stale `tourStops`)
          if (currentState?.tourProgress) {
            const currentStopIndex = currentState.tourProgress.currentStopIndex;
            const loadedStops = currentState.tourState?.stops ?? [];
            if (currentStopIndex >= 0 && currentStopIndex < loadedStops.length) {
              setCurrentLocationId(loadedStops[currentStopIndex]?.id || null);
            } else {
              setCurrentLocationId(null);
            }
          } else {
            setCurrentLocationId(null);
          }
        } catch (error) {
          console.error('Error loading tour data:', error);
        }
      };

      loadTourData();
    }, [syncTourPausedFromStorage])
  );

  // Join live session and listen for state updates if member (requires leadId — server rejects otherwise)
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const attachLiveUpdates = async () => {
      const isAmbassadorUser = await userTypeService.isAmbassador();
      if (isAmbassadorUser) return;
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) return;
      const leadId = await leadsService.getStoredLeadId();
      if (!leadId) {
        console.warn('Current tab: join_session skipped — no leadId for this tour member');
        return;
      }
      wsManager.connect();
      const onMessage = (msg: any) => {
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

  // Request location permissions and start tracking
  useEffect(() => {
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

    requestLocationPermission();

    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, []);

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

  // Check geofences and update current location (self-guided / local only — ambassador-led follows leader WS state)
  useEffect(() => {
    if (tourPaused || tourFinished) {
      return;
    }
    if (isAmbassadorLedMember) {
      return;
    }
    const checkGeofences = () => {
      if (!userLocation || !schoolId || tourStops.length === 0) {
        return;
      }

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
          newCurrentLocationId = stop.id;
          break; // User can only be at one location at a time
        }
      }

      setCurrentLocationId(newCurrentLocationId);
    };

    checkGeofences();
  }, [userLocation, tourStops, schoolId, tourPaused, tourFinished, isAmbassadorLedMember]);

  // Determine which location to display
  useEffect(() => {
    const determineLocationToShow = () => {
      if (nearestCampusMode && nearestCampusLoading) {
        setBuilding(null);
        setError(null);
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let locationToShow: Location | null = null;

        if (nearestCampusMode) {
          if (nearestCampusLocations.length > 0) {
            const nearest = userLocation
              ? findNearestLocation(nearestCampusLocations, userLocation)
              : null;
            locationToShow = nearest ?? nearestCampusLocations[0];
            setError(null);
          } else {
            setBuilding(null);
            setError('No campus locations available.');
          }
        } else if (currentLocationId) {
          // User is at a tour stop - show that location
          locationToShow = tourStops.find(stop => stop.id === currentLocationId) || null;
        } else if (tourStops.length > 0) {
          // User is not at any location - show first unvisited stop
          const unvisitedStops = tourStops.filter(stop => !visitedLocations.includes(stop.id));
          locationToShow = unvisitedStops.length > 0 ? unvisitedStops[0] : tourStops[0];
        }

        if (locationToShow) {
          setBuilding(locationToShow);
          setError(null);
        } else {
          setBuilding(null);
          setError('No tour locations available. Please start a tour first.');
        }
      } catch (err) {
        console.error('Error determining location to show:', err);
        setError('Failed to determine current location');
        setBuilding(null);
      } finally {
        setIsLoading(false);
      }
    };

    determineLocationToShow();
  }, [
    currentLocationId,
    tourStops,
    visitedLocations,
    nearestCampusMode,
    nearestCampusLocations,
    nearestCampusLoading,
    userLocation,
  ]);

  // Handle "View on Map" button press
  const handleViewOnMapPress = () => {
    if (building) {
      router.push({
        pathname: '/map',
        params: { building: building.id }
      });
    }
  };

  const handleWalkingDirectionsPress = () => {
    if (!building) return;
    router.push({
      pathname: '/map',
      params: { building: building.id, directions: '1' },
    });
  };

  // Handle "Location media" button press (ambassador only)
  const handleLocationMediaPress = () => {
    if (!building) return;
    router.push({
      pathname: '/building/location-media',
      params: { locationId: building.id, locationName: building.name },
    } as never);
  };

  // Handle "Start Tour" button press when no tour is active
  const handleStartTour = () => {
    router.push('/tour');
  };

  // Handle "Raise Hand" button press for ambassador-led members
  const handleRaiseHand = async () => {
    try {
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) {
        Alert.alert('Error', 'No active tour session found.');
        return;
      }

      // Ensure WebSocket is connected
      if (wsManager.getStatus() !== 'open') {
        wsManager.connect();
        // Wait for connection to open
        const onOpen = () => {
          wsManager.send('ambassador:ping', { tourId });
          wsManager.off('open', onOpen);
        };
        wsManager.on('open', onOpen);
      } else {
        wsManager.send('ambassador:ping', { tourId });
      }

      // Show confirmation feedback
      Alert.alert('Hand Raised', 'The ambassador has been notified.');
    } catch (error) {
      console.error('Error raising hand:', error);
      Alert.alert('Error', 'Failed to notify the ambassador. Please try again.');
    }
  };

  // Create dynamic styles with the primary color
  const dynamicStyles = {
    headerBorder: {
      borderBottomColor: primaryColor,
    },
    viewOnMapButton: {
      backgroundColor: primaryColor,
    },
    startTourButton: {
      backgroundColor: primaryColor,
    },
    raiseHandButton: {
      backgroundColor: primaryColor,
    }
  };

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <HamburgerMenu primaryColor={primaryColor} />
          <Text style={styles.headerText}>Current Location</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Finding your current location...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If there's an error or no building, show appropriate message
  if (error || !building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <HamburgerMenu primaryColor={primaryColor} />
          <Text style={styles.headerText}>Current Location</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <IconSymbol name="location.slash" size={64} color="#666" style={styles.errorIcon} />
          <Text style={styles.errorText}>
            {error || 'No current location available'}
          </Text>
          <Text style={styles.errorSubtext}>
            {tourStops.length === 0 
              ? 'Start a tour to see location details here.'
              : 'Move closer to a tour location or check the next stop below.'
            }
          </Text>
          <TouchableOpacity 
            style={[styles.startTourButton, dynamicStyles.startTourButton]} 
            onPress={handleStartTour}
          >
            <Text style={styles.startTourButtonText}>Go to Tour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusText = nearestCampusMode
    ? userLocation
      ? 'Closest campus location to you:'
      : 'Campus location (enable location for nearest):'
    : currentLocationId
      ? `You are currently at:`
      : `Next stop on your tour:`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <HamburgerMenu primaryColor={primaryColor} />
        <Text style={styles.headerText}>Current Location</Text>
        {isAmbassador ? (
          <TouchableOpacity style={styles.headerRightButton} onPress={handleLocationMediaPress}>
            <IconSymbol name="photo.on.rectangle.angled" size={20} color="#FFFFFF" />
            <Text style={styles.headerRightButtonText}>Location media</Text>
          </TouchableOpacity>
        ) : isAmbassadorLedMember ? (
          <TouchableOpacity 
            style={[styles.headerRaiseHandButton, dynamicStyles.raiseHandButton]}
            onPress={handleRaiseHand}
          >
            <IconSymbol name="hand.raised.fill" size={18} color="white"/>
            <Text style={styles.raiseHandText}>Raise Hand</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
      
      <LocationDetailsView
        location={building}
        primaryColor={primaryColor}
        onDirectionsPress={handleWalkingDirectionsPress}
        onViewOnMapPress={handleViewOnMapPress}
        bottomActionsMargin={60}
        scrollBottomPadding={40}
        showTalkingPoints={isAmbassador}
        showPushedMedia={isAmbassadorLedMember}
        topContent={
          <View style={styles.statusContainer}>
            <IconSymbol
              name={currentLocationId ? "location.fill" : "arrow.right.circle.fill"}
              size={20}
              color={primaryColor}
              style={styles.statusIcon}
            />
            <Text style={[styles.statusText, { color: primaryColor }]}>{statusText}</Text>
          </View>
        }
      />

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
  headerSpacer: {
    width: 50, // Approximate width to balance the hamburger menu
  },
  headerRightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 12,
  },
  headerRightButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  headerRaiseHandButton: {
    width: 120,
    height: 36,
    borderRadius: 22,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  raiseHandText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 4,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  startTourButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startTourButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tourPausedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tourPausedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 