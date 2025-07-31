import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
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
  userTypeService,
  leadsService,
  TourAppointment,
  TourParticipant 
} from '@/services/supabase';
import { formatInterest, formatIdentity } from '@/constants/labels';

export default function AmbassadorToursScreen() {
  const [tours, setTours] = useState<TourAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedTours, setExpandedTours] = useState<Set<string>>(new Set());
  const [tourParticipants, setTourParticipants] = useState<{ [key: string]: TourParticipant[] }>({});
  const [loadingParticipants, setLoadingParticipants] = useState<Set<string>>(new Set());
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserAndTours();
  }, []);

  const loadUserAndTours = async () => {
    try {
      // Check for authenticated user from AsyncStorage
      const storedUser = await authService.getStoredUser();
      if (!storedUser) {
        // No stored user, redirect to home
        router.replace('/');
        return;
      }

      setUser(storedUser);
      await loadTours(storedUser.id);
    } catch (error) {
      console.error('Error loading user and tours:', error);
      Alert.alert('Error', 'Failed to load tours. Please try again.');
      // If there's an error, redirect to home
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const loadTours = async (ambassadorId: string) => {
    try {
      const ambassadorTours = await tourAppointmentsService.getAmbassadorTours(ambassadorId);
      setTours(ambassadorTours);
    } catch (error) {
      console.error('Error loading tours:', error);
      Alert.alert('Error', 'Failed to load your tours. Please try again.');
    }
  };

  const onRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      await loadTours(user.id);
    } catch (error) {
      console.error('Error refreshing tours:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTourSelect = (tour: TourAppointment) => {
    setSelectedTourId(tour.id);
  };

  const handleChooseGroup = async () => {
    if (!selectedTourId) return;

    const selectedTour = tours.find(tour => tour.id === selectedTourId);
    if (!selectedTour) return;

    try {
      // Set the selected tour group
      await tourGroupSelectionService.setSelectedTourGroup(selectedTour.id);
      
      // Set school if available
      if (selectedTour.school_id) {
        await schoolService.setSelectedSchool(selectedTour.school_id);
      }

      // Navigate to tour details screen
      router.push('/tour-details');
    } catch (error) {
      console.error('Error selecting tour:', error);
      Alert.alert('Error', 'Failed to select tour. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authService.signOutAndClear();
            await userTypeService.clearUserType();
            router.replace('/');
          }
        }
      ]
    );
  };

  const toggleTourExpansion = async (tourId: string) => {
    const newExpandedTours = new Set(expandedTours);
    
    if (expandedTours.has(tourId)) {
      // Collapse the tour
      newExpandedTours.delete(tourId);
    } else {
      // Expand the tour and load participants if not already loaded
      newExpandedTours.add(tourId);
      
      if (!tourParticipants[tourId]) {
        setLoadingParticipants(prev => new Set([...prev, tourId]));
        try {
          const participants = await leadsService.getTourParticipants(tourId);
          setTourParticipants(prev => ({
            ...prev,
            [tourId]: participants
          }));
        } catch (error) {
          console.error('Error loading tour participants:', error);
          Alert.alert('Error', 'Failed to load participants for this tour.');
        } finally {
          setLoadingParticipants(prev => {
            const newSet = new Set(prev);
            newSet.delete(tourId);
            return newSet;
          });
        }
      }
    }
    
    setExpandedTours(newExpandedTours);
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

    if (isToday) {
      return `Today at ${timeString}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeString}`;
    } else {
      const dateString = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
      return `${dateString} at ${timeString}`;
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



  const renderParticipant = (participant: TourParticipant, index: number) => (
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
  );

  const renderTourItem = ({ item }: { item: TourAppointment }) => {
    const isExpanded = expandedTours.has(item.id);
    const participants = tourParticipants[item.id] || [];
    const isLoadingParticipantsForTour = loadingParticipants.has(item.id);
    const isSelected = selectedTourId === item.id;

    return (
      <View style={[
        styles.tourCard,
        isSelected && styles.selectedTourCard
      ]}>
        <TouchableOpacity
          onPress={() => handleTourSelect(item)}
          activeOpacity={0.7}
          style={styles.tourMainContent}
        >
          <View style={styles.tourHeader}>
            <Text style={styles.tourTitle}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.tourDateTime}>{formatDateTime(item.scheduled_date)}</Text>
          
          {item.schools?.name && (
            <Text style={styles.schoolLocation}>{item.schools.name}</Text>
          )}

          {item.description && (
            <Text style={styles.tourDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.participantInfo}>
            <Text style={styles.participantText}>
              {item.participants_signed_up} / {item.max_participants} participants
            </Text>
          </View>
        </TouchableOpacity>

        {/* Expand/Collapse Button */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => toggleTourExpansion(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? '▼ Hide Participants' : '▶ View Participants'}
          </Text>
        </TouchableOpacity>

        {/* Expanded Participants Section */}
        {isExpanded && (
          <View style={styles.participantsSection}>
            {isLoadingParticipantsForTour ? (
              <View style={styles.loadingParticipants}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loadingParticipantsText}>Loading participants...</Text>
              </View>
            ) : participants.length > 0 ? (
              <View>
                <Text style={styles.participantsSectionTitle}>
                  Participants ({participants.length})
                </Text>
                {participants.map(renderParticipant)}
              </View>
            ) : (
              <Text style={styles.noParticipantsText}>
                No participants have signed up yet.
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading your tours...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.user_metadata?.full_name || user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Your Upcoming Tours</Text>
        
        {tours.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No upcoming tours</Text>
            <Text style={styles.emptyStateText}>
              You don't have any tours scheduled for today or upcoming days.
              Check with your tour coordinator if you expect to see tours here.
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={tours}
              keyExtractor={(item) => item.id}
              renderItem={renderTourItem}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#fff"
                  titleColor="#fff"
                />
              }
              contentContainerStyle={styles.toursList}
            />
            
            {/* Choose Group Button */}
            {selectedTourId && (
              <View style={styles.chooseButtonContainer}>
                <TouchableOpacity
                  style={styles.chooseButton}
                  onPress={handleChooseGroup}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chooseButtonText}>Choose Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    color: '#ccc',
    fontSize: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  toursList: {
    paddingBottom: 20,
  },
  tourCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tourHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  schoolName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tourDateTime: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4,
  },
  schoolLocation: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  tourTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12,
  },
  tourDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantText: {
    fontSize: 14,
    color: '#aaa',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
  },
  // New styles for expanded participant functionality
  tourMainContent: {
    // Styles for the main clickable tour content
  },
  expandButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  expandButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  participantsSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  participantsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  participantCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
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
    fontSize: 16,
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
    marginTop: 8,
  },
  interestsLabel: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 6,
    fontWeight: '500',
  },
  interestsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  interestTagText: {
    fontSize: 11,
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
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  // Selected tour card styles
  selectedTourCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  // Choose Group button styles
  chooseButtonContainer: {
    padding: 20,
    paddingTop: 10,
    marginBottom: 30,
    backgroundColor: '#282828',
  },
  chooseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
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
  chooseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});