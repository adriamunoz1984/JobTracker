// App.tsx - Updated to show login screen first
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { JobsProvider } from './src/context/JobsContext';

// Authentication Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

// Main App Screens
import MainNavigator from './src/navigation/MainNavigator';
import ProfileScreen from './src/screens/ProfileScreen';

// Screen imports for individual screens that aren't in MainNavigator
import AddJobScreen from './src/screens/AddjobScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import DummyDataSeeder from './src/screens/DummyDataSeeder';

const Stack = createStackNavigator();

// Component that handles the authentication flow
function AuthNavigator() {
  const { user, isLoading } = useAuth();

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Authentication Stack - shown when user is not logged in
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          // Main App Stack - shown when user is logged in
          <>
            {/* Main tab navigation */}
            <Stack.Screen name="MainApp" component={MainNavigator} />
            
            {/* Modal/Stack screens that overlay the main app */}
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profile',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />
            
            <Stack.Screen 
              name="AddJob" 
              component={AddJobScreen}
              options={{
                headerShown: true,
                title: 'Add Job',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />
            
            <Stack.Screen 
              name="JobDetail" 
              component={JobDetailScreen}
              options={{
                headerShown: true,
                title: 'Job Details',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />
            
            <Stack.Screen 
              name="DummyDataSeeder" 
              component={DummyDataSeeder}
              options={{
                headerShown: true,
                title: 'Data Seeder',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <AuthProvider>
          <JobsProvider>
            <StatusBar style="light" />
            <AuthNavigator />
          </JobsProvider>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}