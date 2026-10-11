// src/components/SimpleEarningsToggle.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { makeStyles } from '../theme';

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
  const styles = useStyles();
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

const useStyles = makeStyles((Colors) => ({
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
    borderColor: Colors.primary,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: Colors.primary,
  },
  inactiveButton: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeButtonText: {
    color: Colors.onPrimary,
  },
  inactiveButtonText: {
    color: Colors.primary,
  }
}));

export default SimpleEarningsToggle;