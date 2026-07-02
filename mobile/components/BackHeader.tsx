import { IconSymbol } from '@/components/ui/IconSymbol';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BackHeaderProps {
  onPress: () => void;
  label?: string;
}

export default function BackHeader({ onPress, label = 'Back' }: BackHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onPress}>
        <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
        <Text style={styles.backButtonText}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
