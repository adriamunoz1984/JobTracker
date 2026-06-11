// src/components/ScaledText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTextScale } from '../context/TextScaleContext';

interface ScaledTextProps extends TextProps {
  variant?: 'displayLarge' | 'displayMedium' | 'displaySmall' | 'headlineLarge' | 'headlineMedium' | 'headlineSmall' | 'titleLarge' | 'titleMedium' | 'titleSmall' | 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'labelLarge' | 'labelMedium' | 'labelSmall';
}

// Base font sizes (following Material Design 3)
const baseSizes = {
  displayLarge: 57,
  displayMedium: 45,
  displaySmall: 36,
  headlineLarge: 32,
  headlineMedium: 28,
  headlineSmall: 24,
  titleLarge: 22,
  titleMedium: 16,
  titleSmall: 14,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  labelLarge: 14,
  labelMedium: 12,
  labelSmall: 11,
};

const ScaledText = React.forwardRef<Text, ScaledTextProps>(
  ({ style, variant, ...props }, ref) => {
    const { textScale } = useTextScale();

    // Get base size from variant or default
    const baseSize = variant ? baseSizes[variant] : 14;
    
    // Apply scale without going below 1.0x
    const scaledSize = Math.round(baseSize * textScale * 10) / 10;

    // Flatten style to get any custom fontSize
    const flatStyle = StyleSheet.flatten(style);
    const customFontSize = flatStyle?.fontSize || baseSize;

    // Apply scale to custom or default fontSize
    const finalFontSize = customFontSize * textScale;

    return (
      <Text
        ref={ref}
        {...props}
        style={[
          style,
          {
            fontSize: finalFontSize,
          },
        ]}
      />
    );
  }
);

ScaledText.displayName = 'ScaledText';

export default ScaledText;