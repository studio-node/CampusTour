import { IconSymbol } from '@/components/ui/IconSymbol';
import { locations } from '@/locations';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define location type based on locations.js structure
type LocationItem = {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image: string;
  description: string;
  interests: string[];
  isTourStop: boolean;
};

export default function BuildingInfoScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const buildingId = typeof id === 'string' ? id : '';
  
  // Find the building from locations.js data
  const building = locations.find(loc => loc.id.toLowerCase() === buildingId.toLowerCase());

  const handleBackPress = () => {
    router.back();
  };

  const handleShowOnMap = () => {
    router.push({
      pathname: '/(tabs)/map',
      params: { building: buildingId }
    });
  };

  if (!building) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Building Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>The requested building could not be found.</Text>
          <TouchableOpacity style={styles.button} onPress={handleBackPress}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{building.name}</Text>
      </View>

      <ScrollView style={styles.content}>
        {building.image ? (
          <View>  
            <Image 
              source={{ uri: building.image }} 
              style={styles.buildingImage}
              resizeMode="cover"
            />
            
            
          </View>
        ) : (
          
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Building Image</Text>
          </View>
        )}

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{building.description}</Text>
          
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsContainer}>
            {building.interests.map((interest: string, index: number) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestTagText}>
                  {interest.charAt(0).toUpperCase() + interest.slice(1).replace('-', ' ')}
                </Text>
              </View>
            ))}
          </View>

          {building.isTourStop && (
            <View style={styles.tourStopContainer}>
              <IconSymbol name="star.fill" size={14} color="#FFD700" style={styles.tourStopIcon} />
              <Text style={styles.tourStopText}>This building is a featured tour stop</Text>
            </View>
          )}
        </View>

      </ScrollView>

      
      <TouchableOpacity style={styles.showOnMapButton} onPress={handleShowOnMap}>
        <IconSymbol name="map.fill" size={16} color="white" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Show on Map</Text>
      </TouchableOpacity>
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
  content: {
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
  detailsContainer: {
    padding: 16,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
    color: '#FFFFFF',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
  tourStopContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tourStopIcon: {
    marginRight: 8,
  },
  tourStopText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  showOnMapButton: {
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
  button: {
    backgroundColor: '#990000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
}); 