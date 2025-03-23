import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25; // 25% of screen width

interface SwipeNavigationWrapperProps {
  children: React.ReactNode[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
}

const SwipeNavigationWrapper: React.FC<SwipeNavigationWrapperProps> = ({ 
  children, 
  initialIndex = 0,
  onIndexChange
}) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const translateX = useSharedValue(0);
  
  // Render all children but only show the active one
  const childrenArray = React.Children.toArray(children);
  
  useEffect(() => {
    // Reset translation when initialIndex changes from outside
    if (initialIndex !== activeIndex) {
      translateX.value = 0;
      setActiveIndex(initialIndex);
    }
  }, [initialIndex]);
  
  const updateIndex = (newIndex: number) => {
    setActiveIndex(newIndex);
    if (onIndexChange) {
      onIndexChange(newIndex);
    }
  };
  
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Don't allow swiping past the first or last screen
      if ((activeIndex === 0 && e.translationX > 0) || 
          (activeIndex === childrenArray.length - 1 && e.translationX < 0)) {
        translateX.value = e.translationX / 3; // Reduced effect for overscroll
      } else {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD && activeIndex < childrenArray.length - 1) {
        // Swipe left, go to next screen
        translateX.value = withTiming(-width, {}, () => {
          runOnJS(updateIndex)(activeIndex + 1);
          translateX.value = 0;
        });
      } else if (e.translationX > SWIPE_THRESHOLD && activeIndex > 0) {
        // Swipe right, go to previous screen
        translateX.value = withTiming(width, {}, () => {
          runOnJS(updateIndex)(activeIndex - 1);
          translateX.value = 0;
        });
      } else {
        // Return to current screen
        translateX.value = withTiming(0);
      }
    });
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          {childrenArray[activeIndex]}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SwipeNavigationWrapper;