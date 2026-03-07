import { IconSymbol } from '@/components/ui/IconSymbol';
import { LocationMedia, locationService, schoolService, tourGroupSelectionService } from '@/services/supabase';
import { wsManager } from '@/services/ws';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function isImageOrVideo(mediaType: string): boolean {
  const t = mediaType?.toLowerCase() || '';
  return t === 'image' || t === 'video' || t === 'primaryimage';
}

export default function LocationMediaScreen() {
  const router = useRouter();
  const { locationId, locationName } = useLocalSearchParams<{
    locationId: string;
    locationName?: string;
  }>();
  const [media, setMedia] = useState<LocationMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>('#990000');

  useEffect(() => {
    const getSchool = async () => {
      const id = await schoolService.getSelectedSchool();
      setSchoolId(id || null);
      if (id) {
        const school = await schoolService.getSchoolById(id);
        if (school?.primary_color) setPrimaryColor(school.primary_color);
      }
    };
    getSchool();
  }, []);

  useEffect(() => {
    const fetchMedia = async () => {
      if (!schoolId || !locationId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const locations = await locationService.getLocations(schoolId);
        const location = locations.find(
          (loc) => loc.id.toLowerCase() === String(locationId).toLowerCase()
        );
        if (location?.media) {
          const imageOrVideo = location.media.filter((m) =>
            isImageOrVideo(m.media_type)
          );
          setMedia(imageOrVideo);
        } else {
          setMedia([]);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching location media:', err);
        setError('Failed to load media');
        setMedia([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMedia();
  }, [schoolId, locationId]);

  const handleBack = () => router.back();

  const mediaPayload = (item: LocationMedia) => ({
    id: item.id,
    name: item.name ?? undefined,
    media_type: item.media_type,
    url: item.url,
  });

  const handleAddToDetail = async (item: LocationMedia) => {
    const tourId = await tourGroupSelectionService.getSelectedTourGroup();
    console.log("{ tourId, locationId, media: mediaPayload(item) }", { tourId, locationId, media: mediaPayload(item) });
    if (!tourId) {
      Alert.alert('No active tour', 'Start or select a tour to push media to the group.');
      return;
    }
    if (!locationId) return;
    wsManager.connect();
    if (wsManager.getStatus() !== 'open') {
      const onOpen = () => {
        wsManager.send('tour:media:add-to-detail', { tourId, locationId, media: mediaPayload(item) });
        wsManager.off('open', onOpen);
      };
      wsManager.on('open', onOpen);
    } else {
      wsManager.send('tour:media:add-to-detail', { tourId, locationId, media: mediaPayload(item) });
    }
    Alert.alert('Sent', 'Media added to the group\'s location detail.');
  };

  const handlePushToScreen = async (item: LocationMedia) => {
    const tourId = await tourGroupSelectionService.getSelectedTourGroup();
    if (!tourId) {
      Alert.alert('No active tour', 'Start or select a tour to push media to the group.');
      return;
    }
    wsManager.connect();
    if (wsManager.getStatus() !== 'open') {
      const onOpen = () => {
        wsManager.send('tour:media:push-takeover', { tourId, media: mediaPayload(item) });
        wsManager.off('open', onOpen);
      };
      wsManager.on('open', onOpen);
    } else {
      wsManager.send('tour:media:push-takeover', { tourId, media: mediaPayload(item) });
    }
    Alert.alert('Sent', 'Media pushed to the group\'s screens.');
  };

  const dynamicStyles = {
    headerBorder: { borderBottomColor: primaryColor },
    addButton: { backgroundColor: primaryColor },
    pushButton: { borderColor: primaryColor },
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Location media</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, dynamicStyles.headerBorder]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Location media</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, dynamicStyles.headerBorder]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {locationName ? `${locationName} – media` : 'Location media'}
        </Text>
      </View>

      {media.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="photo.on.rectangle.angled" size={48} color="#666" />
          <Text style={styles.emptyText}>No image or video media for this location.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {media.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.thumbnailWrap}>
                {item.media_type?.toLowerCase().includes('video') ? (
                  <View style={styles.videoPlaceholder}>
                    <IconSymbol name="play.circle.fill" size={32} color="#FFFFFF" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                )}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.mediaName} numberOfLines={2}>
                  {item.name || 'Untitled'}
                </Text>
                <Text style={styles.mediaType}>
                  {item.media_type?.toLowerCase().includes('video') ? 'Video' : 'Image'}
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.addToDetailButton, dynamicStyles.addButton]}
                    onPress={() => handleAddToDetail(item)}
                  >
                    <Text style={styles.addToDetailButtonText}>Add to detail</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pushToScreenButton, dynamicStyles.pushButton]}
                    onPress={() => handlePushToScreen(item)}
                  >
                    <Text style={styles.pushToScreenButtonText}>Push to screen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: '#3A3A3A',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumbnailWrap: {
    width: 80,
    height: 80,
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  videoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#454545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  mediaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mediaType: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  addToDetailButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addToDetailButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pushToScreenButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  pushToScreenButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
