// src/components/DraggableFAB.tsx - Alternative implementation
import React, { useRef, useEffect } from 'react';
import { Animated, PanResponder, StyleSheet, Vibration, Dimensions } from 'react-native';
import { FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const DraggableFAB: React.FC = () => {
  const navigation = useNavigation();
  
  // Initial position at bottom center of screen
  const position = useRef(new Animated.ValueXY({
    x: width / 2 - 28,
    y: height - 120
  })).current;
  
  // Track whether we're dragging
  const isDragging = useRef(false);
  const timeoutRef = useRef(null);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        // Vibrate when touched
        Vibration.vibrate(50);
        
        // Set up for potential dragging
        position.setOffset({
          x: position.x._value,
          y: position.y._value
        });
        position.setValue({ x: 0, y: 0 });
        
        // Start timer to detect long press
        isDragging.current = false;
        timeoutRef.current = setTimeout(() => {
          // Consider it a long press
          Vibration.vibrate(50);
          isDragging.current = true;
        }, 200);
      },
      
      onPanResponderMove: (evt, gestureState) => {
        // If moved significantly, consider it dragging
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          isDragging.current = true;
        }
        
        // Update position if dragging
        if (isDragging.current) {
          Animated.event(
            [null, { dx: position.x, dy: position.y }],
            { useNativeDriver: false }
          )(evt, gestureState);
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        // Clear the timeout if still running
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // If we're not dragging, it was a tap
        if (!isDragging.current) {
          navigation.navigate('AddJob' as never);
          return;
        }
        
        // Finalize the position
        position.flattenOffset();
        
        // Keep within bounds
        const posX = position.x._value;
        const posY = position.y._value;
        
        let toX = posX;
        let toY = posY;
        
        if (posX < 0) toX = 0;
        if (posX > width - 56) toX = width - 56;
        
        if (posY < 0) toY = 0;
        if (posY > height - 56) toY = height - 56;
        
        // Snap if needed
        if (toX !== posX || toY !== posY) {
          Animated.spring(position, {
            toValue: { x: toX, y: toY },
            useNativeDriver: false,
            friction: 5
          }).start();
        }
      }
    })
  ).current;
  
  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y }
          ]
        }
      ]}
      {...panResponder.panHandlers}
    >
      <FAB
        style={styles.fab}
        icon="plus"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    zIndex: 999,
  },
  fab: {
    backgroundColor: '#2196F3',
  },
});

export default DraggableFAB;