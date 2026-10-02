// src/navigation/MainNavigator.tsx
import InvoiceListScreen from '../screens/InvoiceListScreen';
import NotificationBell from '../components/NotificationBell';
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useWindowDimensions, TouchableOpacity, View } from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import AddJobScreen from '../screens/AddjobScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import { useAppTheme, makeStyles, HeaderFont } from '../theme';

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

// Profile Button Component
const ProfileButton = () => {
  const { colors: Colors } = useAppTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const goToProfile = () => {
    navigation.navigate('Profile');
  };
  
  return (
    <TouchableOpacity onPress={goToProfile} style={{ marginRight: 10 }}>
      {user?.photoURL ? (
        <Avatar.Image 
          source={{ uri: user.photoURL }} 
          size={34} 
          style={{ backgroundColor: Colors.primary }} 
        />
      ) : (
        user?.displayName ? (
          <Avatar.Text 
            size={34} 
            label={user.displayName.substring(0, 2).toUpperCase()} 
            style={{ backgroundColor: Colors.primary }} 
          />
        ) : (
          <IconButton 
            icon="account-circle" 
            size={28} 
            iconColor={Colors.onHeader} 
          />
        )
      )}
    </TouchableOpacity>
  );
};

// Common header options — campfire header colors + Nosifer title font
function useCommonScreenOptions() {
  const { colors } = useAppTheme();
  return {
    headerTitleAlign: 'center' as const,
    headerStyle: {
      backgroundColor: colors.header,
    },
    headerTintColor: colors.onHeader,
    headerTitleStyle: { fontFamily: HeaderFont, fontSize: 15 },
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <NotificationBell />
        <ProfileButton />
      </View>
    )
  };
}

// Home stack includes the job list and related screens
function HomeStack() {
  const commonScreenOptions = useCommonScreenOptions();
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="JobsList" 
        component={HomeScreen} 
        options={{ title: 'My Jobs' }} 
      />
      <Stack.Screen 
        name="JobDetail" 
        component={JobDetailScreen} 
        options={{ title: 'Job Details' }} 
      />
      <Stack.Screen 
        name="AddJob" 
        component={AddJobScreen} 
        options={{ title: 'Add New Job' }} 
      />
    </Stack.Navigator>
  );
}

// Weekly stack
function WeeklyStack() {
  const commonScreenOptions = useCommonScreenOptions();
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="WeeklyDashboard" 
        component={WeeklyDashboardScreen} 
        options={{ title: 'Weekly Dashboard' }} 
      />
    </Stack.Navigator>
  );
}

// Monthly screen
function MonthlyStack() {
  const commonScreenOptions = useCommonScreenOptions();
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="MonthlySummary" 
        component={MonthlySummaryScreen} 
        options={{ title: 'Monthly Summary' }} 
      />
    </Stack.Navigator>
  );
}

// Yearly screen
function YearlyStack() {
  const commonScreenOptions = useCommonScreenOptions();
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="YearlySummary" 
        component={YearlySummaryScreen} 
        options={{ title: 'Yearly Summary' }} 
      />
    </Stack.Navigator>
  );
}
// Invoices stack
function InvoicesStack() {
  const commonScreenOptions = useCommonScreenOptions();
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen 
        name="InvoicesList" 
        component={InvoiceListScreen} 
        options={{ title: 'Invoices' }} 
      />
    </Stack.Navigator>
  );
}

// Main tab navigation
export default function MainNavigator() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const dimensions = useWindowDimensions();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Weekly') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Monthly') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Yearly') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Invoices') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarIndicatorStyle: { opacity: 0 },
        swipeEnabled: true,
        animationEnabled: true,
      })}
      style={styles.container}
      tabBarPosition="bottom"
      initialLayout={{ width: dimensions.width }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Weekly" component={WeeklyStack} />
      <Tab.Screen name="Monthly" component={MonthlyStack} />
      <Tab.Screen name="Yearly" component={YearlyStack} />
      <Tab.Screen name="Invoices" component={InvoicesStack} />
    </Tab.Navigator>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: {
    backgroundColor: Colors.surface,
  },
  tabBar: {
    height: 60,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabItem: {
    padding: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
}));