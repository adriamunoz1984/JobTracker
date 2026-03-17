// src/components/StyledCard.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card } from 'react-native-paper';
import { Colors, Shadows, BorderRadius, Spacing } from '../theme/colors';

interface StyledCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
}

export default function StyledCard({ children, style, variant = 'default' }: StyledCardProps) {
  const getVariantColor = () => {
    switch (variant) {
      case 'success': return Colors.successLight;
      case 'error': return Colors.errorLight;
      case 'warning': return Colors.warningLight;
      case 'info': return Colors.infoLight;
      default: return Colors.primary;
    }
  };

  return (
    <Card style={[styles.card, style]}>
      <View style={[styles.accentBar, { backgroundColor: getVariantColor() }]} />
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.surface,
    ...Shadows.medium,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: BorderRadius.large,
    borderTopRightRadius: BorderRadius.large,
  },
});