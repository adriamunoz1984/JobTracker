import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationState } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';

import MainNavigator from './src/navigation/MainNavigator';
import { JobsProvider } from './src/context/JobsContext';
import { ExpensesProvider } from './src/context/ExpensesContext';
import { WeeklyGoalsProvider } from './src/context/WeeklyGoalsContext';

// Component to add the global FAB with navigation awareness
const AppWithFAB = () => {
  const [fabVisible, setFabVisible] = useState(true);
  const [fabAction, setFabAction] = useState(() => () => {});
  const [fabIcon, setFabIcon] = useState('plus');
  
  // Get navigation state to determine current screen
  const navigationState = useNavigationState(state => state);
  
  useEffect(() => {
    // Helper function to determine if we're in a specific stack
    const isInStack = (stackName) => {
      if (!navigationState || !navigationState.routes) return false;
      
      // Find the tab route first
      const tabRoute = navigationState.routes[navigationState.index];
      if (!tabRoute) return false;
      
      // Check if we're in the right tab
      return tabRoute.name === stackName;
    };
    
    // Helper to determine if we're on the root screen of a stack
    const isRootScreen = () => {
      if (!navigationState || !navigationState.routes) return false;
      
      const tabRoute = navigationState.routes[navigationState.index];
      if (!tabRoute || !tabRoute.state || !tabRoute.state.routes) return false;
      
      // Check if we're on the first screen in the stack
      return tabRoute.state.index === 0;
    };
    
    // Determine which action to take based on current tab
    if (isInStack('Home') && isRootScreen()) {
      setFabVisible(true);
      setFabIcon('plus');
      setFabAction(() => () => {
        // Navigate to AddJob screen
        const navigation = navigationRef.current;
        if (navigation) {
          navigation.navigate('Home', { screen: 'AddJob' });
        }
      });
    } 
    else if (isInStack('Weekly') && isRootScreen()) {
      setFabVisible(true);
      setFabIcon('plus');
      setFabAction(() => () => {
        // Navigate to appropriate action for Weekly
        const navigation = navigationRef.current;
        if (navigation) {
          navigation.navigate('Weekly', { screen: 'SetWeeklyGoal' });
        }
      });
    }
    else if (isInStack('Expenses') && isRootScreen()) {
      setFabVisible(true);
      setFabIcon('plus');
      setFabAction(() => () => {
        // Navigate to AddExpense screen
        const navigation = navigationRef.current;
        if (navigation) {
          navigation.navigate('Expenses', { screen: 'AddExpense' });
        }
      });
    }
    else {
      // Hide FAB on other screens
      setFabVisible(false);
    }
  }, [navigationState]);
  
  return (
    <View style={styles.container}>
      <MainNavigator />
      {fabVisible && (
        <FAB
          style={styles.fab}
          icon={fabIcon}
          onPress={fabAction}
        />
      )}
      <StatusBar style="auto" />
    </View>
  );
};

// Create a navigation reference to use for navigation actions
const navigationRef = React.createRef();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer ref={navigationRef}>
            <JobsProvider>
              <ExpensesProvider>
                <WeeklyGoalsProvider>
                  <AppWithFAB />
                </WeeklyGoalsProvider>
              </ExpensesProvider>
            </JobsProvider>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 70, // Positioned just above the tab bar
    backgroundColor: '#2196F3',
  },
});