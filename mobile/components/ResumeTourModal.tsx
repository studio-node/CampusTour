import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { TourProgress } from '@/services/appStateManager';

interface ResumeTourModalProps {
  visible: boolean;
  tourProgress: TourProgress | null;
  onResume: () => void;
  onStartFresh: () => void;
  primaryColor?: string;
  tourType?: 'self-guided' | 'ambassador-led' | 'ambassador' | null;
}

const { width } = Dimensions.get('window');

export default function ResumeTourModal({
  visible,
  tourProgress,
  onResume,
  onStartFresh,
  primaryColor = '#3B82F6',
  tourType = 'self-guided',
}: ResumeTourModalProps) {
  // For ambassador-led and ambassador tours, we don't need tourProgress to show the modal
  if (!tourProgress && tourType !== 'ambassador-led' && tourType !== 'ambassador') return null;

  const isAmbassadorLed = tourType === 'ambassador-led';
  const isAmbassador = tourType === 'ambassador';
  const isAmbassadorTour = isAmbassadorLed || isAmbassador;
  const progressPercentage = tourProgress && tourProgress.totalStops > 0 
    ? Math.round((tourProgress.visitedStops / tourProgress.totalStops) * 100)
    : 0;

  const formatLastActive = (lastActiveAt: string) => {
    const date = new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const dynamicStyles = {
    primaryButton: {
      backgroundColor: primaryColor,
    },
    progressBar: {
      backgroundColor: primaryColor,
    },
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <IconSymbol name="figure.walk" size={32} color={primaryColor} />
              </View>
              <Text style={styles.title}>
                {isAmbassadorTour ? 'Rejoin Tour' : 'Resume Your Tour'}
              </Text>
              <Text style={styles.subtitle}>
                {isAmbassador
                  ? 'You were leading an ambassador-led tour, would you like to rejoin?'
                  : isAmbassadorLed
                  ? 'You were in the middle of an ambassador-led tour, would you like to rejoin?'
                  : 'You have an unfinished campus tour'}
              </Text>
            </View>

            {/* Progress Section - Only show for self-guided tours */}
            {!isAmbassadorTour && tourProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Tour Progress</Text>
                  <Text style={styles.progressStats}>
                    {tourProgress.visitedStops} of {tourProgress.totalStops} stops visited
                  </Text>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      dynamicStyles.progressBar,
                      { width: `${progressPercentage}%` }
                    ]} 
                  />
                </View>
                
                <Text style={styles.progressPercentage}>
                  {progressPercentage}% Complete
                </Text>
              </View>
            )}

            {/* Last Active Info - Only show for self-guided tours */}
            {!isAmbassadorTour && tourProgress && (
              <View style={styles.lastActiveSection}>
                <IconSymbol name="clock" size={16} color="#666" />
                <Text style={styles.lastActiveText}>
                  Last active: {formatLastActive(tourProgress.lastActiveAt)}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, dynamicStyles.primaryButton]}
                onPress={onResume}
                activeOpacity={0.8}
              >
                <IconSymbol name="play.fill" size={16} color="white" style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>
                  {isAmbassadorTour ? 'Rejoin Tour' : 'Resume Tour'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onStartFresh}
                activeOpacity={0.8}
              >
                <IconSymbol name="arrow.clockwise" size={16} color="#666" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>
                  {isAmbassadorTour ? 'Not Now' : 'Start Fresh'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Help Text - Only show for self-guided tours */}
            {!isAmbassadorTour && (
              <Text style={styles.helpText}>
                Starting fresh will clear your current tour progress and begin a new tour.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  progressStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  lastActiveSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  lastActiveText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonIcon: {
    marginRight: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
