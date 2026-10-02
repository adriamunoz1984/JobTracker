// App.tsx - Updated with Text Scale (Pinch-to-Zoom) Support
// Authentication Screens

import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { AppThemeProvider, useAppTheme, Palette } from './src/theme';
// Header fonts for each theme
import { useFonts } from 'expo-font';
import { Nosifer_400Regular } from '@expo-google-fonts/nosifer';
import { Creepster_400Regular } from '@expo-google-fonts/creepster';
import { RubikGlitch_400Regular } from '@expo-google-fonts/rubik-glitch';
import { Butcherman_400Regular } from '@expo-google-fonts/butcherman';
import { Bangers_400Regular } from '@expo-google-fonts/bangers';
import { VT323_400Regular } from '@expo-google-fonts/vt323';
import ReportsScreen from './src/screens/ReportsScreen';
import ClientManagementScreen from './src/screens/ClientManagementScreen';
import AddClientScreen from './src/screens/AddClientScreen';
import CompleteJobScreen from './src/screens/CompleteJobScreen';
import PendingJobsScreen from './src/screens/PendingJobsScreen';
import AssignJobScreen from './src/screens/AssignJobScreen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigation, DefaultTheme as NavLightTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
// Main App Screensa
import MainNavigator from './src/navigation/MainNavigator';
import ProfileScreen from './src/screens/ProfileScreen';
import { Provider as PaperProvider, ActivityIndicator, Text, FAB } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar }              from 'expo-status-bar';
// Context Providers
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { JobsProvider }          from './src/context/JobsContext';
import { TextScaleProvider }     from './src/context/TextScaleContext';
import EmployeeInviteChecker     from './src/components/EmployeeInviteChecker';
import EmployeeManagementScreen  from './src/screens/EmployeeManagementScreen';
import LoginScreen          from './src/screens/LoginScreen';
import RegisterScreen       from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import RoleSelectionScreen  from './src/screens/RoleSelectionScreen';
// Components
import DraggableFAB    from './src/components/DraggableFAB';

// Screen imports for individual screens that aren't in MainNavigator
import AddJobScreen    from './src/screens/AddjobScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import DummyDataSeeder from './src/screens/DummyDataSeeder';
import DashboardScreen from './src/screens/DashboardScreen';
// Invoice Screen
import InvoiceScreen   from './src/screens/InvoiceScreen';
import DailyJobsScreen from './src/screens/DailyJobScreen';
import DetailedReportScreen from './src/screens/DetailedReportScreen';
const Stack = createStackNavigator();

// Component that handles the authentication flowa
function AuthNavigator() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  // Let React Navigation paint its backgrounds/cards with the camp palette too
  const navTheme = {
    ...(isDark ? NavDarkTheme : NavLightTheme),
    colors: {
      ...(isDark ? NavDarkTheme : NavLightTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.header,
      text: colors.onHeader,
      border: colors.border,
      notification: colors.primary,
    },
  };

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
        backgroundColor: colors.background
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    console.log('🔐 No user - showing login screens');
  } else {
    console.log('✅ User authenticated - showing main app');
  }

  return (
    <NavigationContainer theme={navTheme}>
      <AppNavigatorWithFAB user={user} />
    </NavigationContainer>
  );
}

