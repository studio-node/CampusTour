import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { leadsService, schoolService, tourGroupSelectionService } from '@/services/supabase';

type Identity = 'prospective-student' | 'friend-family' | 'touring-campus' | '';
type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | '';

interface UserInfo {
  identity: Identity;
  name: string;
  address: string;
  dateOfBirth: string;
  email: string;
  gender: Gender;
  phone: string;
  gradYear: string;
}

export default function ParticipantInfoScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    identity: '',
    name: '',
    address: '',
    dateOfBirth: '',
    email: '',
    gender: '',
    phone: '',
    gradYear: ''
  });

  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tourAppointmentId, setTourAppointmentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the selected school ID and tour appointment ID on component mount
  useEffect(() => {
    const loadData = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      const selectedTourGroupId = await tourGroupSelectionService.getSelectedTourGroup();
      
      if (!selectedSchoolId) {
        // If no school is selected, redirect back
        Alert.alert('Error', 'No school selected. Please select a school first.');
        router.back();
        return;
      }
      
      setSchoolId(selectedSchoolId);
      setTourAppointmentId(selectedTourGroupId);
      
      console.log('School ID:', selectedSchoolId);
      console.log('Tour Appointment ID:', selectedTourGroupId);
    };

    loadData();
  }, [router]);

  const identityOptions = [
    { value: 'prospective-student', label: 'Prospective Student' },
    { value: 'friend-family', label: 'Friend/Family of Prospective Student' },
    { value: 'touring-campus', label: 'Just Touring Campus' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ];

  const updateUserInfo = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    return userInfo.identity && 
           userInfo.name.trim() && 
           userInfo.address.trim() && 
           userInfo.email.trim();
  };

  // Helper function to format date for database (YYYY-MM-DD)
  const formatDateForDatabase = (dateString: string): string | null => {
    if (!dateString.trim()) return null;
    
    // Try to parse MM/DD/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // Basic validation
      if (year.length === 4 && parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  };

  const handleContinue = async () => {
    if (!isFormValid()) {
      Alert.alert('Missing Information', 'Please fill out all required fields.');
      return;
    }

    if (!schoolId) {
      Alert.alert('Error', 'No school selected. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare lead data for database
      const leadData = {
        school_id: schoolId,
        name: userInfo.name.trim(),
        identity: userInfo.identity,
        address: userInfo.address.trim(),
        email: userInfo.email.trim().toLowerCase(),
        date_of_birth: formatDateForDatabase(userInfo.dateOfBirth),
        gender: userInfo.gender || null,
        grad_year: userInfo.gradYear.trim() ? parseInt(userInfo.gradYear.trim()) : null,
        tour_appointment_id: tourAppointmentId
      };

      // Save to database
      console.log('Creating lead with tour appointment ID:', tourAppointmentId);
      const result = await leadsService.createLead(leadData);

      if (result.success) {
        console.log('Lead created successfully for tour appointment:', tourAppointmentId);
        // Success - navigate to interest selection for ambassador-led tours
        router.push('/interest-selection');
      } else {
        // Show error
        Alert.alert(
          'Error Saving Information', 
          result.error || 'Failed to save your information. Please try again.',
          [
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      Alert.alert(
        'Error', 
        'An unexpected error occurred. Please try again.',
        [
          { text: 'OK' }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const renderDropdownField = (
    label: string,
    value: string,
    onPress: () => void,
    required: boolean = false
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={onPress}>
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value ? 
            (label === 'Identity' ? 
              identityOptions.find(opt => opt.value === value)?.label :
              genderOptions.find(opt => opt.value === value)?.label
            ) : 
            `Select ${label}`
          }
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: Array<{value: string, label: string}>,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.modalOption}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
            >
              <Text style={styles.modalOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          Help us personalize your ambassador-led tour experience
        </Text>

        {renderDropdownField(
          'Identity', 
          userInfo.identity, 
          () => setShowIdentityModal(true),
          true
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.name}
            onChangeText={(text) => updateUserInfo('name', text)}
            placeholder="Enter your full name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Address <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.address}
            onChangeText={(text) => updateUserInfo('address', text)}
            placeholder="Enter your address"
            placeholderTextColor="#999"
            multiline={true}
            numberOfLines={2}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.dateOfBirth}
            onChangeText={(text) => updateUserInfo('dateOfBirth', text)}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.email}
            onChangeText={(text) => updateUserInfo('email', text)}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {renderDropdownField(
          'Gender', 
          userInfo.gender, 
          () => setShowGenderModal(true)
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.phone}
            onChangeText={(text) => updateUserInfo('phone', text)}
            placeholder="Enter your phone number (optional)"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
          <Text style={styles.fieldNote}>
            Note: Phone number will not be saved to our database
          </Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Expected Graduation Year</Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.gradYear}
            onChangeText={(text) => updateUserInfo('gradYear', text)}
            placeholder="e.g., 2028"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity 
          style={[styles.continueButton, (!isFormValid() || isSubmitting) && styles.continueButtonDisabled]} 
          onPress={handleContinue}
          disabled={!isFormValid() || isSubmitting}
        >
          <Text style={styles.continueButtonText}>
            {isSubmitting ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderModal(
        showIdentityModal,
        () => setShowIdentityModal(false),
        'Select Identity',
        identityOptions,
        (value) => updateUserInfo('identity', value as Identity)
      )}

      {renderModal(
        showGenderModal,
        () => setShowGenderModal(false),
        'Select Gender',
        genderOptions,
        (value) => updateUserInfo('gender', value as Gender)
      )}
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#ccc',
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  required: {
    color: '#ff6b6b',
  },
  fieldNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  dropdownButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#fff',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    color: '#ccc',
    fontSize: 12,
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
  },
  continueButtonText: {
    color: '#282828',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  modalCancelButton: {
    paddingVertical: 15,
    marginTop: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
}); 