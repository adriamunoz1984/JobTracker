// Update App.tsx to include DraggableFAB
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';

// Import providers that still exist
import { AuthProvider } from './src/context/AuthContext';
import { JobsProvider } from './src/context/JobsContext';

// Import DraggableFAB
import DraggableFAB from './src/components/DraggableFAB';

// Import navigation
import MainNavigator from './src/navigation/MainNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <AuthProvider>
          <JobsProvider>
            <NavigationContainer>
              <View style={styles.container}>
                <MainNavigator />
                <DraggableFAB />
                <StatusBar style="auto" />
              </View>
            </NavigationContainer>
          </JobsProvider>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});