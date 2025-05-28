import { School, schoolService } from '@/services/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Image, ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SchoolSelectionScreen() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [selectedSchoolName, setSelectedSchoolName] = useState<string>('');
  const [selectedSchoolCity, setselectedSchoolCity] = useState<string>('');
  const [selectedSchoolLogoUrl, setselectedSchoolLogoUrl] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Check if there's already a selected school
        const savedSchoolId = await schoolService.getSelectedSchool();
        if (savedSchoolId) {
          // Redirect to tabs if a school is already selected
          router.replace('/map');
          return;
        }

        // Fetch all schools
        const schoolsData = await schoolService.getSchools();
        // console.log('Fetched schools:', schoolsData);
        setSchools(schoolsData);
        
        // Set default selection to first school if available
        if (schoolsData.length > 0) {
          setSelectedSchool(schoolsData[0].id);
          setSelectedSchoolName(`${schoolsData[0].name}`);
          setselectedSchoolCity(`${schoolsData[0].city}, ${schoolsData[0].state}`);
          setselectedSchoolLogoUrl(`${schoolsData[0].logo_url}`);
        }
      } catch (error) {
        console.error('Error loading school data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [router]);

  const handleSelectSchool = async () => {
    if (selectedSchool) {
      await schoolService.setSelectedSchool(selectedSchool);
      router.replace('/map');
    }
  };

  const handleSchoolSelect = (school: School) => {
    setSelectedSchool(school.id);
    setSelectedSchoolName(`${school.name}`);
    setselectedSchoolCity(`${school.city}, ${school.state}`);
    setselectedSchoolLogoUrl(`${school.logo_url}`);
    setModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading schools...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Campus Tour</Text>
      <Text style={styles.subtitle}>Select your school to begin</Text>

      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setModalVisible(true)}
        >
        <View>
          <Text style={styles.dropdownButtonText}>
            {selectedSchoolName || "Select a school"}
          </Text>
          <Text style={styles.cityText}>
            {selectedSchoolCity || ""}
          </Text>
        </View>
        <Image source={{ uri: selectedSchoolLogoUrl }} style={styles.logo} />
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a School</Text>
            
            <ScrollView style={styles.schoolList}>
              {schools.map((school) => (
                <TouchableOpacity
                  key={school.id}
                  style={[
                    styles.schoolItem,
                    selectedSchool === school.id && styles.selectedSchoolItem
                  ]}
                  onPress={() => handleSchoolSelect(school)}
                >
                  <Text 
                    style={[
                      styles.schoolItemText,
                      selectedSchool === school.id && styles.selectedSchoolItemText
                    ]}
                  >
                    {school.name} - {school.city}, {school.state}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={[styles.button, !selectedSchool && styles.buttonDisabled]} 
        onPress={handleSelectSchool}
        disabled={!selectedSchool}
      >
        <Text style={styles.buttonText}>Start Tour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#666',
  },
  dropdownButton: {
    flexDirection: 'column',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 15,
    justifyContent: 'center',
    marginBottom: 30,
    backgroundColor: '#f8f8f8',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  cityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  logo: {
    width: 100,
    height: 100,
    position: 'absolute',
    left: 150,
    top: 400,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  schoolList: {
    width: '100%',
    marginBottom: 20,
  },
  schoolItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  selectedSchoolItem: {
    backgroundColor: '#e6f7ff',
  },
  schoolItemText: {
    fontSize: 16,
  },
  selectedSchoolItemText: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  closeButton: {
    backgroundColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#0ad2d3',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
}); 