// src/navigation/MainNavigator.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
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

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

// Profile Button Component
const ProfileButton = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const goToProfile = () => {
    navigation.navigate('Profile');
  };
  
  return (
    <TouchableOpacity onPress={goToProfile} style={{ marginRight: 10 }}>
      {user?.photoURL ? (
        // If user has a profile photo, show it
        <Avatar.Image 
          source={{ uri: user.photoURL }} 
          size={34} 
          style={{ backgroundColor: '#2196F3' }} 
        />
      ) : (
        // Otherwise show their initials or a default icon
        user?.displayName ? (
          <Avatar.Text 
            size={34} 
            label={user.displayName.substring(0, 2).toUpperCase()} 
            style={{ backgroundColor: '#2196F3' }} 
          />
        ) : (
          <IconButton 
            icon="account-circle" 
            size={28} 
            color="#fff" 
          />
        )
      )}
    </TouchableOpacity>
  );
};

// Define common header options
const commonScreenOptions = {
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: '#2196F3',
  },
  headerTintColor: '#fff',
  headerRight: () => <ProfileButton />
};

// Home stack includes the job list and related screens
function HomeStack() {
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

// Main tab navigation
export default function MainNavigator() {
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
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#777',
        tabBarIndicatorStyle: { opacity: 0 }, // Hide the tab indicator
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
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },
  tabBar: {
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowOpacity: 0, // Remove shadow on iOS
    elevation: 0, // Remove shadow on Android
  },
  tabItem: {
    padding: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});