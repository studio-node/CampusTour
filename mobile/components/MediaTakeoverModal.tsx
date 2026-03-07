import { IconSymbol } from '@/components/ui/IconSymbol';
import type { PushedMediaItem } from '@/contexts/PushedLocationMediaContext';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MediaTakeoverModalProps {
  visible: boolean;
  media: PushedMediaItem | null;
  onClose: () => void;
}

export default function MediaTakeoverModal({ visible, media, onClose }: MediaTakeoverModalProps) {
  const insets = useSafeAreaInsets();
  if (!media) return null;

  const isVideo = media.media_type?.toLowerCase().includes('video');

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <IconSymbol name="xmark.circle.fill" size={36} color="#FFFFFF" />
        </TouchableOpacity>
        {isVideo ? (
          <View style={styles.videoPlaceholder}>
            <IconSymbol name="play.circle.fill" size={80} color="#FFFFFF" />
            <Text style={styles.videoTitle}>{media.name || 'Video'}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: media.url }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  videoTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
});
