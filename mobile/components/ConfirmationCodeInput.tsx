import React, { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

interface ConfirmationCodeInputProps {
  onCodeComplete: (code: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function ConfirmationCodeInput({ 
  onCodeComplete, 
  onCancel, 
  error 
}: ConfirmationCodeInputProps) {
  const [value, setValue] = useState('');
  const ref = useBlurOnFulfill({ value, cellCount: 6 });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const handleCodeChange = (text: string) => {
    setValue(text.toUpperCase());
  };

  const handleCheckCode = () => {
    if (value.length === 6) {
      onCodeComplete(value);
    }
  };

  const clearCode = () => {
    setValue('');
  };

  const pasteCode = async () => {
    try {
      console.log('pasting code');
      const clipboardContent = await Clipboard.getStringAsync();
      console.log('clipboardContent', clipboardContent);
      if (clipboardContent.length === 6) {
        setValue(clipboardContent.toUpperCase());
      } else {
        Alert.alert('Invalid code', 'Please enter a valid 6-character code.');
      }
    } catch (error) {
      console.error('Error pasting code:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.instruction}>
          Tap any underline to start typing. Letters will automatically become uppercase.
        </Text>
      </View>

      <View style={styles.codeContainer}>
        <CodeField
          ref={ref}
          {...props}
          value={value}
          onChangeText={handleCodeChange}
          cellCount={6}
          rootStyle={styles.codeFieldRoot}
          keyboardType="default"
          textContentType="oneTimeCode"
          autoCapitalize="characters"
          autoCorrect={false}
          renderCell={({ index, symbol, isFocused }) => (
            <View
              key={index}
              style={[
                styles.cell,
                isFocused && styles.focusCell,
                symbol && styles.filledCell,
                error && styles.errorCell,
              ]}
              onLayout={getCellOnLayoutHandler(index)}
            >
              <Text
                style={[
                  styles.cellText,
                  isFocused && styles.focusCellText,
                  symbol && styles.filledCellText,
                  error && styles.errorCellText,
                ]}
              >
                {symbol || (isFocused ? <Cursor /> : '•')}
              </Text>
            </View>
          )}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={clearCode}>
          <Text style={styles.secondaryButtonText}>Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={pasteCode}>
          <Text style={styles.secondaryButtonText}>Paste</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.checkCodeButton,
          value.length !== 6 && styles.checkCodeButtonDisabled
        ]}
        onPress={handleCheckCode}
        disabled={value.length !== 6}
      >
        <Text style={styles.checkCodeButtonText}>Check Code</Text>
      </TouchableOpacity>

      <View style={styles.cancelContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 20,
    marginVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeFieldRoot: {
    marginTop: 20,
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  cell: {
    width: 40,
    height: 50,
    lineHeight: 50,
    fontSize: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  focusCell: {
    borderBottomColor: '#3B82F6',
    borderBottomWidth: 3,
  },
  filledCell: {
    borderBottomColor: '#3B82F6',
    borderBottomWidth: 3,
  },
  errorCell: {
    borderBottomColor: '#EF4444',
    borderBottomWidth: 3,
  },
  cellText: {
    color: '#666',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  focusCellText: {
    color: '#3B82F6',
  },
  filledCellText: {
    color: '#fff',
  },
  errorCellText: {
    color: '#EF4444',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelContainer: {
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  checkCodeButton: {
    backgroundColor: '#3B82F6',
    width: '70%',
    alignSelf: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  checkCodeButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  checkCodeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
