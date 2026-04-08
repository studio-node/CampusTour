import { IconSymbol } from '@/components/ui/IconSymbol';
import { LocationDetailsView } from '@/components/LocationDetailsView';
import { Location, locationService, schoolService, userTypeService } from '@/services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define location type based on Supabase service
type LocationItem = Location;

export default function BuildingInfoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [building, setBuilding] = useState<LocationItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000'); // Utah Tech red as fallback
  const [isAmbassador, setIsAmbassador] = useState<boolean>(false);

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

  // Fetch the building information
  useEffect(() => {
    const fetchBuilding = async () => {
      if (!schoolId) return;
      
      try {
        setIsLoading(true);
        // Get all locations and find the one with matching ID
        const locations = await locationService.getLocations(schoolId);
        const buildingData = locations.find(location => 
          location.id.toLowerCase() === String(id).toLowerCase()
        );
        
        if (buildingData) {
          setBuilding(buildingData);
        } else {
          setError(`Building with ID ${id} not found`);
        }
      } catch (err) {
        console.error('Error fetching building data:', err);
        setError('Failed to load building information');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchBuilding();
    } else {
      setError('No building ID provided');
      setIsLoading(false);
    }
  }, [id, schoolId]);

  // Handle back button press
  const handleBackPress = () => {
    router.back();
  };

  // Handle "View on Map" button press
  const handleViewOnMapPress = () => {
    router.push({
      pathname: '/map',
      params: { building: id }
    });
  };

  const handleWalkingDirectionsPress = () => {
    router.push({
      pathname: '/map',
      params: { building: String(id), directions: '1' },
    });
  };

  // Handle "Location media" button press (ambassador only)
  const handleLocationMediaPress = () => {
    if (building) {
      router.push({
        pathname: '/building/location-media',
        params: { locationId: building.id, locationName: building.name }
      } as never);
    }
  };

  // Create dynamic styles with the primary color
  const dynamicStyles = {
    headerBorder: {
      borderBottomColor: primaryColor,
    },
    backToMapButton: {
      backgroundColor: primaryColor,
    }
  };

  // If the building is loading, show a loading indicator
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Building Info</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading building information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If there's an error, show the error
  if (error || !building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Building Info</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Building not found'}</Text>
          <TouchableOpacity 
            style={[styles.backToMapButton, dynamicStyles.backToMapButton]} 
            onPress={() => router.push('/map')}
          >
            <Text style={styles.backToMapButtonText}>Back to Map</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Building Info</Text>
        {isAmbassador ? (
          <TouchableOpacity style={styles.headerRightButton} onPress={handleLocationMediaPress}>
            <IconSymbol name="photo.on.rectangle.angled" size={20} color="#FFFFFF" />
            <Text style={styles.headerRightButtonText}>Location media</Text>
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
        bottomActionsMargin={16}
        scrollBottomPadding={10}
        showTalkingPoints={isAmbassador}
        showPushedMedia={!isAmbassador}
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
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: -20,
    flex: 1,
    textAlign: 'center',
    marginRight: 36, // Balance the text with the back button
  },
  backButton: {
    padding: 4,
    marginLeft: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 100,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  backToMapButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToMapButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
}); 