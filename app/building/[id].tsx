import { IconSymbol } from '@/components/ui/IconSymbol';
import { Location, locationService } from '@/services/supabase';
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

  // Fetch the building information
  useEffect(() => {
    const fetchBuilding = async () => {
      try {
        setIsLoading(true);
        // Get all locations and find the one with matching ID
        const locations = await locationService.getLocations();
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
  }, [id]);

  // Handle back button press
  const handleBackPress = () => {
    router.back();
  };

  // Handle "View on Map" button press
  const handleViewOnMapPress = () => {
    router.push({
      pathname: '/(tabs)/map',
      params: { building: id }
    });
  };

  // If the building is loading, show a loading indicator
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Building Info</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Building not found'}</Text>
          <TouchableOpacity style={styles.backToMapButton} onPress={() => router.push('/(tabs)/map')}>
            <Text style={styles.backToMapButtonText}>Back to Map</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>Building Info</Text>
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
          <Text style={styles.buildingDescription}>{building.description}</Text>
          
          {building.interests && building.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Points of Interest</Text>
              <View style={styles.interestTags}>
                {building.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.viewOnMapButton}
            onPress={handleViewOnMapPress}
          >
            <IconSymbol name="location.fill" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>View on Map</Text>
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
    borderBottomColor: '#990000',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
    marginRight: 36, // Balance the text with the back button
  },
  backButton: {
    padding: 4,
    marginLeft: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
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
  viewOnMapButton: {
    position: 'absolute',
    bottom: 50,
    right: 24,
    backgroundColor: '#990000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
    backgroundColor: '#990000',
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