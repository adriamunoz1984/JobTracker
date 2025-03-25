import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { BottomNavigation } from 'react-native-paper';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Import your screens directly
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import ExpensesListScreen from '../screens/ExpensesListScreen';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

export default function SwipeableTabNavigator() {
  const [index, setIndex] = useState(0);
  const translateX = useSharedValue(0);
  const prevIndexRef = useRef(0);
  
  // Define routes
  const [routes] = useState([
    { key: 'home', title: 'Home', icon: 'home' },
    { key: 'weekly', title: 'Weekly', icon: 'calendar' },
    { key: 'monthly', title: 'Monthly', icon: 'bar-chart' },
    { key: 'yearly', title: 'Yearly', icon: 'stats-chart' },
    { key: 'expenses', title: 'Expenses', icon: 'cash' },
  ]);
  
  // When index changes from tab press, reset animation
  useEffect(() => {
    if (index !== prevIndexRef.current) {
      translateX.value = 0;
      prevIndexRef.current = index;
    }
  }, [index]);
  
  // Handle swipe navigation
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Apply resistance at boundaries
      if ((index === 0 && e.translationX > 0) || 
          (index === routes.length - 1 && e.translationX < 0)) {
        translateX.value = e.translationX / 3;
      } else {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      const updateIndex = (newIndex) => {
        setIndex(newIndex);
        prevIndexRef.current = newIndex;
      };
      
      if (e.translationX < -SWIPE_THRESHOLD && index < routes.length - 1) {
        // Swipe left to next tab
        translateX.value = withTiming(-width, {}, () => {
          translateX.value = 0;
          runOnJS(updateIndex)(index + 1);
        });
      } else if (e.translationX > SWIPE_THRESHOLD && index > 0) {
        // Swipe right to previous tab
        translateX.value = withTiming(width, {}, () => {
          translateX.value = 0;
          runOnJS(updateIndex)(index - 1);
        });
      } else {
        // Return to current tab
        translateX.value = withTiming(0);
      }
    });

  // Animated style for swipe effect
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Render scene based on route
  const renderScene = ({ route, jumpTo }) => {
    switch (route.key) {
      case 'home':
        return <HomeScreen />;
      case 'weekly':
        return <WeeklyDashboardScreen />;
      case 'monthly':
        return <MonthlySummaryScreen />;
      case 'yearly':
        return <YearlySummaryScreen />;
      case 'expenses':
        return <ExpensesListScreen />;
      default:
        return null;
    }
  };

  // Custom icon renderer for BottomNavigation
  const renderIcon = ({ route, focused, color }) => {
    let iconName;

    switch (route.key) {
      case 'home':
        iconName = focused ? 'home' : 'home-outline';
        break;
      case 'weekly':
        iconName = focused ? 'calendar' : 'calendar-outline';
        break;
      case 'monthly':
        iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        break;
      case 'yearly':
        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
        break;
      case 'expenses':
        iconName = focused ? 'cash' : 'cash-outline';
        break;
      default:
        iconName = 'circle';
    }

    return <Ionicons name={iconName} size={24} color={color} />;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sceneContainer, animatedStyle]}>
          {renderScene({ route: routes[index] })}
        </Animated.View>
      </GestureDetector>
      
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        renderIcon={renderIcon}
        barStyle={styles.bottomBar}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sceneContainer: {
    flex: 1,
  },
  bottomBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});