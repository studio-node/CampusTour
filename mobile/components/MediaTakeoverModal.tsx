import { IconSymbol } from '@/components/ui/IconSymbol';
import type { PushedMediaItem } from '@/contexts/PushedLocationMediaContext';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef } from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MediaTakeoverModalProps {
  visible: boolean;
  media: PushedMediaItem | null;
  onClose: () => void;
}

function VideoTakeoverContent({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  const videoViewRef = useRef<VideoView>(null);

  // Enter fullscreen as soon as the video view is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      videoViewRef.current?.enterFullscreen();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <VideoView
        ref={videoViewRef}
        player={player}
        style={styles.videoView}
        contentFit="contain"
        nativeControls
        allowsFullscreen
      />
    </View>
  );
}

export default function MediaTakeoverModal({ visible, media, onClose }: MediaTakeoverModalProps) {
  const insets = useSafeAreaInsets();
  const isVideo = media?.media_type?.toLowerCase().includes('video') ?? false;

  // Allow device rotation when video is showing; restore default orientation when modal closes
  useEffect(() => {
    if (visible && isVideo) {
      ScreenOrientation.unlockAsync();
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {
          // Some devices (e.g. iPad) may not support portrait lock; ignore
        });
      };
    }
  }, [visible, isVideo]);

  if (!media) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {isVideo ? (
          <VideoTakeoverContent url={media.url} />
        ) : (
          <Image
            source={{ uri: media.url }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
        {/* Close button in a separate layer on top so it stays above video native controls */}
        <View style={[styles.closeButtonContainer, { top: insets.top + 8 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <IconSymbol name="xmark.circle.fill" size={40} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
  closeButtonContainer: {
    position: 'absolute',
    right: 16,
    left: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 9999,
    elevation: 9999,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
});
