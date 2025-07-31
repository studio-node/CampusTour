import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { 
  authService, 
  tourAppointmentsService, 
  tourGroupSelectionService,
  schoolService,
  leadsService,
  TourAppointment,
  TourParticipant 
} from '@/services/supabase';
import { formatInterest, formatIdentity } from '@/constants/labels';

export default function TourDetailsScreen() {
  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState<TourAppointment | null>(null);
  const [participants, setParticipants] = useState<TourParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadTourDetails();
  }, []);

  const loadTourDetails = async () => {
    try {
      const selectedTourId = await tourGroupSelectionService.getSelectedTourGroup();
      
      if (!selectedTourId) {
        Alert.alert('Error', 'No tour selected. Please go back and select a tour.');
        router.back();
        return;
      }

      // Get tour details
      const tourDetails = await tourAppointmentsService.getTourAppointmentById(selectedTourId);
      
      if (!tourDetails) {
        Alert.alert('Error', 'Could not load tour details.');
        router.back();
        return;
      }

      setTour(tourDetails);

      // Load participants
      setLoadingParticipants(true);
      const tourParticipants = await leadsService.getTourParticipants(selectedTourId);
      setParticipants(tourParticipants);
    } catch (error) {
      console.error('Error loading tour details:', error);
      Alert.alert('Error', 'Failed to load tour details. Please try again.');
    } finally {
      setLoading(false);
      setLoadingParticipants(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleStartTour = () => {
    // Placeholder for start tour functionality
    Alert.alert('Start Tour', 'Tour start functionality will be implemented later.');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeString = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const dateString2 = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (isToday) {
      return `Today at ${timeString}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeString}`;
    } else {
      return `${dateString2} at ${timeString}`;
    }
  };



  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return '#4CAF50'; // Green
      case 'active':
        return '#FF9800'; // Orange
      case 'completed':
        return '#9E9E9E'; // Gray
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#2196F3'; // Blue
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading tour details...</Text>
      </View>
    );
  }

  if (!tour) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>No tour details available</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={handleGoBack}>
          <Text style={styles.headerBackButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tour Information */}
        <View style={styles.tourInfoSection}>
          <View style={styles.tourHeader}>
            <Text style={styles.tourTitle}>{tour.title || 'Campus Tour'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tour.status) }]}>
              <Text style={styles.statusText}>{tour.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.tourDateTime}>{formatDateTime(tour.scheduled_date)}</Text>
          
          {tour.schools?.name && (
            <Text style={styles.schoolName}>{tour.schools.name}</Text>
          )}

          {tour.description && (
            <Text style={styles.tourDescription}>{tour.description}</Text>
          )}

          <View style={styles.participantSummary}>
            <Text style={styles.participantSummaryText}>
              {tour.participants_signed_up} / {tour.max_participants} participants registered
            </Text>
          </View>
        </View>

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Participants</Text>
          
          {loadingParticipants ? (
            <View style={styles.loadingParticipants}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadingParticipantsText}>Loading participants...</Text>
            </View>
          ) : participants.length > 0 ? (
            participants.map((participant, index) => (
              <View key={participant.id || index} style={styles.participantCard}>
                <View style={styles.participantHeader}>
                  <Text style={styles.participantName}>{participant.name}</Text>
                  <Text style={styles.participantIdentity}>{formatIdentity(participant.identity)}</Text>
                </View>
                {participant.interests && participant.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    <Text style={styles.interestsLabel}>Interests:</Text>
                    <View style={styles.interestsTags}>
                      {participant.interests.map((interest, idx) => (
                        <View key={idx} style={styles.interestTag}>
                          <Text style={styles.interestTagText}>{formatInterest(interest)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noParticipantsText}>
              No participants have signed up yet.
            </Text>
          )}
        </View>

        {/* Start Tour Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.startTourButton}
            onPress={handleStartTour}
            activeOpacity={0.8}
          >
            <Text style={styles.startTourButtonText}>Start Tour</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerBackButton: {
    alignSelf: 'flex-start',
  },
  headerBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tourInfoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tourTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tourDateTime: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 12,
  },
  tourDescription: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 16,
  },
  participantSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantSummaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  participantsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  participantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  participantIdentity: {
    fontSize: 14,
    color: '#aaa',
    fontStyle: 'italic',
  },
  interestsContainer: {
    marginTop: 12,
  },
  interestsLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    fontWeight: '500',
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  interestTagText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  loadingParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingParticipantsText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  noParticipantsText: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  actionSection: {
    paddingBottom: 40,
  },
  startTourButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startTourButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});