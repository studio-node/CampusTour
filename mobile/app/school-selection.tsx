import { School, schoolService, userTypeService } from '@/services/supabase';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

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
        // Fetch all schools
        const schoolsData = await schoolService.getClosestSchools(37.67885265439308, -113.07511166100154);

        // console.log('Fetched schools:', schoolsData);
        setSchools(schoolsData);

        // Check if there's already a selected school and pre-select it
        const savedSchoolId = await schoolService.getSelectedSchool();
        if (savedSchoolId) {
          const savedSchool = schoolsData.find(school => school.id === savedSchoolId);
          if (savedSchool) {
            setSelectedSchool(savedSchool.id);
            setSelectedSchoolName(savedSchool.name);
            setselectedSchoolCity(`${savedSchool.city}, ${savedSchool.state}`);
            setselectedSchoolLogoUrl(savedSchool.logo_url || '');
          }
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
      
      // Check user type and route accordingly
      const userType = await userTypeService.getUserType();
      
      if (userType === 'ambassador-led') {
        // For ambassador-led tours, go to tour group selection
        router.push('/tour-group-selection');
      } else {
        // For self-guided users, go to lead capture
        router.push('/lead-capture');
      }
    }
  };

  function handleSchoolSelect(school: School): void {
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
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Image  style={styles.indexHero}  source={{ uri: "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" }}/>
        <Text style={styles.title}>Campus Tour</Text>
        <Text style={styles.subtitle}>Select your school to begin</Text>

        <TouchableOpacity 
          style={styles.dropdownButton} 
          onPress={() => setModalVisible(true)}
          >
          <View>
            {selectedSchoolName ? (
              <View>
                <Text style={styles.dropdownButtonText}>
                  {selectedSchoolName}
                </Text>
                <Text style={styles.cityText}>
                  {selectedSchoolCity}
                </Text>
              </View>
            ) : (
              <Text style={styles.dropdownButtonText2}>
                Select a school
              </Text>
            )}
            

          </View>
          {selectedSchoolLogoUrl && (
            <Image 
              source={{ uri: selectedSchoolLogoUrl }} 
              style={styles.logo}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
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
                      <View>
                        <Text style={styles.dropdownButtonText}>
                          {school.name}
                        </Text>
                        <Text style={styles.cityText}>
                          {school.city}, {school.state}
                        </Text>

                      </View>
                      {school.logo_url && (
                        <Image 
                          source={{ uri: school.logo_url }} 
                          style={styles.schoolLogoSmall}
                          resizeMode="contain"
                        />
                      )}
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
          </TouchableWithoutFeedback>
        </Modal>

        <TouchableOpacity 
          style={[styles.button, !selectedSchool && styles.buttonDisabled]} 
          onPress={handleSelectSchool}
          disabled={!selectedSchool}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  indexHero: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
    marginTop: -150,
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    textAlign: 'center',
    color: '#999',
  },
  dropdownButton: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 30,
    backgroundColor: '#f8f8f8',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownButtonText2: {
    fontSize: 20,
    color: '#333',
  },
  cityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  logo: {
    width: 50,
    height: 50,
    marginLeft: 10,
  },
  schoolLogoSmall: {
    width: 30,
    height: 30,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '95%',
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
    padding: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#000',
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