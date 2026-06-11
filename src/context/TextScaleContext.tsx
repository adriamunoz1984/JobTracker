// src/context/TextScaleContext.tsx
import React, { createContext, useState, useContext } from 'react';
import { GestureHandlerRootView, PinchGestureHandler, PinchGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { View } from 'react-native';

interface TextScaleContextType {
  textScale: number;
  setTextScale: (scale: number) => void;
}

const TextScaleContext = createContext<TextScaleContextType>({
  textScale: 1,
  setTextScale: () => {},
});

export const useTextScale = () => {
  const context = useContext(TextScaleContext);
  if (!context) {
    throw new Error('useTextScale must be used within TextScaleProvider');
  }
  return context;
};

interface TextScaleProviderProps {
  children: React.ReactNode;
}

export const TextScaleProvider: React.FC<TextScaleProviderProps> = ({ children }) => {
  const [textScale, setTextScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);

  const handlePinchGesture = (event: PinchGestureHandlerStateChangeEvent) => {
    const { scale } = event.nativeEvent;
    
    // Calculate new scale (1.0 to 1.4)
    let newScale = baseScale * scale;
    
    // Clamp between 1.0 and 1.4
    newScale = Math.max(1.0, Math.min(newScale, 1.4));
    
    setTextScale(newScale);

    // Update base scale when gesture ends
    if (event.nativeEvent.state === 5) { // GESTURE_STATE.END
      setBaseScale(newScale);
    }
  };

  return (
    <TextScaleContext.Provider value={{ textScale, setTextScale }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PinchGestureHandler onHandlerStateChange={handlePinchGesture}>
          <View style={{ flex: 1 }}>
            {children}
          </View>
        </PinchGestureHandler>
      </GestureHandlerRootView>
    </TextScaleContext.Provider>
  );
};

export default TextScaleContext;