// Separate component for navigation + FAB that can use useNavigation
function AppNavigatorWithFAB({ user }: { user: any }) {
  const navigation = useNavigation();
  const { colors, headerTitleStyle } = useAppTheme();

  // Every stack header uses the current theme's header colors and title font
  const headerTheme = {
    headerStyle: { backgroundColor: colors.header },
    headerTintColor: colors.onHeader,
    headerTitleAlign: 'center' as const,
    headerTitleStyle,
  };

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false, ...headerTheme }}>
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
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen 
              name="EmployeeManagement" 
              component={EmployeeManagementScreen}
              options={{
                headerShown: true,
                title: 'Employees',
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="AddJob" 
              component={AddJobScreen}
              options={{
                headerShown: true,
                title: 'Add Job',
                headerTitleAlign: 'center',
                presentation: 'modal'
              }}
            />
             <Stack.Screen 
              name="DailyJobs" 
              component={DailyJobsScreen}
              options={{ title: 'Daily Jobs' }}
            />
            <Stack.Screen 
              name="JobDetail" 
              component={JobDetailScreen}
              options={{
                headerShown: true,
                title: 'Job Details',
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="InvoiceDetail" 
              component={InvoiceDetailScreen}
              options={{
                headerShown: true,
                title: 'Invoice Details',
                headerTitleAlign: 'center' as const
              }}
            />
    
            <Stack.Screen 
              name="PendingJobs" 
              component={PendingJobsScreen}
              options={{
                headerShown: true,
                title: 'Pending Jobs',
                headerTitleAlign: 'center'
              }}
            />

            <Stack.Screen 
              name="CompleteJob" 
              component={CompleteJobScreen}
              options={{
                headerShown: true,
                title: 'Complete Job Details',
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="AssignJob" 
              component={AssignJobScreen}
              options={{
                headerShown: true,
                title: 'Assign Job to Employee',
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="DummyDataSeeder" 
              component={DummyDataSeeder}
              options={{
                headerShown: true,
                title: 'Data Seeder',
                headerTitleAlign: 'center'
              }}
            />

            <Stack.Screen 
              name="ClientManagement" 
              component={ClientManagementScreen}
              options={{
                headerShown: true,
                title: 'Clients',
                headerTitleAlign: 'center'
              }}
            />

            <Stack.Screen 
              name="AddClient" 
              component={AddClientScreen}
              options={{
                headerShown: true,
                title: 'Add/Edit Client',
                headerTitleAlign: 'center'
              }}
            />

            <Stack.Screen 
              name="Reports" 
              component={ReportsScreen}
              options={{
                headerShown: true,
                title: 'Reports & Analytics',
                headerTitleAlign: 'center'
              }}
            />
            <Stack.Screen 
              name="DetailedReport" 
              component={DetailedReportScreen}
              options={{ title: 'Report Details' }}
            />

            <Stack.Screen 
              name="Invoice" 
              component={InvoiceScreen}
              options={{
                headerShown: true,
                title: 'Create Invoice',
                headerTitleAlign: 'center' as const
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

// Build the React Native Paper theme from the current camp palette
function buildPaperTheme(colors: Palette, isDark: boolean) {
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.primaryBg,
      onPrimaryContainer: colors.text,
      secondary: colors.secondary,
      onSecondary: colors.onPrimary,
      secondaryContainer: colors.surfaceDark,
      onSecondaryContainer: colors.text,
      tertiary: colors.accent,
      error: colors.error,
      background: colors.background,
      onBackground: colors.text,
      surface: colors.surface,
      onSurface: colors.text,
      surfaceVariant: colors.surfaceDark,
      onSurfaceVariant: colors.textSecondary,
      outline: colors.borderDark,
      outlineVariant: colors.border,
      backdrop: colors.overlay,
      elevation: {
        ...base.colors.elevation,
        level0: 'transparent',
        level1: colors.surface,
        level2: colors.surface,
        level3: colors.surfaceDark,
        level4: colors.surfaceDark,
        level5: colors.surfaceDark,
      },
    },
  };
}

function ThemedApp() {
  const { colors, isDark } = useAppTheme();
  const paperTheme = React.useMemo(() => buildPaperTheme(colors, isDark), [colors, isDark]);

  return (
    <PaperProvider theme={paperTheme}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <AuthProvider>
          <JobsProvider>
            {/* Header is dark pine in both modes, so status bar text stays light */}
            <StatusBar style="light" backgroundColor={colors.header} />
            <AuthNavigator />
          </JobsProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </PaperProvider>
  );
}

// Main App Component
export default function App() {
  const [fontsLoaded] = useFonts({
    Nosifer_400Regular,
    Creepster_400Regular,
    RubikGlitch_400Regular,
    Butcherman_400Regular,
    Bangers_400Regular,
    VT323_400Regular,
  });

  // Wait for the header fonts so titles don't flash in the wrong font
  if (!fontsLoaded) {
    return null;
  }

  return (
    <TextScaleProvider>
      <AppThemeProvider>
        <ThemedApp />
      </AppThemeProvider>
    </TextScaleProvider>
  );
}
