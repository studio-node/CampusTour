import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { 
  ActivityIndicator, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Image,
  Alert
} from 'react-native';
import { 
  tourAppointmentsService, 
  tourGroupSelectionService,
  TourAppointment,
  userTypeService,
  UserType,
  authService,
  schoolService,
  School
} from '@/services/supabase';
import { wsManager } from '@/services/ws';

export default function TourDetailsScreen() {
  const router = useRouter();
  const [tour, setTour] = useState<TourAppointment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<UserType>(null);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const type = await userTypeService.getUserType();
      setUserType(type);

      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) {
        setError('No tour selected.');
        setLoading(false);
        return;
      }

      try {
        const tourDetails = await tourAppointmentsService.getTourAppointmentById(tourId);
        setTour(tourDetails);
        if (tourDetails) {
            const schoolDetails = await schoolService.getSchoolById(tourDetails.school_id);
            setSchool(schoolDetails);
        }
      } catch (err) {
        setError('Failed to load tour details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initialize();

    const handleTourStarted = (message: any) => {
        if (userType === 'ambassador-led' && message.type === 'tour_started') {
            router.replace('/(tabs)');
        }
    }

    wsManager.on('message', handleTourStarted);

    return () => {
        wsManager.off('message', handleTourStarted);
    }
  }, [userType]);

  const handleStartTour = async () => {
    if (!tour) return;
    const user = await authService.getStoredUser();
    if (!user) {
        Alert.alert("Error", "You must be logged in to start a tour.");
        return;
    }

    if (wsManager.getStatus() !== 'open') {
        Alert.alert("Error", "Not connected to the server. Please check your connection.");
        return;
    }

    const initial_structure = {
        // This should be replaced with the actual tour structure
        locations: [],
        interests: []
    };

    const payload = {
        tourId: tour.id,
        ambassador_id: user.id,
        initial_structure: initial_structure,
    };
    wsManager.send('create_session', payload);
    
    // For now, we'll navigate immediately. In a real scenario, you'd wait for a 'session_created' confirmation.
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Loading tour details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text>{error}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {tour && (
        <>
          <View style={styles.header}>
            <Image source={{ uri: school?.logo_url }} style={styles.schoolLogo} />
            <Text style={styles.title}>{tour.title || 'Tour Details'}</Text>
            <Text style={styles.subtitle}>
              Led by {tour.profiles?.full_name || 'TBA'}
            </Text>
          </View>
          <View style={styles.content}>
            {userType === 'ambassador' ? (
              <TouchableOpacity style={styles.button} onPress={handleStartTour}>
                <Text style={styles.buttonText}>Start Tour</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.waitingText}>Waiting for the ambassador to start the tour...</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  schoolLogo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
  },
  content: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  waitingContainer: {
    alignItems: 'center',
  },
  waitingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#ccc',
  },
});
