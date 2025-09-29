// index.tsx

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { userTypeService, UserType, schoolService, authService } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_WIDTH = 375;
const clamp = (min:number, val:number, max:number) => Math.max(min, Math.min(val, max));
const ms = (n:number, width:number, factor=0.5) => n + ((width / BASE_WIDTH) * n - n) * factor;

export default function TourTypeSelectionScreen() {
  const [selectedTourType, setSelectedTourType] = useState<UserType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      const isAuthenticated = await authService.isAuthenticated();
      const isAmbassador = await authService.isStoredUserAmbassador();
      if (isAuthenticated && isAmbassador) {
        router.replace('/ambassador-tours');
        return;
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking authentication status:', error);
      setIsLoading(false);
    }
  };

  const handleTourTypeSelect = (tourType: UserType) => {
    setSelectedTourType(tourType);
  };

  const handleContinue = async () => {
    if (selectedTourType) {
      await userTypeService.setUserType(selectedTourType);
      if (selectedTourType === 'self-guided') {
        router.push('/school-selection');
      } else {
        router.push('/school-selection');
      }
    }
  };

  const handleAmbassadorAction = () => {
    router.push('/ambassador-signin');
  };

  //  This is just here for testing purposes
  const skipToMap = async () => {
    await userTypeService.setUserType('self-guided');
    await schoolService.setSelectedSchool('e5a9dfd2-0c88-419e-b891-0a62283b8abd');
    router.push('/map');
  };

  const clearAsyncStorage = async () => {
    await AsyncStorage.clear();
    console.log('Async Storage cleared');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top','left','right']}>
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','left','right']}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + ms(8, width) }
        ]}
        keyboardShouldPersistTaps="handled"
        bounces
      >
        <View style={[styles.header]}>
          <TouchableOpacity style={[styles.ambassadorButton, { paddingVertical: ms(8, width), paddingHorizontal: ms(16, width) }]} onPress={handleAmbassadorAction}>
            <Text style={[styles.ambassadorButtonText, { fontSize: clamp(12, ms(14, width), 16) }]}>Ambassador</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.skipToMapButton, { paddingVertical: ms(8, width), paddingHorizontal: ms(16, width) }]} onPress={skipToMap}>
            <Text style={{ color: '#fff' }}>Skip to map</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.skipToMapButton, { paddingVertical: ms(8, width), paddingHorizontal: ms(16, width) }]} onPress={clearAsyncStorage}>
            <Text style={{ color: '#fff' }}>Clear Async Storage</Text>
          </TouchableOpacity>
        </View>

        <Image
          style={styles.heroImage}
          source={{ uri: "https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" }}
        />

        <View style={[styles.main, { paddingHorizontal: ms(20, width) }]}>
          <Text
            style={[
              styles.title,
              {
                fontSize: clamp(22, ms(32, width), 36),
                marginBottom: ms(24, width),
                lineHeight: clamp(26, ms(38, width), 44),
              },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Choose your tour type
          </Text>

          <View style={[styles.buttonContainer, { marginBottom: ms(24, width) }]}>
            <TouchableOpacity
              style={[
                styles.tourTypeButton,
                { padding: ms(20, width), borderRadius: ms(12, width) },
                selectedTourType === 'self-guided' && styles.selectedButton
              ]}
              onPress={() => handleTourTypeSelect('self-guided')}
            >
              <Text
                style={[
                  styles.tourTypeButtonText,
                  { fontSize: clamp(18, ms(24, width), 28), marginBottom: ms(8, width) },
                  selectedTourType === 'self-guided' && styles.selectedButtonText
                ]}
              >
                Self-Guided
              </Text>
              <Text
                style={[
                  styles.tourTypeDescription,
                  { fontSize: clamp(13, ms(16, width), 18), lineHeight: clamp(18, ms(22, width), 26) },
                  selectedTourType === 'self-guided' && styles.selectedDescriptionText
                ]}
              >
                Explore at your own pace with interactive maps and audio guides
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tourTypeButton,
                { padding: ms(20, width), borderRadius: ms(12, width) },
                selectedTourType === 'ambassador-led' && styles.selectedButton
              ]}
              onPress={() => handleTourTypeSelect('ambassador-led')}
            >
              <Text
                style={[
                  styles.tourTypeButtonText,
                  { fontSize: clamp(18, ms(24, width), 28), marginBottom: ms(8, width) },
                  selectedTourType === 'ambassador-led' && styles.selectedButtonText
                ]}
              >
                Ambassador-Led
              </Text>
              <Text
                style={[
                  styles.tourTypeDescription,
                  { fontSize: clamp(13, ms(16, width), 18), lineHeight: clamp(18, ms(22, width), 26) },
                  selectedTourType === 'ambassador-led' && styles.selectedDescriptionText
                ]}
              >
                Join a guided tour with a student ambassador
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              { paddingVertical: ms(16, width), borderRadius: ms(10, width) },
              !selectedTourType && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedTourType}
          >
            <Text
              style={[
                styles.continueButtonText,
                { fontSize: clamp(16, ms(18, width), 20) }
              ]}
            >
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  ambassadorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ambassadorButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
  },
  main: {
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },
  buttonContainer: {
    width: '100%',
  },
  tourTypeButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
  },
  tourTypeButtonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedButtonText: {
    color: '#fff',
  },
  tourTypeDescription: {
    color: '#ccc',
    textAlign: 'center',
  },
  selectedDescriptionText: {
    color: '#fff',
  },
  continueButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 50,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#666',
  },
  continueButtonText: {
    color: '#282828',
    fontWeight: 'bold',
  },
  //  This is just here for testing purposes
  skipToMapButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
  },
});
