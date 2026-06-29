import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  tourAppointmentsService,
  tourGroupSelectionService,
  schoolService,
  PreconfiguredTour,
} from '@/services/supabase';

export default function PreconfiguredTourSelectScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tours, setTours] = useState<PreconfiguredTour[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [tourAppointmentId, setTourAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        const tourId = await tourGroupSelectionService.getSelectedTourGroup();
        if (!tourId) {
          Alert.alert('Error', 'No tour selected.');
          router.back();
          return;
        }
        setTourAppointmentId(tourId);

        const schoolId = await schoolService.getSelectedSchool();
        if (!schoolId) {
          Alert.alert('Error', 'School not found.');
          router.back();
          return;
        }

        const [templates, tourDetails] = await Promise.all([
          tourAppointmentsService.getPreconfiguredTours(schoolId),
          tourAppointmentsService.getTourAppointmentById(tourId),
        ]);

        setTours(templates);
        if (tourDetails?.preconfigured_tour_id) {
          setSelectedId(tourDetails.preconfigured_tour_id);
        }
      } catch (error) {
        console.error('Error loading preconfigured tours:', error);
        Alert.alert('Error', 'Could not load tour templates.');
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (!selectedId || !tourAppointmentId) return;
    setSaving(true);
    try {
      await tourAppointmentsService.updatePreconfiguredTourId(tourAppointmentId, selectedId);
      router.push('/tour-details');
    } catch (error) {
      console.error('Error saving tour selection:', error);
      Alert.alert('Error', 'Could not save tour selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading tours...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose Tour</Text>
        <Text style={styles.subtitle}>Select a tour template for this group</Text>
      </View>

      {tours.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No tour templates are configured for this school. Ask an administrator to create one first.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {tours.map((tour) => {
            const selected = selectedId === tour.id;
            const expanded = expandedIds.has(tour.id);
            const stopCount = Array.isArray(tour.stops_json) ? tour.stops_json.length : 0;

            return (
              <View key={tour.id} style={[styles.card, selected && styles.cardSelected]}>
                <TouchableOpacity
                  onPress={() => setSelectedId(tour.id)}
                  activeOpacity={0.7}
                  style={styles.cardMain}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardName}>{tour.name}</Text>
                    <View style={styles.stopsBadge}>
                      <Text style={styles.stopsBadgeText}>{stopCount} stops</Text>
                    </View>
                  </View>
                  {tour.description ? (
                    <Text style={styles.cardDescription}>{tour.description}</Text>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => toggleExpand(tour.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandButtonText}>
                    {expanded ? '▼ Hide Stops' : '▶ View Stops'}
                  </Text>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.stopsSection}>
                    {stopCount === 0 ? (
                      <Text style={styles.noStopsText}>No stops configured.</Text>
                    ) : (
                      tour.stops_json.map((stop: any, index: number) => (
                        <View key={stop.location_id || index} style={styles.stopRow}>
                          <View style={styles.stopNumber}>
                            <Text style={styles.stopNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.stopName}>
                            {stop.name || 'Location'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, (!selectedId || saving) && styles.continueButtonDisabled]}
          disabled={!selectedId || saving}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {saving ? 'Saving...' : 'Continue'}
          </Text>
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
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 14,
    backgroundColor: '#1f2937',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#4ade80',
    backgroundColor: '#14532d',
  },
  cardMain: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  stopsBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stopsBadgeText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  expandButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  expandButtonText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600',
  },
  stopsSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  noStopsText: {
    color: '#9ca3af',
    fontSize: 13,
    fontStyle: 'italic',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  stopNumberText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
  stopName: {
    color: '#e5e7eb',
    fontSize: 14,
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  continueButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
