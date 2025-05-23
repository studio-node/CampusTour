import { IconSymbol } from '@/components/ui/IconSymbol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define the building interface
interface Building {
  id: string;
  name: string;
  image: string;
  description: string;
  detailedDescription: string;
  interests: string[];
}

// This is just a placeholder for now
// In the future, we'll fetch data from the locations.js file
const mockBuildings: Record<string, Building> = {
  '1': {
    id: '1',
    name: 'Holland Centennial Commons',
    image: 'https://via.placeholder.com/150',
    description: 'Main library and student service center.',
    detailedDescription: 'The Jeffrey R. Holland Centennial Commons Building houses the library, classrooms, study spaces, and various student services including registration, financial aid, and advisement. The building was dedicated in 2012.',
    interests: ['academics', 'library', 'student-services'],
  },
  '2': {
    id: '2',
    name: 'Smith Computer Center',
    image: 'https://via.placeholder.com/150',
    description: 'Houses computer science and digital design programs.',
    detailedDescription: 'The Smith Computer Center is home to the Computing Department and features computer labs, classrooms, faculty offices, and spaces for students to work on projects. It also houses various technology services for the university.',
    interests: ['computing', 'technology', 'academics'],
  },
  '3': {
    id: '3',
    name: 'Human Performance Center',
    image: 'https://via.placeholder.com/150',
    description: 'Recreation center with climbing wall and swimming pools.',
    detailedDescription: 'The Human Performance Center features indoor and outdoor recreation facilities, including an Olympic-sized swimming pool, basketball courts, fitness areas, a climbing wall, and track. It also contains classrooms and labs for exercise science programs.',
    interests: ['sports', 'recreation', 'health-science'],
  },
};

export default function BuildingInfoScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const buildingId = typeof id === 'string' ? id : '1';
  
  // Get the building data from our mock data
  // In the future, this will come from locations.js
  const building = mockBuildings[buildingId];

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
            <IconSymbol name="chevron.left" size={24} color="#333333" />
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
          <IconSymbol name="chevron.left" size={24} color="#333333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{building.name}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>Building Image</Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{building.detailedDescription}</Text>
          
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
        </View>
      </View>

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
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#242424',
    marginLeft: 8,
    flex: 1,
  },
  backButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#DDDDDD',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePlaceholderText: {
    color: '#666666',
    fontSize: 16,
  },
  detailsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
    color: '#242424',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  interestTagText: {
    fontSize: 14,
    color: '#333333',
  },
  showOnMapButton: {
    position: 'absolute',
    bottom: 24,
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
    color: '#666666',
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