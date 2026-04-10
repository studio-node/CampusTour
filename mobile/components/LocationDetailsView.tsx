import { IconSymbol } from '@/components/ui/IconSymbol';
import { formatInterest } from '@/constants/labels';
import { usePushedLocationMedia } from '@/contexts/PushedLocationMediaContext';
import { Location } from '@/services/supabase';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  location: Location;
  primaryColor: string;
  onDirectionsPress: () => void;
  onViewOnMapPress: () => void;
  /** Walking directions (map routing) — self-guided tours only. */
  showDirections?: boolean;
  /** Distance from bottom for the floating action buttons. */
  bottomActionsMargin?: number;
  /** Extra scroll padding so content isn't covered by the action bar. */
  scrollBottomPadding?: number;
  /** Defaults to `false`. */
  showTalkingPoints?: boolean;
  /** Defaults to `false`. */
  showPushedMedia?: boolean;
};

export function LocationDetailsView({
  location,
  primaryColor,
  onDirectionsPress,
  onViewOnMapPress,
  showDirections = true,
  bottomActionsMargin = 48,
  scrollBottomPadding = 200,
  showTalkingPoints = false,
  showPushedMedia = false,
}: Props) {
  const { getPushedMedia, showTakeover } = usePushedLocationMedia();

  const dynamicStyles = {
    viewOnMapButton: {
      backgroundColor: primaryColor,
    },
  };

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.scrollView, { marginBottom: scrollBottomPadding }]}>
        {location.image ? (
          <Image source={{ uri: location.image }} style={styles.buildingImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.buildingInfo}>
          <Text style={styles.buildingName}>{location.name}</Text>

          {showTalkingPoints && location.talking_points && location.talking_points.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Talking Points</Text>
              <View style={styles.talkingPointsList}>
                {location.talking_points.map((point, index) => (
                  <View key={index} style={styles.talkingPointItem}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.talkingPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.buildingDescription}>{location.description}</Text>

          {location.interests && location.interests.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.interestTags}>
                {location.interests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>{formatInterest(interest)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {location.careers && location.careers.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Career Opportunities</Text>
              <View style={styles.interestTags}>
                {location.careers.map((career, index) => (
                  <View key={index} style={styles.careerTag}>
                    <Text style={styles.interestTagText}>{career}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {location.features && location.features.length > 0 && (
            <View style={styles.interestsSection}>
              <Text style={styles.sectionTitle}>Features & Amenities</Text>
              <View style={styles.interestTags}>
                {location.features.map((feature, index) => (
                  <View key={index} style={styles.featureTag}>
                    <Text style={styles.interestTagText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {showPushedMedia &&
            (() => {
              const pushed = getPushedMedia(location.id);
              if (pushed.length === 0) return null;
              return (
                <View style={styles.pushedSection}>
                  <Text style={styles.sectionTitle}>Media</Text>
                  {pushed.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.pushedItem}
                      onPress={() => showTakeover(item)}
                      activeOpacity={0.7}
                    >
                      {item.media_type?.toLowerCase().includes('video') ? (
                        <View style={styles.pushedVideoPlaceholder}>
                          <IconSymbol name="play.circle.fill" size={24} color="#FFFFFF" />
                          <Text style={styles.pushedItemName}>{item.name || 'Video'}</Text>
                        </View>
                      ) : (
                        <View style={styles.pushedItemContent}>
                          <Image source={{ uri: item.url }} style={styles.pushedThumbnail} resizeMode="cover" />
                          <Text style={styles.pushedItemName} numberOfLines={1}>
                            {item.name || 'Image'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })()}
        </View>
      </ScrollView>

      <View style={[styles.mapActionsBar, { bottom: bottomActionsMargin }]}>
        {showDirections ? (
          <TouchableOpacity
            style={[styles.directionsToHereButton, dynamicStyles.viewOnMapButton]}
            onPress={onDirectionsPress}
          >
            <IconSymbol name="figure.walk" size={16} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Directions</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.viewOnMapButtonBar, styles.viewOnMapButtonSecondary]}
          onPress={onViewOnMapPress}
        >
          <IconSymbol name="map.fill" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>View on Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  buildingImage: {
    height: 200,
    width: '100%',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999999',
    fontSize: 16,
  },
  buildingInfo: {
    padding: 16,
    marginBottom: 50,
    flex: 1,
  },
  buildingName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  buildingDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  interestsSection: {
    marginBottom: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: '#454545',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#555555',
  },
  interestTagText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  careerTag: {
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  featureTag: {
    backgroundColor: '#1976D2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  talkingPointsList: {
    flex: 1,
  },
  talkingPointItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 8,
    marginTop: 2,
  },
  talkingPointText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  mapActionsBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  directionsToHereButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewOnMapButtonBar: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewOnMapButtonSecondary: {
    backgroundColor: '#555555',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  pushedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  pushedItem: {
    marginBottom: 12,
  },
  pushedItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pushedThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  pushedItemName: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  pushedVideoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#3A3A3A',
    padding: 12,
    borderRadius: 8,
  },
});

