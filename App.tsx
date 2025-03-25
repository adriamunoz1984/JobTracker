import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';

import TabViewNavigator from './src/navigation/TabViewNavigator';
import { JobsProvider } from './src/context/JobsContext';
import { ExpensesProvider } from './src/context/ExpensesContext';
import { WeeklyGoalsProvider } from './src/context/WeeklyGoalsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          <JobsProvider>
            <ExpensesProvider>
              <WeeklyGoalsProvider>
                <TabViewNavigator />
                <StatusBar style="auto" />
              </WeeklyGoalsProvider>
            </ExpensesProvider>
          </JobsProvider>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}