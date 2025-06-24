import { IconSymbol } from '@/components/ui/IconSymbol';
import { Location, Region, locationService, schoolService } from '@/services/supabase';
import * as ExpoLocation from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Marker, Overlay, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      
      // Get school details including coordinates and primary color
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
  const handleChangeSchool = async () => {
    await schoolService.clearSelectedSchool();
    router.replace('/');
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <Text style={styles.headerText}>Campus Map</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={dynamicStyles.changeSchoolButton}
            onPress={handleChangeSchool}
          >
            <Text style={styles.buttonTextSmall}>Change School</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleZoomOut}
          >
            <Text style={styles.resetButtonText}>See Campus</Text>
          </TouchableOpacity>
        </View>
      </View>
      
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
            initialRegion={defaultRegion}
            showsUserLocation={locationPermissionStatus === 'granted'}
            showsMyLocationButton={false}
            showsCompass={true}
            rotateEnabled={true}
            scrollEnabled={true}
            zoomEnabled={true}
            onMapReady={() => setMapReady(true)}
          >
            <Overlay image={require('@/assets/images/buildings_overlay_3.png')} bounds={[
              // [ 37.09798939695663, -113.57067719268706 ],
              [ 37.09755260505361, -113.57264516743909 ],
              [ 37.10815778141483, -113.55942540472526 ]
              // [ 37.097589, -113.572708 ]
              // new bottom left: 37.10815778141483, -113.55942540472526
            ]}  />
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

        {/* Recenter button */}
        <TouchableOpacity
          style={[styles.recenterButton, dynamicStyles.recenterButton]}
          onPress={handleRecenterPress}
        >
          <IconSymbol name="location.fill" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Show my Location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  header: {
    paddingBottom: 10,
    paddingTop: 10,
    borderBottomWidth: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 15,
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
  buttonTextSmall: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
