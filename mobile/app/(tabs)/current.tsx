import { IconSymbol } from '@/components/ui/IconSymbol';
import { analyticsService, Location, locationService, schoolService, userTypeService } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import HamburgerMenu from '@/components/HamburgerMenu';

// Storage keys (same as tour.tsx)
const STORAGE_KEYS = {
  TOUR_STOPS: 'tourStops',
  VISITED_LOCATIONS: 'visitedLocations',
  CURRENT_LOCATION_ID: 'currentLocationId',
};

export default function CurrentLocationScreen() {
  const router = useRouter();
  const [building, setBuilding] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000');
  const [isAmbassador, setIsAmbassador] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  
  // Tour state
  const [tourStops, setTourStops] = useState<Location[]>([]);
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);

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

  // Check if user is an ambassador
  useEffect(() => {
    const checkUserType = async () => {
      const ambassadorStatus = await userTypeService.isAmbassador();
      setIsAmbassador(ambassadorStatus);
    };

    checkUserType();
  }, []);

  // Load tour data from AsyncStorage whenever the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadTourData = async () => {
        try {
          const savedTourStops = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_STOPS);
          const savedVisitedLocations = await AsyncStorage.getItem(STORAGE_KEYS.VISITED_LOCATIONS);
          const savedCurrentLocationId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_LOCATION_ID);
          
          if (savedTourStops) {
            const parsedTourStops = JSON.parse(savedTourStops);
            setTourStops(parsedTourStops);
            console.log('Current Location Tab: Loaded', parsedTourStops.length, 'tour stops from storage');
          } else {
            setTourStops([]);
            console.log('Current Location Tab: No tour stops found in storage');
          }
          
          if (savedVisitedLocations) {
            setVisitedLocations(JSON.parse(savedVisitedLocations));
          } else {
            setVisitedLocations([]);
          }
          
          if (savedCurrentLocationId) {
            setCurrentLocationId(savedCurrentLocationId);
          } else {
            setCurrentLocationId(null);
          }
        } catch (error) {
          console.error('Error loading tour data:', error);
        }
      };

      loadTourData();
    }, [])
  );

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

  // Check geofences and update current location
  useEffect(() => {
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
  }, [userLocation, tourStops, schoolId]);

  // Determine which location to display
  useEffect(() => {
    const determineLocationToShow = () => {
      setIsLoading(true);
      setError(null);

      try {
        let locationToShow: Location | null = null;

        if (currentLocationId) {
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
  }, [currentLocationId, tourStops, visitedLocations]);

  // Handle "View on Map" button press
  const handleViewOnMapPress = () => {
    if (building) {
      router.push({
        pathname: '/map',
        params: { building: building.id }
      });
    }
  };

  // Handle "Start Tour" button press when no tour is active
  const handleStartTour = () => {
    router.push('/tour');
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

  const statusText = currentLocationId 
    ? `You are currently at:`
    : `Next stop on your tour:`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <HamburgerMenu primaryColor={primaryColor} />
        <Text style={styles.headerText}>Current Location</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.statusContainer}>
          <IconSymbol 
            name={currentLocationId ? "location.fill" : "arrow.right.circle.fill"} 
            size={20} 
            color={primaryColor} 
            style={styles.statusIcon} 
          />
          <Text style={[styles.statusText, { color: primaryColor }]}>{statusText}</Text>
        </View>

        {building.image ? (
          <Image
            source={{ uri: building.image }}
            style={styles.buildingImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image Available</Text>
          </View>
        )}
        
        <View style={styles.buildingInfo}>
          <Text style={styles.buildingName}>{building.name}</Text>
          <Text style={styles.buildingDescription}>{building.description}</Text>
          
          {building.interests && building.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.tagContainer}>
                {building.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {building.careers && building.careers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Career Opportunities</Text>
              <View style={styles.tagContainer}>
                {building.careers.map((career, index) => (
                  <View key={index} style={styles.careerTag}>
                    <Text style={styles.careerTagText}>{career}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isAmbassador && building.talking_points && building.talking_points.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Highlights</Text>
              <View style={styles.bulletPointsContainer}>
                {building.talking_points.map((point, index) => (
                  <View key={index} style={styles.bulletPoint}>
                    <Text style={styles.bulletPointIcon}>•</Text>
                    <Text style={styles.bulletPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {building.features && building.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Features & Amenities</Text>
              <View style={styles.tagContainer}>
                {building.features.map((feature, index) => (
                  <View key={index} style={styles.featureTag}>
                    <Text style={styles.featureTagText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.viewOnMapButton, dynamicStyles.viewOnMapButton]}
            onPress={handleViewOnMapPress}
          >
            <IconSymbol name="map.fill" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.viewOnMapButtonText}>View on Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
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
  buildingImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#DDDDDD',
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666666',
    fontSize: 16,
  },
  buildingInfo: {
    padding: 20,
    backgroundColor: '#000000',
    marginBottom: 50,
  },
  buildingName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  buildingDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#454545',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#555555',
    marginRight: 8,
    marginBottom: 8,
  },
  interestTagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  careerTag: {
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginRight: 8,
    marginBottom: 8,
  },
  careerTagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  featureTag: {
    backgroundColor: '#1976D2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
    marginRight: 8,
    marginBottom: 8,
  },
  featureTagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  bulletPointsContainer: {
    flex: 1,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPointIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
    marginTop: 2,
  },
  bulletPointText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  viewOnMapButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
}); 