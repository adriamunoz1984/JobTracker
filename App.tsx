import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';

import MainNavigator from './src/navigation/MainNavigator';
import { JobsProvider } from './src/context/JobsContext';
import { ExpensesProvider } from './src/context/ExpensesContext';
import { WeeklyGoalsProvider } from './src/context/WeeklyGoalsContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer>
            <JobsProvider>
              <ExpensesProvider>
                <WeeklyGoalsProvider>
                  <MainNavigator />
                  <StatusBar style="auto" />
                </WeeklyGoalsProvider>
              </ExpensesProvider>
            </JobsProvider>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}