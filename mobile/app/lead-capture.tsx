import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect, useMemo } from 'react';
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
import { IconSymbol } from '@/components/ui/IconSymbol';
import { leadsService, schoolService, tourGroupSelectionService, userTypeService } from '@/services/supabase';
import { formatExpectedAttendanceLabel, getExpectedAttendanceOptions } from '@/lib/expectedAttendance';

type Identity = 'prospective-student' | 'friend-family' | 'touring-campus' | '';

interface UserInfo {
  identity: Identity;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  expectedAttendance: string;
}

interface FormErrors {
  identity?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  expectedAttendance?: string;
}

export default function LeadCaptureScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo>({
    identity: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    expectedAttendance: '',
  });

  const attendanceOptions = useMemo(() => getExpectedAttendanceOptions(), []);

  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showExpectedAttendanceModal, setShowExpectedAttendanceModal] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('School');
  const [tourAppointmentId, setTourAppointmentId] = useState<string | null>(null);
  const [isAmbassadorLed, setIsAmbassadorLed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Get the selected school ID and tour data on component mount
  useEffect(() => {
    const loadData = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      const selectedTourGroupId = await tourGroupSelectionService.getSelectedTourGroup();
      const userType = await userTypeService.getUserType();
      
      if (!selectedSchoolId) {
        // If no school is selected, redirect back
        Alert.alert('Error', 'No school selected. Please select a school first.');
        router.back();
        return;
      }

      const school = await schoolService.getSchoolById(selectedSchoolId);
      if (school?.name) {
        setSchoolName(school.name);
      }
      
      setSchoolId(selectedSchoolId);
      setTourAppointmentId(selectedTourGroupId);
      setIsAmbassadorLed(userType === 'ambassador-led');
      
      console.log('School ID:', selectedSchoolId);
      console.log('Tour Appointment ID:', selectedTourGroupId);
      console.log('User Type:', userType);
    };

    loadData();
  }, [router]);

  // Real-time validation logic
  const validateField = (field: keyof UserInfo, value: string): string => {
    switch (field) {
      case 'identity':
        return value ? '' : 'Please select your identity';
      case 'firstName':
        return value.trim() ? '' : 'First name is required';
      case 'lastName':
        return value.trim() ? '' : 'Last name is required';
      case 'email': {
        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!value.trim()) return 'Email is required';
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      }
      case 'dateOfBirth':
        if (!value.trim()) return '';
        {
          const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
          return dateRegex.test(value) ? '' : 'Please use MM/DD/YYYY format';
        }
      case 'expectedAttendance':
        if (!value.trim()) return 'Select when you expect to start';
        return /^(fall|spring|summer)_[0-9]{4}$/i.test(value.trim())
          ? ''
          : 'Please select a term';
      default:
        return '';
    }
  };

  const showExtendedLeadFields =
    isAmbassadorLed || userInfo.identity === 'prospective-student';

  const updateUserInfo = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
    if (field === 'identity' && !isAmbassadorLed) {
      if (value === 'prospective-student') {
        const err = validateField('identity', value);
        setErrors((prev) => ({ ...prev, identity: err }));
      } else {
        setErrors({ identity: validateField('identity', value) });
      }
      return;
    }
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  // Check all fields for validation
  const validateAllFields = (): boolean => {
    if (!showExtendedLeadFields) {
      const err = validateField('identity', userInfo.identity);
      if (err) {
        setErrors({ identity: err });
      } else {
        setErrors({});
      }
      return !err;
    }
    const newErrors: FormErrors = {};
    Object.keys(userInfo).forEach((field) => {
      const error = validateField(
        field as keyof UserInfo,
        userInfo[field as keyof UserInfo]
      );
      if (error) {
        newErrors[field as keyof UserInfo] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const identityOptions = [
    { value: 'prospective-student', label: 'Prospective Student' },
    { value: 'friend-family', label: 'Friends/Family' },
    { value: 'touring-campus', label: 'Just Touring' },
  ];

  const getIdentityLabel = (v: string) =>
    identityOptions.find((o) => o.value === v)?.label ?? v;
  const getAttendanceLabel = (v: string) =>
    attendanceOptions.find((o) => o.value === v)?.label ?? formatExpectedAttendanceLabel(v);

  const isFormValid = () => {
    if (!userInfo.identity) return false;
    if (!showExtendedLeadFields) {
      return !errors.identity;
    }
    return (
      userInfo.firstName.trim() &&
      userInfo.lastName.trim() &&
      userInfo.email.trim() &&
      userInfo.expectedAttendance.trim() &&
      Object.values(errors).every((error) => !error)
    );
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
    if (!validateAllFields()) {
      Alert.alert('Missing Information', 'Please fix the errors and fill out all required fields.');
      return;
    }

    if (!schoolId) {
      Alert.alert('Error', 'No school selected. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const skipLeadForSelfGuided =
        !isAmbassadorLed && userInfo.identity !== 'prospective-student';
      if (skipLeadForSelfGuided) {
        await leadsService.clearStoredLeadId();
        router.replace('/(tabs)/map');
        return;
      }

      const leadData = {
        school_id: schoolId,
        first_name: userInfo.firstName.trim(),
        last_name: userInfo.lastName.trim(),
        identity: userInfo.identity,
        email: userInfo.email.trim().toLowerCase(),
        date_of_birth: formatDateForDatabase(userInfo.dateOfBirth),
        expected_attendance: userInfo.expectedAttendance.trim().toLowerCase(),
        tour_appointment_id: tourAppointmentId,
      };

      // Save to database
      const result = await leadsService.createLead(leadData);

      if (result.success) {
        console.log('Lead created successfully, id:', result.id, 'tour appointment ID:', tourAppointmentId);
        if (result.id) {
          await leadsService.saveLeadId(result.id);
        }
        // Success - navigate based on tour type
        if (isAmbassadorLed) {
          // For ambassador-led tours, go to interest selection
          router.push('/interest-selection');
        } else {
          // For self-guided tours, go to main app
          router.replace('/(tabs)/map');
        }
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

  const renderDropdownField = (
    label: string,
    value: string,
    onPress: () => void,
    getDisplay: (v: string) => string,
    required: boolean = false,
    fieldError?: string
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={onPress}>
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value ? getDisplay(value) : 'Choose an option'}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
      {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
    </View>
  );

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: Array<{ value: string; label: string }>,
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
          <ScrollView
            style={styles.modalOptionsScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
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
          </ScrollView>
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
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
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
          {isAmbassadorLed 
            ? 'Help us personalize your ambassador-led tour experience'
            : 'Help us personalize your campus tour experience'
          }
        </Text>

        {renderDropdownField(
          'Identity',
          userInfo.identity,
          () => setShowIdentityModal(true),
          getIdentityLabel,
          true,
          errors.identity
        )}

        {showExtendedLeadFields && (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                First name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, errors.firstName ? styles.errorInput : null]}
                value={userInfo.firstName}
                onChangeText={(text) => updateUserInfo('firstName', text)}
                placeholder="First name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Last name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, errors.lastName ? styles.errorInput : null]}
                value={userInfo.lastName}
                onChangeText={(text) => updateUserInfo('lastName', text)}
                placeholder="Last name"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={[styles.textInput, errors.dateOfBirth ? styles.errorInput : null]}
                value={userInfo.dateOfBirth}
                onChangeText={(text) => updateUserInfo('dateOfBirth', text)}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#999"
              />
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textInput, errors.email ? styles.errorInput : null]}
                value={userInfo.email}
                onChangeText={(text) => updateUserInfo('email', text)}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {renderDropdownField(
              `Expected ${schoolName} attendance`,
              userInfo.expectedAttendance,
              () => setShowExpectedAttendanceModal(true),
              getAttendanceLabel,
              true,
              errors.expectedAttendance
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
          </>
        )}

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
        showExpectedAttendanceModal,
        () => setShowExpectedAttendanceModal(false),
        'Expected first semester of attendance',
        attendanceOptions,
        (value) => updateUserInfo('expectedAttendance', value)
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
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
  },
  errorInput: {
    borderColor: '#ff6b6b',
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
    maxHeight: '75%',
  },
  modalOptionsScroll: {
    maxHeight: 360,
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