import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  tourAppointmentsService,
  tourGroupSelectionService,
  TourAppointment,
  schoolService,
  School,
  leadsService,
} from '@/services/supabase';
import ConfirmationCodeInput from '@/components/ConfirmationCodeInput';

export default function TourConfirmationScreen() {
  const router = useRouter();
  const [tour, setTour] = useState<TourAppointment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setError('');
      
      try {
        const tourId = await tourGroupSelectionService.getSelectedTourGroup();
        if (!tourId) {
          setError('No tour selected. Please select a tour group first.');
          router.replace('/tour-group-selection');
          return;
        }

        const tourDetails = await tourAppointmentsService.getTourAppointmentById(tourId);
        setTour(tourDetails);
        
        if (tourDetails) {
          const schoolDetails = await schoolService.getSchoolById(tourDetails.school_id);
          setSchool(schoolDetails);
        }
      } catch (err) {
        setError('Failed to load tour details. Please try again.');
        console.error('Error loading tour details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, []);

  const handleConfirmationCodeComplete = async (code: string) => {
    if (!tour) return;
    
    try {
      const result = await leadsService.verifyConfirmationCode(code, tour.id);
      
      if (result.success && result.lead) {
        // Successfully verified, store the verified lead ID and proceed
        await leadsService.saveLeadId(result.lead.id as string);
        
        // Navigate to tour details screen (Join Tour screen)
        router.replace('/tour-details');
      } else {
        setVerificationError(result.error || 'Invalid confirmation code');
      }
    } catch (error) {
      console.error('Error verifying confirmation code:', error);
      setVerificationError('An error occurred during verification');
    }
  };

  const handleCancelConfirmation = () => {
    router.back();
  };

  const handleBackToTourSelection = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading tour details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBackToTourSelection}>
          <Text style={styles.retryButtonText}>Back to Tour Selection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToTourSelection}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Enter Confirmation Code</Text>
          <Text style={styles.subtitle}>
            Enter the 6-character code you received when scheduling your tour
          </Text>
        </View>

        <ConfirmationCodeInput
          onCodeComplete={handleConfirmationCodeComplete}
          onCancel={handleCancelConfirmation}
          error={verificationError}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
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
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
