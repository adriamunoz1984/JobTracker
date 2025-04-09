// src/components/EarningsToggle.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

interface EarningsToggleProps {
  currentView: 'gross' | 'net';
  onToggle: (view: 'gross' | 'net') => void;
  label?: string;
}

/**
 * A reusable toggle component for switching between gross and net earnings views
 */
const EarningsToggle: React.FC<EarningsToggleProps> = ({ 
  currentView, 
  onToggle,
  label = 'Show earnings:'
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.buttonGroup}>
        <Button 
          mode={currentView === 'gross' ? "contained" : "outlined"}
          onPress={() => onToggle('gross')}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
        >
          Before Expenses
        </Button>
        <Button 
          mode={currentView === 'net' ? "contained" : "outlined"}
          onPress={() => onToggle('net')}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          contentStyle={styles.buttonContent}
        >
          After Expenses
        </Button>
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
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  buttonLabel: {
    fontSize: 12,
  },
  buttonContent: {
    paddingVertical: 6,
  }
});

export default EarningsToggle;