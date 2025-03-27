import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, useNavigationState, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { FAB } from 'react-native-paper';

// Existing navigators
import MainNavigator from './src/navigation/MainNavigator';

// Auth screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Context providers
import { JobsProvider } from './src/context/JobsContext';
import { ExpensesProvider } from './src/context/ExpensesContext';
import { WeeklyGoalsProvider } from './src/context/WeeklyGoalsContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';

const Stack = createStackNavigator();

// Define auth navigator (login, register, forgot password)
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ title: 'Create Account' }} 
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen} 
        options={{ title: 'Reset Password' }} 
      />
    </Stack.Navigator>
  );
};

// Define FabWithNavigation component inside the function to ensure it has access to navigation
function FabWithNavigation() {
  const navigation = useNavigation();
  const navigationState = useNavigationState(state => state);
  
  const [fabVisible, setFabVisible] = useState(true);
  const [fabAction, setFabAction] = useState(() => () => {});
  const [fabIcon, setFabIcon] = useState('plus');
  
  useEffect(() => {
    console.log('Current navigation state:', navigationState);
    
    // Set default behavior - show FAB that navigates to AddJob
    setFabVisible(true);
    setFabIcon('plus');
    setFabAction(() => () => {
      console.log('FAB pressed - navigating to AddJob');
      
      // Try to navigate to Home, then AddJob
      try {
        // This is the approach to navigate through nested navigators
        navigation.navigate('Main', {
          screen: 'Home',
          params: {
            screen: 'AddJob'
          }
        });
      } catch (err) {
        console.error('Navigation error:', err);
        
        // Fallback: Try direct navigation
        try {
          navigation.navigate('AddJob');
        } catch (err2) {
          console.error('Direct navigation failed:', err2);
        }
      }
    });
  }, [navigationState, navigation]);
  
  return fabVisible ? (
    <FAB
      style={styles.fab}
      icon={fabIcon}
      onPress={() => {
        console.log('FAB clicked');
        fabAction();
      }}
    />
  ) : null;
}

// Main app with auth check
const AppWithAuth = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }
  
  return (
    <NavigationContainer>
      {user ? (
        <JobsProvider>
          <ExpensesProvider>
            <WeeklyGoalsProvider>
              <View style={{ flex: 1 }}>
                <Stack.Navigator 
                  screenOptions={{
                    headerTitleAlign: 'center',
                    headerStyle: {
                      backgroundColor: '#2196F3',
                    },
                    headerTintColor: '#fff',
                  }}
                >
                  <Stack.Screen 
                    name="Main" 
                    component={MainNavigator}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen 
                    name="Profile" 
                    component={ProfileScreen} 
                    options={{ title: 'My Profile' }}
                  />
                </Stack.Navigator>
                <FabWithNavigation />
              </View>
            </WeeklyGoalsProvider>
          </ExpensesProvider>
        </JobsProvider>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};


// Main app entry point with all providers
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider>
          <AuthProvider>
            <AppWithAuth />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 70, // Positioned just above the tab bar
    backgroundColor: '#2196F3',
  },
});