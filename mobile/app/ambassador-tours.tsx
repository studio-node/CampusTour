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
  TourAppointment 
} from '@/services/supabase';

export default function AmbassadorToursScreen() {
  const [tours, setTours] = useState<TourAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
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

  const handleTourSelect = async (tour: TourAppointment) => {
    try {
      // Set the selected tour group
      await tourGroupSelectionService.setSelectedTourGroup(tour.id);
      
      // Set school if available
      if (tour.school_id) {
        await schoolService.setSelectedSchool(tour.school_id);
      }

      Alert.alert(
        'Tour Selected',
        `You've selected the tour at ${tour.schools?.name || 'the selected school'}.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to the appropriate next screen (could be map or tour management)
              router.push('/school-selection'); // For now, redirect to school selection
            }
          }
        ]
      );
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

  const renderTourItem = ({ item }: { item: TourAppointment }) => (
    <TouchableOpacity
      style={styles.tourCard}
      onPress={() => handleTourSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.tourHeader}>
        <Text style={styles.schoolName}>{item.schools?.name || 'School Tour'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.tourDateTime}>{formatDateTime(item.scheduled_date)}</Text>
      
      {item.schools?.city && item.schools?.state && (
        <Text style={styles.schoolLocation}>{item.schools.city}, {item.schools.state}</Text>
      )}
      
      {item.title && (
        <Text style={styles.tourTitle}>{item.title}</Text>
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
  );

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
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
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
});