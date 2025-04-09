// src/components/SimpleEarningsToggle.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';

interface EarningsToggleProps {
  currentView: 'gross' | 'net';
  onToggle: (view: 'gross' | 'net') => void;
  label?: string;
}

/**
 * A simplified toggle component for switching between gross and net earnings views
 * that doesn't use Paper Button components
 */
const SimpleEarningsToggle: React.FC<EarningsToggleProps> = ({ 
  currentView, 
  onToggle,
  label = 'Show earnings:'
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          onPress={() => onToggle('gross')}
          style={[
            styles.button,
            currentView === 'gross' ? styles.activeButton : styles.inactiveButton
          ]}
        >
          <Text style={[
            styles.buttonText,
            currentView === 'gross' ? styles.activeButtonText : styles.inactiveButtonText
          ]}>
            Before Expenses
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => onToggle('net')}
          style={[
            styles.button,
            currentView === 'net' ? styles.activeButton : styles.inactiveButton
          ]}
        >
          <Text style={[
            styles.buttonText,
            currentView === 'net' ? styles.activeButtonText : styles.inactiveButtonText
          ]}>
            After Expenses
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#2196F3',
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: 'white',
  },
  inactiveButtonText: {
    color: '#2196F3',
  }
});

export default SimpleEarningsToggle;