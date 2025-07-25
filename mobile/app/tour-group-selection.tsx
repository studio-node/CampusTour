import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { 
  ActivityIndicator, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Image,
  Alert
} from 'react-native';
import { 
  schoolService, 
  tourAppointmentsService, 
  tourGroupSelectionService, 
  TourAppointment,
  School 
} from '@/services/supabase';

export default function TourGroupSelectionScreen() {
  const router = useRouter();
  const [schoolData, setSchoolData] = useState<School | null>(null);
  const [tourGroups, setTourGroups] = useState<TourAppointment[]>([]);
  const [selectedTourGroup, setSelectedTourGroup] = useState<TourAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTourGroups();
  }, []);

  const loadTourGroups = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get selected school
      const selectedSchoolId = await schoolService.getSelectedSchool();
      if (!selectedSchoolId) {
        setError('No school selected. Please select a school first.');
        router.replace('/school-selection');
        return;
      }
      
      // Get school details
      const school = await schoolService.getSchoolById(selectedSchoolId);
      setSchoolData(school);
      
      // Get available tour groups
      const groups = await tourAppointmentsService.getAvailableTourGroups(selectedSchoolId);
      setTourGroups(groups);
      
      // Check if there's a previously selected tour group
      const savedTourGroupId = await tourGroupSelectionService.getSelectedTourGroup();
      if (savedTourGroupId) {
        const savedTourGroup = groups.find(group => group.id === savedTourGroupId);
        if (savedTourGroup) {
          setSelectedTourGroup(savedTourGroup);
        }
      }
      
    } catch (err) {
      setError('Failed to load tour groups. Please try again.');
      console.error('Error loading tour groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectTourGroup = async (tourGroup: TourAppointment) => {
    setSelectedTourGroup(tourGroup);
    await tourGroupSelectionService.setSelectedTourGroup(tourGroup.id);
  };

  const handleContinue = () => {
    if (selectedTourGroup) {
      router.push('/participant-info');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleTryAgain = () => {
    loadTourGroups();
  };

  // Group tours by date
  const toursByDate = () => {
    const grouped: { [key: string]: TourAppointment[] } = {};
    
    tourGroups.forEach(tour => {
      const dateTime = tourAppointmentsService.formatTourDateTime(tour.scheduled_date);
      const dateKey = dateTime.date;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push(tour);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading available tour groups...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Available Tour Groups</Text>
          <Text style={styles.subtitle}>Join an ambassador-led tour group</Text>
          
          {/* Selected School Display */}
          {schoolData && (
            <View style={styles.schoolCard}>
              {schoolData.logo_url && (
                <Image 
                  source={{ uri: schoolData.logo_url }} 
                  style={styles.schoolLogo}
                />
              )}
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{schoolData.name}</Text>
                <Text style={styles.schoolLocation}>{schoolData.city}, {schoolData.state}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Error State */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleTryAgain}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* No Tours Available */}
            {tourGroups.length === 0 ? (
              <View style={styles.noToursContainer}>
                <Text style={styles.noToursTitle}>No Tour Groups Available</Text>
                <Text style={styles.noToursSubtitle}>
                  There are currently no scheduled ambassador-led tours for this school.
                </Text>
                <Text style={styles.noToursNote}>
                  Contact the school to schedule an ambassador-led tour
                </Text>
              </View>
            ) : (
              <>
                {/* Tour Groups by Date */}
                {Object.entries(toursByDate()).map(([date, tours]) => (
                  <View key={date} style={styles.dateSection}>
                    <Text style={styles.dateHeader}>{date}</Text>
                    
                    {tours.map((tour) => {
                      const formattedDateTime = tourAppointmentsService.formatTourDateTime(tour.scheduled_date);
                      const isSelected = selectedTourGroup?.id === tour.id;
                      
                      return (
                        <TouchableOpacity
                          key={tour.id}
                          style={[styles.tourCard, isSelected && styles.selectedTourCard]}
                          onPress={() => selectTourGroup(tour)}
                        >
                          {/* Selected indicator */}
                          {isSelected && (
                            <View style={styles.selectedIndicator}>
                              <Text style={styles.checkmark}>✓</Text>
                            </View>
                          )}

                          <View style={styles.tourCardContent}>
                            {/* Ambassador Name */}
                            <View style={styles.tourRow}>
                              <Text style={styles.tourRowIcon}>👤</Text>
                              <Text style={styles.tourRowText}>
                                {tour.profiles?.full_name || 'TBA'}
                              </Text>
                            </View>

                            {/* Participants */}
                            <View style={styles.tourRow}>
                              <Text style={styles.tourRowIcon}>👥</Text>
                              <Text style={styles.tourRowText}>
                                {tour.participants_signed_up} / {tour.max_participants}
                              </Text>
                            </View>

                            {/* Time */}
                            <View style={styles.tourRow}>
                              <Text style={styles.tourRowIcon}>🕐</Text>
                              <Text style={styles.tourRowText}>
                                {formattedDateTime.time}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {/* Action Section */}
                <View style={styles.actionSection}>
                  <View style={styles.selectedTourInfo}>
                    {selectedTourGroup ? (
                      <>
                        <Text style={styles.selectedTourTitle}>
                          Selected Tour Leader: {selectedTourGroup.profiles?.full_name}
                        </Text>
                        <Text style={styles.selectedTourDetails}>
                          {tourAppointmentsService.formatTourDateTime(selectedTourGroup.scheduled_date).date} at {' '}
                          {tourAppointmentsService.formatTourDateTime(selectedTourGroup.scheduled_date).time}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.noSelectionText}>
                        Select a tour group above to continue
                      </Text>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.continueButton, !selectedTourGroup && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={!selectedTourGroup}
                  >
                    <Text style={styles.continueButtonText}>
                      Continue with Selected Tour
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
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
    marginTop: 16,
    fontSize: 16,
    color: '#ccc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  schoolCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  schoolLogo: {
    width: 80,
    height: 40,
    marginRight: 12,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  schoolLocation: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
    marginLeft: 3,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noToursContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  noToursTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  noToursSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
  },
  noToursNote: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  tourCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  selectedTourCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tourCardContent: {
    paddingRight: 36,
  },
  tourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tourRowIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  tourRowText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  actionSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedTourInfo: {
    marginBottom: 20,
  },
  selectedTourTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedTourDetails: {
    color: '#ccc',
    fontSize: 14,
  },
  noSelectionText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 