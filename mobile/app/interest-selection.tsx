import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { 
  analyticsService, 
  schoolService, 
  tourGroupSelectionService 
} from '@/services/supabase';
import { interests } from '@/constants/labels';

export default function InterestSelectionScreen() {
  const router = useRouter();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tourAppointmentId, setTourAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    // Get school ID and tour appointment ID when component mounts
    const loadData = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      const selectedTourGroupId = await tourGroupSelectionService.getSelectedTourGroup();
      
      setSchoolId(selectedSchoolId);
      setTourAppointmentId(selectedTourGroupId);
      
      console.log('School ID:', selectedSchoolId);
      console.log('Tour Appointment ID:', selectedTourGroupId);
    };
    
    loadData();
  }, []);

  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      setSelectedInterests(selectedInterests.filter(id => id !== interestId));
    } else {
      setSelectedInterests([...selectedInterests, interestId]);
    }
  };

  const handleContinue = async () => {
    // Export analytics for interest selection if we have school data
    if (schoolId) {
      console.log('Exporting interest analytics:', {
        schoolId,
        interests: selectedInterests,
        tourAppointmentId
      });
      
      try {
        const analyticsResult = await analyticsService.exportInterestsChosen(
          schoolId,
          selectedInterests,
          tourAppointmentId
        );
        
        if (!analyticsResult.success) {
          console.warn('Failed to export analytics:', analyticsResult.error);
          // Continue with navigation even if analytics fails
        }
      } catch (error) {
        console.error('Error exporting analytics:', error);
        // Continue with navigation even if analytics fails
      }
    }
    
    // For ambassador-led tours, proceed to the map screen
    router.push('/(tabs)/map');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Discover Your Campus</Text>
          <Text style={styles.subtitle}>
            Select your interests to personalize your tour experience
          </Text>
        </View>

        {/* Interest Grid */}
        <View style={styles.interestGrid}>
          {interests.map((interest) => (
            <TouchableOpacity
              key={interest.id}
              style={[
                styles.interestCard,
                selectedInterests.includes(interest.id) && styles.selectedInterestCard
              ]}
              onPress={() => toggleInterest(interest.id)}
            >
              <Text style={[
                styles.interestText,
                selectedInterests.includes(interest.id) && styles.selectedInterestText
              ]}>
                {interest.name}
              </Text>
              {selectedInterests.includes(interest.id) && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected Count */}
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {selectedInterests.length > 0 ? 'Continue with Selected Interests' : 'Continue with Default Tour'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            Your selected interests will help customize your tour experience. You can always explore other areas during the tour.
          </Text>
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
    lineHeight: 24,
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  interestCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    minHeight: 60,
    justifyContent: 'center',
  },
  selectedInterestCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  interestText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    paddingRight: 20,
  },
  selectedInterestText: {
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  selectionInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  selectionText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  actionSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 