import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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

  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);

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
           userInfo.email.trim() && 
           userInfo.phone.trim();
  };

  const handleContinue = () => {
    if (!isFormValid()) {
      Alert.alert('Missing Information', 'Please fill out all required fields.');
      return;
    }
    
    // TODO: Store user info for later use
    console.log('User info collected:', userInfo);
    router.push('/school-selection');
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
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
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
          Help us personalize your campus tour experience
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
          <Text style={styles.label}>
            Phone Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={userInfo.phone}
            onChangeText={(text) => updateUserInfo('phone', text)}
            placeholder="Enter your phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
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
          style={[styles.continueButton, !isFormValid() && styles.continueButtonDisabled]} 
          onPress={handleContinue}
          disabled={!isFormValid()}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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