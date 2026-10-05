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
import NotificationsScreen from './src/screens/NotificationsScreen';
import AssignJobScreen from './src/screens/AssignJobScreen';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme as NavLightTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
// Main App Screensa
import MainNavigator from './src/navigation/MainNavigator';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AppearanceSettingsScreen from './src/screens/AppearanceSettingsScreen';
import PaymentSettingsScreen from './src/screens/PaymentSettingsScreen';
import TaxSettingsScreen from './src/screens/TaxSettingsScreen';
import { Provider as PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
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
// Screen imports for individual screens that aren't in MainNavigator
import AddJobScreen    from './src/screens/AddjobScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import DummyDataSeeder from './src/screens/DummyDataSeeder';
import DashboardScreen from './src/screens/DashboardScreen';
// Invoice Screen
import InvoiceScreen   from './src/screens/InvoiceScreen';
import DailyJobsScreen from './src/screens/DailyJobScreen';
import DetailedReportScreen from './src/screens/DetailedReportScreen';
// Pump Finder sub-screens (the Finder home is a tab in MainNavigator)
import PostFinderJobScreen from './src/screens/PostFinderJobScreen';
import ReviewFinderJobScreen from './src/screens/ReviewFinderJobScreen';
import FinderBusinessProfileScreen from './src/screens/FinderBusinessProfileScreen';
import FinderPlaceholderScreen from './src/screens/FinderPlaceholderScreen';

// Pump Finder pages that are still placeholders: route name -> title + description
const FINDER_PLACEHOLDERS: { name: string; title: string; description: string }[] = [
  { name: 'AvailableJobs', title: 'Available Jobs', description: 'Matching jobs will appear here. Pumpers request work; they do not instantly claim it.' },
  { name: 'FinderJobDetail', title: 'Job Details', description: 'Review job requirements, yards, hose, PSI, timing, and the general area. The exact street address stays private until award and confirmation.' },
  { name: 'InterestedPumpers', title: 'Interested Pumpers', description: 'Compare pumpers who requested this job. The original poster chooses who receives it.' },
  { name: 'Messages', title: 'Messages', description: 'V1 keeps conversations tied to jobs, with private pumper-to-pumper messaging available for recommendations and coverage.' },
  { name: 'RecommendPumper', title: 'Recommend a Pumper', description: 'A pumper can recommend another qualified pumper, but the original poster must approve any replacement.' },
  { name: 'SelectPumper', title: 'Select Pumper', description: 'Award the job to one requester. Conflicting awarded jobs will be blocked before confirmation.' },
  { name: 'ConfirmJob', title: 'Confirm Job', description: 'The selected pumper confirms the awarded job. After confirmation, the exact job address is revealed. A pumper cannot transfer it without poster approval.' },
  { name: 'ActiveJobs', title: 'Active Jobs', description: 'Confirmed, arrived, in-progress, completion, cancellation, and replacement-request statuses will live here.' },
  { name: 'CompleteFinderJob', title: 'Complete Job', description: 'Fast closeout for actual yards, final price, payment status, and notes.' },
  { name: 'Reviews', title: 'Reviews', description: 'Completed-job participants can leave ratings and optional comments.' },
];
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

  // Show the full-screen loader only for the first auth check at startup.
  // Later saves (profile, settings) also flip isLoading; swapping the whole
  // navigator out for them would reset you back to the Home tab mid-edit.
  const finishedFirstCheck = React.useRef(false);
  if (!isLoading) finishedFirstCheck.current = true;

  if (isLoading && !finishedFirstCheck.current) {
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
              options={{ headerShown: true, title: 'My Pumper Profile' }}
            />
            {/* Settings (private) and its sub-pages */}
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings' }}
            />
            <Stack.Screen
              name="AppearanceSettings"
              component={AppearanceSettingsScreen}
              options={{ headerShown: true, title: 'Theme and appearance' }}
            />
            <Stack.Screen
              name="PaymentSettings"
              component={PaymentSettingsScreen}
              options={{ headerShown: true, title: 'Payment settings' }}
            />
            <Stack.Screen
              name="TaxSettings"
              component={TaxSettingsScreen}
              options={{ headerShown: true, title: 'Tax estimate' }}
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
              name="Notifications"
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Notifications',
                headerTitleAlign: 'center'
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

            {/* Pump Finder — full screens over the tabs, with a back button */}
            <Stack.Screen
              name="PostJob"
              component={PostFinderJobScreen}
              options={{ headerShown: true, title: 'Post a Job' }}
            />
            <Stack.Screen
              name="ReviewJob"
              component={ReviewFinderJobScreen}
              options={{ headerShown: true, title: 'Review Job' }}
            />
            <Stack.Screen
              name="BusinessProfile"
              component={FinderBusinessProfileScreen}
              options={{ headerShown: true, title: 'Edit Pumper Profile' }}
            />
            {FINDER_PLACEHOLDERS.map(p => (
              <Stack.Screen
                key={p.name}
                name={p.name}
                component={FinderPlaceholderScreen}
                initialParams={{ title: p.title, description: p.description }}
                options={{ headerShown: true, title: p.title }}
              />
            ))}

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
