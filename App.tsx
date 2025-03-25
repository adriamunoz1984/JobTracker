import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, Dimensions } from 'react-native';
import { FAB } from 'react-native-paper';

import MainNavigator from './src/navigation/MainNavigator';
import { JobsProvider } from './src/context/JobsContext';
import { ExpensesProvider } from './src/context/ExpensesContext';
import { WeeklyGoalsProvider } from './src/context/WeeklyGoalsContext';

// Create a navigation reference to use for navigation actions
const navigationRef = React.createRef();

// App with centered, always-visible FAB
function AppWithFAB() {
  const handleAddPress = () => {
    // Always navigate to Home/AddJob regardless of current tab
    if (navigationRef.current) {
      navigationRef.current.navigate('Home', { screen: 'AddJob' });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <JobsProvider>
          <ExpensesProvider>
            <WeeklyGoalsProvider>
              <MainNavigator />
            </WeeklyGoalsProvider>
          </ExpensesProvider>
        </JobsProvider>
      </NavigationContainer>
      
      {/* Centered, always visible FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        color="white"
        onPress={handleAddPress}
        size="medium"
      />
      
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <AppWithFAB />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Get window dimensions
const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    // Center horizontally by positioning left at half screen width minus half button width
    // FAB is typically around 56px wide, so offset by 28px
    left: (windowWidth / 2) - 28,
    bottom: 80, // Position above the tab bar
    backgroundColor: '#2196F3',
  },
});