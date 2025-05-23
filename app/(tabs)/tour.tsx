import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define the interface for a tour stop
interface TourStop {
  id: string;
  name: string;
  image: string;
  description: string;
}

// Define available interests
interface Interest {
  id: string;
  name: string;
}

const interests: Interest[] = [
  { id: 'arts', name: 'Arts' },
  { id: 'computing', name: 'Computing' },
  { id: 'med-science', name: 'Medical Sciences' },
  { id: 'business', name: 'Business' },
  { id: 'sports', name: 'Sports & Recreation' },
];

// Mock data for the tour stops
const mockTourStops: TourStop[] = [
  { 
    id: '1', 
    name: 'Holland Centennial Commons',
    image: 'https://via.placeholder.com/150',
    description: 'Main library and student service center.',
  },
  { 
    id: '2', 
    name: 'Smith Computer Center',
    image: 'https://via.placeholder.com/150',
    description: 'Houses computer science and digital design programs.',
  },
  { 
    id: '3', 
    name: 'Human Performance Center',
    image: 'https://via.placeholder.com/150',
    description: 'Recreation center with climbing wall and swimming pools.',
  },
];

// Component for an individual tour stop item
const TourStopItem = ({ 
  item, 
  onDetailsPress, 
  onLocationPress 
}: { 
  item: TourStop; 
  onDetailsPress: (id: string) => void;
  onLocationPress: (id: string) => void;
}) => (
  <View style={styles.tourStopCard}>
    <View style={styles.tourStopImagePlaceholder}>
      <Text style={styles.imagePlaceholderText}>Building Image</Text>
    </View>
    <View style={styles.tourStopInfo}>
      <Text style={styles.tourStopName}>{item.name}</Text>
      <Text style={styles.tourStopDescription}>{item.description}</Text>
      <View style={styles.tourStopButtons}>
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => onDetailsPress(item.id)}
        >
          <IconSymbol name="info.circle.fill" size={12} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={() => onLocationPress(item.id)}
        >
          <IconSymbol name="location.fill" size={12} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Location</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// Interest tag component
const InterestTag = ({ 
  interest, 
  selected, 
  onPress 
}: { 
  interest: Interest; 
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity 
    style={[
      styles.interestTag,
      selected && styles.interestTagSelected
    ]}
    onPress={onPress}
  >
    <Text 
      style={[
        styles.interestTagText,
        selected && styles.interestTagTextSelected
      ]}
    >
      {interest.name}
    </Text>
  </TouchableOpacity>
);

export default function TourScreen() {
  const router = useRouter();
  const [showInterestSelection, setShowInterestSelection] = useState(true);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [tourStops, setTourStops] = useState<TourStop[]>([]);

  // Toggle interest selection
  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(id => id !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  // Generate tour based on selected interests
  const generateTour = () => {
    // For now just show the mockTourStops
    // Later we'll filter based on selected interests
    setTourStops(mockTourStops);
    setShowInterestSelection(false);
  };

  // Skip interest selection and show default tour
  const showDefaultTour = () => {
    setTourStops(mockTourStops);
    setShowInterestSelection(false);
  };

  // Reset tour and show interest selection again
  const resetTour = () => {
    setSelectedInterests([]);
    setShowInterestSelection(true);
  };

  // Handle Details button press
  const handleDetailsPress = (buildingId: string) => {
    console.warn(`Details pressed for building: ${buildingId}`);
    // Navigate to the building info page
    router.push({
      pathname: '/building/[id]' as any,
      params: { id: buildingId }
    });
  };

  // Handle Location button press
  const handleLocationPress = (buildingId: string) => {
    console.warn(`Location pressed for building: ${buildingId}`);
    // Later this will navigate to the map tab and focus on the building
    // router.push(`/map?building=${buildingId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Campus Tour</Text>
        {!showInterestSelection && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetTour}
          >
            <Text style={styles.resetButtonText}>New Tour</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {showInterestSelection ? (
        <View style={styles.interestSelectionContainer}>
          <Text style={styles.interestSelectionText}>Select Your Interests</Text>
          <View style={styles.interestTagsContainer}>
            {interests.map(interest => (
              <InterestTag
                key={interest.id}
                interest={interest}
                selected={selectedInterests.includes(interest.id)}
                onPress={() => toggleInterest(interest.id)}
              />
            ))}
          </View>
          <TouchableOpacity 
            style={[
              styles.generateTourButton,
              selectedInterests.length === 0 && styles.generateTourButtonDisabled
            ]}
            onPress={generateTour}
            disabled={selectedInterests.length === 0}
          >
            <Text style={styles.buttonText}>Generate Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showDefaultTour}>
            <Text style={styles.skipText}>Skip to Default Tour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tourStops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourStopItem 
              item={item}
              onDetailsPress={handleDetailsPress}
              onLocationPress={handleLocationPress}
            />
          )}
          style={styles.tourList}
          ListEmptyComponent={
            <View style={styles.emptyTourContainer}>
              <Text style={styles.emptyTourText}>No buildings match your selected interests.</Text>
              <TouchableOpacity 
                style={styles.generateTourButton}
                onPress={resetTour}
              >
                <Text style={styles.buttonText}>Select Different Interests</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#242424',
  },
  resetButton: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  resetButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  interestSelectionContainer: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  interestSelectionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  interestTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  interestTag: {
    backgroundColor: '#EEEEEE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  interestTagSelected: {
    backgroundColor: '#990000',
  },
  interestTagText: {
    fontSize: 14,
    color: '#333333',
  },
  interestTagTextSelected: {
    color: '#FFFFFF',
  },
  generateTourButton: {
    backgroundColor: '#990000', // Utah Tech red color
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateTourButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  skipText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
  tourList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyTourContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTourText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'center',
  },
  tourStopCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    overflow: 'hidden',
  },
  tourStopImagePlaceholder: {
    width: 100,
    height: 120,
    backgroundColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  tourStopInfo: {
    flex: 1,
    padding: 12,
  },
  tourStopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tourStopDescription: {
    fontSize: 14,
    color: '#444444',
    marginBottom: 12,
  },
  tourStopButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  detailsButton: {
    backgroundColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    backgroundColor: '#990000', // Utah Tech red color
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
