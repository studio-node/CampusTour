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
import { leadsService, schoolService, tourGroupSelectionService, userTypeService } from '@/services/supabase';

type Identity = 'prospective-student' | 'friend-family' | 'touring-campus' | '';
type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | '';
type CommMethod = 'Mail' | 'Email' | 'Phone';

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

interface FormErrors {
  identity?: string;
  name?: string;
  address?: string;
  dateOfBirth?: string;
  email?: string;
  gender?: string;
  phone?: string;
  gradYear?: string;
}

export default function LeadCaptureScreen() {
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

  const [communicationPrefs, setCommunicationPrefs] = useState<CommMethod[]>([]);
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tourAppointmentId, setTourAppointmentId] = useState<string | null>(null);
  const [isAmbassadorLed, setIsAmbassadorLed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const loadData = async () => {
      const selectedSchoolId = await schoolService.getSelectedSchool();
      const selectedTourGroupId = await tourGroupSelectionService.getSelectedTourGroup();
      const userType = await userTypeService.getUserType();
      
      if (!selectedSchoolId) {
        Alert.alert('Error', 'No school selected. Please select a school first.');
        router.back();
        return;
      }
      
      setSchoolId(selectedSchoolId);
      setTourAppointmentId(selectedTourGroupId);
      setIsAmbassadorLed(userType === 'ambassador-led');
    };

    loadData();
  }, [router]);

  const validateField = (field: keyof UserInfo, value: string): string => {
    switch (field) {
      case 'identity':
        return value ? '' : 'Please select your identity';
      case 'name':
        return value.trim() ? '' : 'Full name is required';
      case 'address':
        // Address is only required for prospective students
        if (userInfo.identity === 'prospective-student' && !value.trim()) {
          return 'Address is required';
        }
        return '';
      case 'email':
        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (!value.trim()) return 'Email is required';
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      case 'dateOfBirth':
        if (!value.trim()) return '';
        const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
        return dateRegex.test(value) ? '' : 'Please use MM/DD/YYYY format';
      case 'gradYear':
        if (!value.trim()) return '';
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (isNaN(year) || year < currentYear || year > currentYear + 10) {
          return 'Please enter a valid graduation year';
        }
        return '';
      default:
        return '';
    }
  };

  const updateUserInfo = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
    // We pass the entire potential new state to validateField to handle dependencies
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateAllFields = (): boolean => {
    const newErrors: FormErrors = {};
    const fieldsToValidate = Object.keys(userInfo) as (keyof UserInfo)[];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, userInfo[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    // Universal required fields
    if (!userInfo.identity || !userInfo.name.trim() || !userInfo.email.trim()) {
        return false;
    }
    // Prospective student required field
    if (userInfo.identity === 'prospective-student' && !userInfo.address.trim()) {
        return false;
    }

    // Check for any existing format errors on any visible field
    const visibleFields: (keyof UserInfo)[] = ['identity', 'name', 'email'];
    switch (userInfo.identity) {
        case 'prospective-student':
            visibleFields.push('address', 'dateOfBirth', 'gender', 'phone', 'gradYear');
            break;
        case 'friend-family':
            visibleFields.push('address', 'phone');
            break;
        case 'touring-campus':
            visibleFields.push('dateOfBirth', 'address', 'phone');
            break;
    }
    
    for (const field of visibleFields) {
        if (errors[field]) {
            return false; // If there's an error on a visible field, form is invalid
        }
    }
    return true;
  };

  const handleCommPrefChange = (pref: CommMethod) => {
    setCommunicationPrefs(prev => 
      prev.includes(pref) 
        ? prev.filter(item => item !== pref) 
        : [...prev, pref]
    );
  };

  const formatDateForDatabase = (dateString: string): string | null => {
    if (!dateString.trim()) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      if (year.length === 4 && parseInt(month, 10) >= 1 && parseInt(day, 10) >= 1) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
      // Base lead data for all users
      const leadData: any = {
        school_id: schoolId,
        name: userInfo.name.trim(),
        identity: userInfo.identity,
        email: userInfo.email.trim().toLowerCase(),
        tour_appointment_id: tourAppointmentId
      };

      // Conditionally add data to be saved based on identity
      switch (userInfo.identity) {
        case 'prospective-student':
          leadData.address = userInfo.address.trim();
          leadData.date_of_birth = formatDateForDatabase(userInfo.dateOfBirth);
          leadData.gender = userInfo.gender || null;
          leadData.grad_year = userInfo.gradYear.trim() ? parseInt(userInfo.gradYear.trim()) : null;
          break;
        case 'friend-family':
          leadData.address = userInfo.address.trim();
          break;
        case 'touring-campus':
          leadData.address = userInfo.address.trim();
          leadData.date_of_birth = formatDateForDatabase(userInfo.dateOfBirth);
          break;
      }


      const result = await leadsService.createLead(leadData);

      if (result.success) {
        if (result.id) await leadsService.saveLeadId(result.id);
        if (isAmbassadorLed) {
          router.push('/interest-selection');
        } else {
          router.replace('/(tabs)/map');
        }
      } else {
        Alert.alert('Error Saving Information', result.error || 'Failed to save information.');
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const identityOptions = [
    { value: 'prospective-student', label: 'Prospective Student' },
    { value: 'friend-family', label: 'Friends/Family' },
    { value: 'touring-campus', label: 'Just Touring' }
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' }
  ];

  // --- RENDER HELPER FUNCTIONS ---
  const renderDropdownField = (
    label: string,
    value: string,
    onPress: () => void,
    options: {value: string, label: string}[],
    required: boolean = false
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label} {required && <Text style={styles.required}>*</Text>}</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={onPress}>
        <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
          {value ? options.find(opt => opt.value === value)?.label : `Select ${label}`}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: {value: string, label: string}[],
    onSelect: (value: string) => void
  ) => (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity key={option.value} style={styles.modalOption} onPress={() => {onSelect(option.value); onClose();}}>
              <Text style={styles.modalOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
      </View></View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>
          {isAmbassadorLed 
            ? 'Help us personalize your ambassador-led tour experience'
            : 'Help us personalize your campus tour experience'
          }
        </Text>

        {/* --- ALWAYS VISIBLE FIELDS --- */}
        {renderDropdownField('Identity', userInfo.identity, () => setShowIdentityModal(true), identityOptions, true)}
        {errors.identity && <Text style={styles.errorText}>{errors.identity}</Text>}

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.textInput, errors.name ? styles.errorInput : null]} value={userInfo.name} onChangeText={(text) => updateUserInfo('name', text)} placeholder="Enter your full name" placeholderTextColor="#999"/>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput style={[styles.textInput, errors.email ? styles.errorInput : null]} value={userInfo.email} onChangeText={(text) => updateUserInfo('email', text)} placeholder="Enter your email" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none"/>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* --- CONDITIONAL FIELDS: PROSPECTIVE STUDENT --- */}
        {userInfo.identity === 'prospective-student' && (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Address <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.textInput, errors.address ? styles.errorInput : null]} value={userInfo.address} onChangeText={(text) => updateUserInfo('address', text)} placeholder="Enter your address" placeholderTextColor="#999" multiline/>
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput style={[styles.textInput, errors.dateOfBirth ? styles.errorInput : null]} value={userInfo.dateOfBirth} onChangeText={(text) => updateUserInfo('dateOfBirth', text)} placeholder="MM/DD/YYYY" placeholderTextColor="#999"/>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>
            {renderDropdownField('Gender', userInfo.gender, () => setShowGenderModal(true), genderOptions)}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.textInput} value={userInfo.phone} onChangeText={(text) => updateUserInfo('phone', text)} placeholder="Enter your phone number (optional)" placeholderTextColor="#999" keyboardType="phone-pad"/>
              <Text style={styles.fieldNote}>Note: Phone number will not be saved to our database</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Expected Graduation Year</Text>
              <TextInput style={[styles.textInput, errors.gradYear ? styles.errorInput : null]} value={userInfo.gradYear} onChangeText={(text) => updateUserInfo('gradYear', text)} placeholder="e.g., 2028" placeholderTextColor="#999" keyboardType="numeric"/>
              {errors.gradYear && <Text style={styles.errorText}>{errors.gradYear}</Text>}
            </View>
          </>
        )}

        {/* --- CONDITIONAL FIELDS: FRIEND/FAMILY --- */}
        {userInfo.identity === 'friend-family' && (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput style={styles.textInput} value={userInfo.address} onChangeText={(text) => updateUserInfo('address', text)} placeholder="Enter your address (optional)" placeholderTextColor="#999" multiline/>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.textInput} value={userInfo.phone} onChangeText={(text) => updateUserInfo('phone', text)} placeholder="Enter your phone number (optional)" placeholderTextColor="#999" keyboardType="phone-pad"/>
              <Text style={styles.fieldNote}>Note: Phone number will not be saved to our database</Text>
            </View>
          </>
        )}

        {/* --- CONDITIONAL FIELDS: JUST TOURING --- */}
        {userInfo.identity === 'touring-campus' && (
          <>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Address</Text>
              <TextInput style={styles.textInput} value={userInfo.address} onChangeText={(text) => updateUserInfo('address', text)} placeholder="Enter your address (optional)" placeholderTextColor="#999" multiline/>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput style={[styles.textInput, errors.dateOfBirth ? styles.errorInput : null]} value={userInfo.dateOfBirth} onChangeText={(text) => updateUserInfo('dateOfBirth', text)} placeholder="MM/DD/YYYY (optional)" placeholderTextColor="#999"/>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.textInput} value={userInfo.phone} onChangeText={(text) => updateUserInfo('phone', text)} placeholder="Enter your phone number (optional)" placeholderTextColor="#999" keyboardType="phone-pad"/>
              <Text style={styles.fieldNote}>Note: Phone number will not be saved to our database</Text>
            </View>
          </>
        )}

        {/* --- NEW COMMUNICATION PREFERENCE FIELD (ALWAYS VISIBLE if identity is selected) --- */}
        {userInfo.identity && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Preferred Communication Method</Text>
            {(['Mail', 'Email', 'Phone'] as CommMethod[]).map(pref => (
              <TouchableOpacity key={pref} style={styles.checkboxContainer} onPress={() => handleCommPrefChange(pref)}>
                <View style={[styles.checkbox, communicationPrefs.includes(pref) && styles.checkboxChecked]}>
                  {communicationPrefs.includes(pref) && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{pref}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.continueButton, (!isFormValid() || isSubmitting) && styles.continueButtonDisabled]} onPress={handleContinue} disabled={!isFormValid() || isSubmitting}>
          <Text style={styles.continueButtonText}>{isSubmitting ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderModal(showIdentityModal, () => setShowIdentityModal(false), 'Select Identity', identityOptions, (value) => updateUserInfo('identity', value as Identity))}
      {renderModal(showGenderModal, () => setShowGenderModal(false), 'Select Gender', genderOptions, (value) => updateUserInfo('gender', value as Gender))}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#282828' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  backButton: { alignSelf: 'flex-start' },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#fff' },
  subtitle: { fontSize: 16, marginBottom: 30, textAlign: 'center', color: '#ccc', lineHeight: 22 },
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#fff' },
  required: { color: '#ff6b6b' },
  errorText: { color: '#ff6b6b', fontSize: 12, marginTop: 4 },
  errorInput: { borderColor: '#ff6b6b' },
  fieldNote: { fontSize: 12, color: '#999', marginTop: 4, fontStyle: 'italic' },
  textInput: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 8, padding: 16, fontSize: 16, color: '#fff' },
  dropdownButton: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 16, color: '#fff' },
  placeholderText: { color: '#999' },
  dropdownArrow: { color: '#ccc', fontSize: 12 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#fff', borderColor: '#fff' },
  checkboxCheckmark: { color: '#282828', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { color: '#fff', fontSize: 16 },
  continueButton: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 50, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  continueButtonDisabled: { backgroundColor: '#666' },
  continueButtonText: { color: '#282828', fontSize: 18, fontWeight: 'bold' },
  bottomSpacing: { height: 30 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  modalOption: { paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
  modalCancelButton: { paddingVertical: 15, marginTop: 10, backgroundColor: '#f0f0f0', borderRadius: 8 },
  modalCancelText: { fontSize: 16, color: '#666', textAlign: 'center', fontWeight: '600' },
});