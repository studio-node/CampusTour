import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { authService, userTypeService, schoolService } from '@/services/supabase';

export default function AmbassadorSignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signInAndStore(email.trim(), password);

      if (response.error) {
        Alert.alert('Sign In Failed', response.error);
        return;
      }

      if (response.user) {
        // Check if user is an ambassador
        const userType = response.user.user_metadata?.user_type;
        if (userType !== 'ambassador') {
          Alert.alert(
            'Access Denied',
            'This account is not registered as an ambassador. Please contact your administrator.'
          );
          await authService.signOutAndClear();
          return;
        }

        // Set user type and school if available
        await userTypeService.setUserType('ambassador');
        
        const schoolId = response.user.user_metadata?.school_id;
        if (schoolId) {
          await schoolService.setSelectedSchool(schoolId);
        }

        Alert.alert(
          'Welcome!',
          `Signed in successfully as ${response.user.user_metadata?.full_name || response.user.email}`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to ambassador tours screen
                router.replace('/ambassador-tours');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Image */}
        <Image 
          style={styles.heroImage} 
          source={{ uri: "https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" }}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>Ambassador Sign In</Text>
          <Text style={styles.subtitle}>
            Sign in to your ambassador account to manage tours and guide prospective students.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#888"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#888"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.signInButton,
                loading && styles.signInButtonDisabled
              ]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#282828" size="small" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Don't have an ambassador account?
            </Text>
            <Text style={styles.helpText}>
              Contact your school's tour coordinator to get registered.
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
  },
  heroImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  form: {
    width: '100%',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  signInButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  signInButtonDisabled: {
    backgroundColor: '#ccc',
  },
  signInButtonText: {
    color: '#282828',
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
});