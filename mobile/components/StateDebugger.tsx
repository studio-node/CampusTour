import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { appStateManager } from '@/services/appStateManager';
import { getStorageInfo } from '@/services/stateCleanup';

interface StateDebuggerProps {
  visible: boolean;
  onClose: () => void;
}

export default function StateDebugger({ visible, onClose }: StateDebuggerProps) {
  const [appState, setAppState] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [hasResumableTour, setHasResumableTour] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      loadDebugInfo();
    }
  }, [visible]);

  const loadDebugInfo = async () => {
    try {
      const currentState = appStateManager.getCurrentState();
      const resumable = await appStateManager.hasResumableTour();
      const storage = await getStorageInfo();
      
      setAppState(currentState);
      setHasResumableTour(resumable);
      setStorageInfo(storage);
    } catch (error) {
      console.error('Error loading debug info:', error);
    }
  };

  const clearAllState = async () => {
    try {
      await appStateManager.clearAllState();
      await loadDebugInfo();
    } catch (error) {
      console.error('Error clearing state:', error);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>State Debugger</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>App State</Text>
            <Text style={styles.jsonText}>
              {appState ? JSON.stringify(appState, null, 2) : 'No state'}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumable Tour</Text>
            <Text style={styles.infoText}>
              {hasResumableTour ? 'Yes' : 'No'}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage Info</Text>
            <Text style={styles.jsonText}>
              {storageInfo ? JSON.stringify(storageInfo, null, 2) : 'No info'}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.clearButton} onPress={clearAllState}>
            <Text style={styles.clearButtonText}>Clear All State</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.refreshButton} onPress={loadDebugInfo}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 5,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
  },
  clearButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
