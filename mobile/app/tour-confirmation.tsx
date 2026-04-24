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
  TextInput,
} from 'react-native';
import {
  tourAppointmentsService,
  tourGroupSelectionService,
  TourAppointment,
  schoolService,
  School,
  leadsService,
  generalMemberService,
} from '@/services/supabase';
import ConfirmationCodeInput from '@/components/ConfirmationCodeInput';
import { IconSymbol } from '@/components/ui/IconSymbol';

function uuidv4(): string {
  // Good-enough UUID v4 for session identity (not cryptographic).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function TourConfirmationScreen() {
  const router = useRouter();
  const [tour, setTour] = useState<TourAppointment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [isGeneralCode, setIsGeneralCode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [pendingCode, setPendingCode] = useState<string | null>(null);

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
    setVerificationError('');
    setIsGeneralCode(false);
    setPendingCode(null);
    
    try {
      const normalized = (code || '').trim().toUpperCase();
      const result = await leadsService.verifyConfirmationCode(normalized, tour.id);
      
      if (result.success && result.lead) {
        // Successfully verified, store the verified lead ID and proceed
        await leadsService.saveLeadId(result.lead.id as string);
        await generalMemberService.clear();
        
        // Navigate to tour details screen (Join Tour screen)
        router.replace('/tour-details');
      } else {
        // If not a lead confirmation, see if it's the appointment's general confirmation code.
        const generalCheck = await tourAppointmentsService.verifyGeneralConfirmationCode(tour.id, normalized);
        if (generalCheck.success && generalCheck.isGeneralCode) {
          setIsGeneralCode(true);
          setPendingCode(normalized);
          setVerificationError('');
          return;
        }
        setVerificationError(result.error || generalCheck.error || 'Invalid confirmation code');
      }
    } catch (error) {
      console.error('Error verifying confirmation code:', error);
      setVerificationError('An error occurred during verification');
    }
  };

  const handleGeneralMemberContinue = async () => {
    if (!tour || !pendingCode) return;
    const trimmed = firstName.trim();
    if (!trimmed) {
      setVerificationError('Please enter your first name');
      return;
    }

    // Clear any stored lead id; this is a general (non-lead) join.
    await leadsService.clearStoredLeadId();

    const member = { id: uuidv4(), first_name: trimmed };
    await generalMemberService.save(member);

    router.replace('/tour-details');
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
          <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
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

        {isGeneralCode && (
          <View style={styles.generalMemberSection}>
            <Text style={styles.generalMemberTitle}>One more thing</Text>
            <Text style={styles.generalMemberSubtitle}>
              Enter your first name so the ambassador can identify you on the tour roster.
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.firstNameInput}
              returnKeyType="done"
              onSubmitEditing={handleGeneralMemberContinue}
            />
            <TouchableOpacity style={styles.continueButton} onPress={handleGeneralMemberContinue}>
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  generalMemberSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  generalMemberTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  generalMemberSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  firstNameInput: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
