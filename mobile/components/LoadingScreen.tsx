import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoadingScreenProps {
  message?: string;
  color?: string;
}

export default function LoadingScreen({ message, color = '#fff' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ActivityIndicator size="large" color={color} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#ccc',
  },
});
