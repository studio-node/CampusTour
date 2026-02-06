import { IconSymbol } from '@/components/ui/IconSymbol';
import { appStateManager } from '@/services/appStateManager';
import { Location, locationService, schoolService } from '@/services/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function parseCurrentTourStopIds(param: string | undefined): string[] {
  if (param == null || param === '') return [];
  try {
    const parsed = JSON.parse(param);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AddTourLocationsScreen() {
  const router = useRouter();
  const { schoolId: schoolIdParam, currentTourStopIds: currentTourStopIdsParam } =
    useLocalSearchParams<{ schoolId?: string; currentTourStopIds?: string }>();

  const schoolId = schoolIdParam ?? null;
  const currentTourStopIds = parseCurrentTourStopIds(currentTourStopIdsParam);

  const [locations, setLocations] = useState<Location[]>([]);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    if (!schoolId) {
      setError('Something went wrong. Please go back and try again.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [locationsData, schoolDetails] = await Promise.all([
        locationService.getLocations(schoolId),
        schoolService.getSchoolById(schoolId),
      ]);
      const notInTour = locationsData.filter(
        (loc) => !currentTourStopIds.includes(loc.id)
      );
      setLocations(notInTour);
      if (schoolDetails?.primary_color) {
        setPrimaryColor(schoolDetails.primary_color);
      }
    } catch (e) {
      console.error('Error loading add-tour-locations:', e);
      setError('Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, currentTourStopIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddToTour = () => {
    const selected = locations.filter((loc) => selectedIds.has(loc.id));
    if (selected.length === 0) return;
    appStateManager.setPendingLocationsToAdd(selected);
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add locations to tour</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Loading locations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add locations to tour</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCount = selectedIds.size;
  const emptyList = locations.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add locations to tour</Text>
        <View style={styles.headerSpacer} />
      </View>

      {emptyList ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            All locations are already in your tour.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.card,
                    selected && { borderColor: primaryColor, borderWidth: 2 },
                  ]}
                  onPress={() => toggleSelection(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkboxWrapper}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: primaryColor },
                        selected && {
                          backgroundColor: primaryColor,
                          borderColor: primaryColor,
                        },
                      ]}
                    >
                      {selected && (
                        <IconSymbol name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </View>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Text style={styles.cardImagePlaceholderText}>
                        Building Image
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {item.description ? (
                      <Text
                        style={styles.cardDescription}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: primaryColor },
                selectedCount === 0 && styles.addButtonDisabled,
              ]}
              onPress={handleAddToTour}
              disabled={selectedCount === 0}
            >
              <Text style={styles.addButtonText}>
                Add to tour {selectedCount > 0 ? `(${selectedCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#EE6666',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  checkboxWrapper: {
    paddingLeft: 12,
    paddingRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: 80,
    height: 80,
    backgroundColor: '#DDDDDD',
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImagePlaceholderText: {
    color: '#666',
    fontSize: 11,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#282828',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  addButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
