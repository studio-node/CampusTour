import { IconSymbol } from '@/components/ui/IconSymbol';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapScreen() {
  // Function to handle the "recenter map" button press
  const handleRecenterPress = () => {
    // This will be implemented when we add the actual map functionality
    console.warn('Recenter button pressed - will be implemented with actual map');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Utah Tech Campus Map</Text>
      </View>
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Text style={styles.placeholderText}>
            Map View{'\n'}(Coming soon: Interactive campus map with building markers)
          </Text>
          <IconSymbol 
            name="map" 
            size={60} 
            color="#AAAAAA" 
            style={styles.mapIcon} 
          />
        </View>
        <TouchableOpacity 
          style={styles.recenterButton}
          onPress={handleRecenterPress}
        >
          <IconSymbol name="location.fill" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Recenter Map</Text>
        </TouchableOpacity>
      </View>
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
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#242424',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  mapIcon: {
    marginTop: 20,
    opacity: 0.5,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 100, // Increased to be above tab bar
    right: 24,
    backgroundColor: '#990000', // Utah Tech red color
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
});
