import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

interface TagPillListProps {
  labels: string[];
  tagStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TagPillList({ labels, tagStyle, textStyle, containerStyle }: TagPillListProps) {
  return (
    <View style={[styles.row, containerStyle]}>
      {labels.map((label, index) => (
        <View key={index} style={[styles.tag, tagStyle]}>
          <Text style={[styles.tagText, textStyle]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
  },
});
