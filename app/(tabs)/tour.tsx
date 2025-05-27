import { IconSymbol } from '@/components/ui/IconSymbol';
import { locations } from '@/locations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Storage keys
const STORAGE_KEYS = {
  TOUR_STOPS: 'tourStops',
  SELECTED_INTERESTS: 'selectedInterests',
  SHOW_INTEREST_SELECTION: 'showInterestSelection',
  VISITED_LOCATIONS: 'visitedLocations'
};

// Define the interface for a tour stop
interface TourStop {
  id: string;
  name: string;
  image: string;
  description: string;
  interests: string[];
  isTourStop: boolean;
}

// Define available interests
interface Interest {
  id: string;
  name: string;
}

// Extract unique interests from locations data
const extractInterests = (): Interest[] => {
  const uniqueInterests = new Set<string>();
  
  locations.forEach(location => {
    location.interests.forEach(interest => {
      uniqueInterests.add(interest);
    });
  });
  
  return Array.from(uniqueInterests).map(interest => ({
    id: interest.toLowerCase().replace(/\s+/g, '-'),
    name: interest
  }));
};

const interests = extractInterests();

// Component for an individual tour stop item
const TourStopItem = ({ 
  item, 
  onDetailsPress, 
  onLocationPress,
  visited,
  onToggleVisited
}: { 
  item: TourStop; 
  onDetailsPress: (id: string) => void;
  onLocationPress: (id: string) => void;
  visited: boolean;
  onToggleVisited: (id: string) => void;
}) => (
  <View style={styles.tourStopCard}>
    {item.image ? (
      <Image 
        source={{ uri: item.image }} 
        style={styles.tourStopImage}
        contentFit="cover"
      />
    ) : (
      <View style={styles.tourStopImagePlaceholder}>
        <Text style={styles.imagePlaceholderText}>Building Image</Text>
      </View>
    )}
    <View style={styles.tourStopInfo}>
      <View style={styles.tourStopHeader}>
        <TouchableOpacity 
          style={[styles.checkboxContainer, visited && styles.checkboxContainerChecked]} 
          onPress={() => onToggleVisited(item.id)}
        >
          {visited && <IconSymbol name="checkmark" size={14} color="white" />}
        </TouchableOpacity>
        <Text style={styles.tourStopName}>{item.name}</Text>
      </View>
      <Text style={styles.tourStopDescription} numberOfLines={2}>{item.description}</Text>
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
  const [visitedLocations, setVisitedLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved state when the component mounts
  useEffect(() => {
    loadSavedState();
  }, []);

  // Save state when it changes
  useEffect(() => {
    if (!isLoading) {
      saveTourState();
    }
  }, [showInterestSelection, selectedInterests, tourStops, visitedLocations, isLoading]);

  // Load saved state from storage
  const loadSavedState = async () => {
    try {
      setIsLoading(true);
      
      const savedShowInterestSelection = await AsyncStorage.getItem(STORAGE_KEYS.SHOW_INTEREST_SELECTION);
      const savedSelectedInterests = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_INTERESTS);
      const savedTourStops = await AsyncStorage.getItem(STORAGE_KEYS.TOUR_STOPS);
      const savedVisitedLocations = await AsyncStorage.getItem(STORAGE_KEYS.VISITED_LOCATIONS);
      
      if (savedShowInterestSelection !== null) {
        setShowInterestSelection(JSON.parse(savedShowInterestSelection));
      }
      
      if (savedSelectedInterests !== null) {
        setSelectedInterests(JSON.parse(savedSelectedInterests));
      }
      
      if (savedTourStops !== null) {
        setTourStops(JSON.parse(savedTourStops));
      }

      if (savedVisitedLocations !== null) {
        setVisitedLocations(JSON.parse(savedVisitedLocations));
      }
    } catch (error) {
      console.error('Error loading saved tour state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save tour state to storage
  const saveTourState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOW_INTEREST_SELECTION, JSON.stringify(showInterestSelection));
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_INTERESTS, JSON.stringify(selectedInterests));
      await AsyncStorage.setItem(STORAGE_KEYS.TOUR_STOPS, JSON.stringify(tourStops));
      await AsyncStorage.setItem(STORAGE_KEYS.VISITED_LOCATIONS, JSON.stringify(visitedLocations));
    } catch (error) {
      console.error('Error saving tour state:', error);
    }
  };

  // Get tour stops from locations
  const getTourStops = (filterByInterests = false): TourStop[] => {
    // Get only locations marked as tour stops
    let stops = locations.filter(location => location.isTourStop);
    
    // If interests are selected, filter by those interests
    if (filterByInterests && selectedInterests.length > 0) {
      stops = stops.filter(location => 
        location.interests.some(interest => 
          selectedInterests.includes(interest.toLowerCase().replace(/\s+/g, '-'))
        )
      );
    }
    
    return stops;
  };

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
    setTourStops(getTourStops(true));
    setShowInterestSelection(false);
  };

  // Skip interest selection and show default tour
  const showDefaultTour = () => {
    setTourStops(getTourStops(false));
    setShowInterestSelection(false);
  };

  // Reset tour and show interest selection again
  const resetTour = () => {
    setSelectedInterests([]);
    setVisitedLocations([]);
    setShowInterestSelection(true);
  };

  // Toggle visited status for a location
  const toggleVisited = (locationId: string) => {
    setVisitedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  };

  // Handle Details button press
  const handleDetailsPress = (buildingId: string) => {
    console.log(`Details pressed for building: ${buildingId}`);
    // Navigate to the building info page
    router.push({
      pathname: '/building/[id]',
      params: { id: buildingId }
    });
  };

  // Handle Location button press
  const handleLocationPress = (buildingId: string) => {
    console.log(`Location pressed for building: ${buildingId}`);
    // Navigate to the map tab and focus on the building
    router.push({
      pathname: '/(tabs)/map',
      params: { building: buildingId }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Campus Tour</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your tour...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              visited={visitedLocations.includes(item.id)}
              onToggleVisited={toggleVisited}
            />
          )}
          style={styles.tourList}
          contentContainerStyle={styles.tourListContent}
          ListHeaderComponent={
            <View style={styles.tourHeaderContainer}>
              <Text style={styles.tourHeaderText}>Your Tour</Text>
            </View>
          }
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
    backgroundColor: '#282828',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#990000',
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
  tourListContent: {
    paddingBottom: 50, // Adjust this value based on the height of the tab bar
  },
  tourHeaderContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tourHeaderText: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
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
  tourStopImage: {
    width: 100,
    height: 120,
    backgroundColor: '#DDDDDD',
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
  tourStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tourStopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
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
  checkboxContainer: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#990000',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxContainerChecked: {
    backgroundColor: '#990000',
    borderColor: '#990000',
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
});
