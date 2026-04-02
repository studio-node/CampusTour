import { IconSymbol } from '@/components/ui/IconSymbol';
import { formatInterest } from '@/constants/labels';
import { usePushedLocationMedia } from '@/contexts/PushedLocationMediaContext';
import { Location, locationService, schoolService, userTypeService } from '@/services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const { getPushedMedia, showTakeover } = usePushedLocationMedia();

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
    viewOnMapButton: {
      backgroundColor: primaryColor,
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
      
      <ScrollView style={styles.scrollView}>
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
          
          {isAmbassador && building.talking_points && building.talking_points.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Talking Points</Text>
              <View style={styles.talkingPointsList}>
                {building.talking_points.map((point, index) => (
                  <View key={index} style={styles.talkingPointItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.talkingPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <Text style={styles.buildingDescription}>{building.description}</Text>
          
          {building.interests && building.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestTags}>
                {building.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>{formatInterest(interest)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {building.careers && building.careers.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Career Opportunities</Text>
              <View style={styles.interestTags}>
                {building.careers.map((career, index) => (
                  <View key={index} style={styles.careerTag}>
                    <Text style={styles.interestTagText}>{career}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {building.features && building.features.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Features & Amenities</Text>
              <View style={styles.interestTags}>
                {building.features.map((feature, index) => (
                  <View key={index} style={styles.featureTag}>
                    <Text style={styles.interestTagText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!isAmbassador && building && (() => {
            const pushed = getPushedMedia(building.id);
            if (pushed.length === 0) return null;
            return (
              <View style={styles.pushedSection}>
                <Text style={styles.sectionTitle}>Media</Text>
                {pushed.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.pushedItem}
                    onPress={() => showTakeover(item)}
                    activeOpacity={0.7}
                  >
                    {item.media_type?.toLowerCase().includes('video') ? (
                      <View style={styles.pushedVideoPlaceholder}>
                        <IconSymbol name="play.circle.fill" size={24} color="#FFFFFF" />
                        <Text style={styles.pushedItemName}>{item.name || 'Video'}</Text>
                      </View>
                    ) : (
                      <View style={styles.pushedItemContent}>
                        <Image source={{ uri: item.url }} style={styles.pushedThumbnail} resizeMode="cover" />
                        <Text style={styles.pushedItemName} numberOfLines={1}>{item.name || 'Image'}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()}
          
        </View>
      </ScrollView>
      <View style={styles.mapActionsBar}>
        <TouchableOpacity
          style={[styles.directionsToHereButton, dynamicStyles.viewOnMapButton]}
          onPress={handleWalkingDirectionsPress}
        >
          <IconSymbol name="figure.walk" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Directions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewOnMapButtonBar, styles.viewOnMapButtonSecondary]}
          onPress={handleViewOnMapPress}
        >
          <IconSymbol name="map.fill" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>View on Map</Text>
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
  scrollView: {
    flex: 1,
    paddingBottom: 200,
  },
  buildingImage: {
    height: 200,
    width: '100%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999999',
    fontSize: 16,
  },
  buildingInfo: {
    padding: 16,
    marginBottom: 50,
    flex: 1,
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
  interestsSection: {
    marginBottom: 16, 
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  interestTags: {
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
  },
  interestTagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  careerTag: {
    backgroundColor: '#2E7D32', // Green for careers
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  featureTag: {
    backgroundColor: '#1976D2', // Blue for features
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  talkingPointsList: {
    flex: 1,
  },
  talkingPointItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
    marginTop: 2,
  },
  talkingPointText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  mapActionsBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  directionsToHereButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewOnMapButtonBar: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewOnMapButtonSecondary: {
    backgroundColor: '#555555',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  pushedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  pushedItem: {
    marginBottom: 12,
  },
  pushedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pushedThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  pushedItemName: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  pushedVideoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#3A3A3A',
    padding: 12,
    borderRadius: 8,
  },
}); 