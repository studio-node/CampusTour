import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  authService,
  tourAppointmentsService,
  tourGroupSelectionService,
  schoolService,
  PreconfiguredTour,
} from '@/services/supabase';

export default function ImpromptuTourScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<PreconfiguredTour[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [tourTitle, setTourTitle] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [ambassadorId, setAmbassadorId] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const user = await authService.getStoredUser();
        if (!user?.id) {
          Alert.alert('Sign In Required', 'Please sign in as an ambassador first.');
          router.replace('/');
          return;
        }
        setAmbassadorId(user.id);

        const selectedSchoolId = await schoolService.getSelectedSchool();
        const profileInfo = await authService.getAmbassadorProfileFields(user.id);
        const resolvedSchoolId = selectedSchoolId || profileInfo?.schoolId || null;
        if (!resolvedSchoolId) {
          Alert.alert('School Missing', 'Your ambassador profile is not linked to a school.');
          router.back();
          return;
        }

        setSchoolId(resolvedSchoolId);
        await schoolService.setSelectedSchool(resolvedSchoolId);

        const fetchedTemplates = await tourAppointmentsService.getPreconfiguredTours(resolvedSchoolId);
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error('Error loading impromptu tour setup:', error);
        Alert.alert('Error', 'Could not load preconfigured tours.');
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [router]);

  const handleCreate = async () => {
    if (!schoolId || !ambassadorId || !selectedTemplateId) {
      Alert.alert('Template Required', 'Choose a preconfigured tour before creating the impromptu session.');
      return;
    }
    setCreating(true);
    try {
      const result = await tourAppointmentsService.createImpromptuAppointment({
        schoolId,
        ambassadorId,
        preconfiguredTourId: selectedTemplateId,
        title: tourTitle.trim() || undefined,
      });

      if (!result.success || !result.appointment?.id) {
        Alert.alert('Unable To Create Tour', result.error || 'Please try again.');
        return;
      }

      await tourGroupSelectionService.setSelectedTourGroup(result.appointment.id);
      await schoolService.setSelectedSchool(schoolId);
      router.replace('/tour-details');
    } catch (error) {
      console.error('Error creating impromptu tour:', error);
      Alert.alert('Error', 'Could not create impromptu tour.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading templates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Start Impromptu Tour</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Tour Title (Optional)</Text>
        <TextInput
          value={tourTitle}
          onChangeText={setTourTitle}
          placeholder="Impromptu Campus Tour"
          placeholderTextColor="#888"
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>Choose Preconfigured Tour</Text>
        {templates.length === 0 ? (
          <Text style={styles.emptyText}>
            No active templates found for this school. Ask an administrator to create one first.
          </Text>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const selected = selectedTemplateId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.templateCard, selected && styles.templateCardSelected]}
                  onPress={() => setSelectedTemplateId(item.id)}
                >
                  <Text style={styles.templateName}>{item.name}</Text>
                  <Text style={styles.templateDescription}>
                    {item.description || 'No description'}
                  </Text>
                  <Text style={styles.templateMeta}>
                    Stops: {Array.isArray(item.stops_json) ? item.stops_json.length : 0}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!selectedTemplateId || creating || templates.length === 0) && styles.disabledButton,
          ]}
          disabled={!selectedTemplateId || creating || templates.length === 0}
          onPress={handleCreate}
        >
          <Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create Impromptu Tour'}</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  backText: {
    color: '#9ca3af',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  sectionTitle: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: '#1f2937',
  },
  emptyText: {
    color: '#9ca3af',
    marginTop: 10,
  },
  templateCard: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#1f2937',
    marginBottom: 10,
  },
  templateCardSelected: {
    borderColor: '#4ade80',
    backgroundColor: '#14532d',
  },
  templateName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  templateDescription: {
    color: '#cbd5e1',
    marginTop: 4,
  },
  templateMeta: {
    color: '#9ca3af',
    marginTop: 6,
    fontSize: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  createButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#4b5563',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
