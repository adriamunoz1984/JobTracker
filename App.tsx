// App.tsx - Updated with debugging
// Authentication Screens
import ClientManagementScreen from './src/screens/ClientManagementScreen';
import AddClientScreen from './src/screens/AddClientScreen';
import CompleteJobScreen from './src/screens/CompleteJobScreen';
import PendingJobsScreen from './src/screens/PendingJobsScreen';
import AssignJobScreen from './src/screens/AssignJobScreen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
// Main App Screensa
import MainNavigator from './src/navigation/MainNavigator';
import ProfileScreen from './src/screens/ProfileScreen';
import { Provider as PaperProvider, ActivityIndicator, Text, FAB } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { JobsProvider } from './src/context/JobsContext';
import EmployeeInviteChecker from './src/components/EmployeeInviteChecker';
import EmployeeManagementScreen from './src/screens/EmployeeManagementScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import RoleSelectionScreen from './src/screens/RoleSelectionScreen';
// Components
import DraggableFAB from './src/components/DraggableFAB';

// Screen imports for individual screens that aren't in MainNavigator
import AddJobScreen from './src/screens/AddjobScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import DummyDataSeeder from './src/screens/DummyDataSeeder';

const Stack = createStackNavigator();

// Component that handles the authentication flowa
function AuthNavigator() {
  const { user, isLoading } = useAuth();

  // Debug logging
  useEffect(() => {
    console.log('🔍 Auth state changed:');
    console.log('  - User:', user ? `${user.displayName} (${user.email})` : 'null');
    console.log('  - Loading:', isLoading);
    console.log('  - User ID:', user?.uid);
  }, [user, isLoading]);

  // Show loading screen while checking auth status
  if (isLoading) {
    console.log('📱 Showing loading screen');
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

  if (!user) {
    console.log('🔐 No user - showing login screens');
  } else {
    console.log('✅ User authenticated - showing main app');
  }

  return (
    <NavigationContainer>
      <AppNavigatorWithFAB user={user} />
    </NavigationContainer>
  );
}

// Separate component for navigation + FAB that can use useNavigation
function AppNavigatorWithFAB({ user }: { user: any }) {
  const navigation = useNavigation();

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Authentication Stack - shown when user is not logged in
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
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
              name="EmployeeManagement" 
              component={EmployeeManagementScreen}
              options={{
                headerShown: true,
                title: 'Employees',
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
                headerTitleAlign: 'center',
                presentation: 'modal'
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
              name="PendingJobs" 
              component={PendingJobsScreen}
              options={{
                headerShown: true,
                title: 'Pending Jobs',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />

            <Stack.Screen 
              name="CompleteJob" 
              component={CompleteJobScreen}
              options={{
                headerShown: true,
                title: 'Complete Job Details',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="AssignJob" 
              component={AssignJobScreen}
              options={{
                headerShown: true,
                title: 'Assign Job to Employee',
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

            <Stack.Screen 
              name="ClientManagement" 
              component={ClientManagementScreen}
              options={{
                headerShown: true,
                title: 'Clients',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />

            <Stack.Screen 
              name="AddClient" 
              component={AddClientScreen}
              options={{
                headerShown: true,
                title: 'Add/Edit Client',
                headerStyle: { backgroundColor: '#2196F3' },
                headerTintColor: '#fff',
                headerTitleAlign: 'center'
              }}
            />
          </>
        )}
      </Stack.Navigator>
      
        {/* Draggable FAB - only show when user is logged in */}
        {user && <DraggableFAB />}

      {/* Employee Invite Checker - Only for employees without an owner */}
      {user?.role === 'employee' && <EmployeeInviteChecker />}
    </>
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