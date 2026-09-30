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

import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import AddJobScreen from '../screens/AddjobScreen';
import JobDetailScreen from '../screens/JobDetailScreen';
import PumpFinderScreen from '../screens/PumpFinderScreen';
import PostFinderJobScreen from '../screens/PostFinderJobScreen';
import FinderPlaceholderScreen from '../screens/FinderPlaceholderScreen';
import ReviewFinderJobScreen from '../screens/ReviewFinderJobScreen';
import FinderBusinessProfileScreen from '../screens/FinderBusinessProfileScreen';

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

const ProfileButton = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginRight: 10 }}>
      {user?.photoURL ? (
        <Avatar.Image source={{ uri: user.photoURL }} size={34} style={{ backgroundColor: '#2196F3' }} />
      ) : user?.displayName ? (
        <Avatar.Text size={34} label={user.displayName.substring(0, 2).toUpperCase()} style={{ backgroundColor: '#2196F3' }} />
      ) : (
        <IconButton icon="account-circle" size={28} color="#fff" />
      )}
    </TouchableOpacity>
  );
};

const commonScreenOptions = {
  headerTitleAlign: 'center' as const,
  headerStyle: { backgroundColor: '#2196F3' },
  headerTintColor: '#fff',
  headerRight: () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <NotificationBell />
      <ProfileButton />
    </View>
  ),
};

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen name="JobsList" component={HomeScreen} options={{ title: 'My Jobs' }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: 'Job Details' }} />
      <Stack.Screen name="AddJob" component={AddJobScreen} options={{ title: 'Add New Job' }} />
    </Stack.Navigator>
  );
}

function FinderStack() {
  return (
    <Stack.Navigator screenOptions={commonScreenOptions}>
      <Stack.Screen name="FinderHome" component={PumpFinderScreen} options={{ title: 'Pump Finder' }} />
      <Stack.Screen name="PostJob" component={PostFinderJobScreen} options={{ title: 'Post a Job' }} />
      <Stack.Screen name="AvailableJobs" component={FinderPlaceholderScreen} initialParams={{ title: 'Available Jobs', description: 'Matching jobs will appear here. Pumpers request work; they do not instantly claim it.' }} />
      <Stack.Screen name="FinderJobDetail" component={FinderPlaceholderScreen} initialParams={{ title: 'Job Details', description: 'Review Finder job requirements, location, yards, hose, PSI, and timing.' }} />
      <Stack.Screen name="ReviewJob" component={ReviewFinderJobScreen} options={{ title: 'Review Job' }} />
      <Stack.Screen name="InterestedPumpers" component={FinderPlaceholderScreen} initialParams={{ title: 'Interested Pumpers', description: 'Compare pumpers who requested this job. The original poster chooses who receives it.' }} />
      <Stack.Screen name="BusinessProfile" component={FinderBusinessProfileScreen} options={{ title: 'Business Profile' }} />
      <Stack.Screen name="SelectPumper" component={FinderPlaceholderScreen} initialParams={{ title: 'Select Pumper', description: 'Award the job to one requester. Conflicting awarded jobs will be blocked before confirmation.' }} />
      <Stack.Screen name="ConfirmJob" component={FinderPlaceholderScreen} initialParams={{ title: 'Confirm Job', description: 'The selected pumper confirms the awarded job. A pumper cannot transfer it without poster approval.' }} />
      <Stack.Screen name="ActiveJobs" component={FinderPlaceholderScreen} initialParams={{ title: 'Active Jobs', description: 'Confirmed, arrived, in-progress, completion, cancellation, and replacement-request statuses will live here.' }} />
      <Stack.Screen name="CompleteFinderJob" component={FinderPlaceholderScreen} initialParams={{ title: 'Complete Job', description: 'Fast closeout for actual yards, final price, payment status, and notes.' }} />
      <Stack.Screen name="Reviews" component={FinderPlaceholderScreen} initialParams={{ title: 'Reviews', description: 'Completed-job participants can leave ratings and optional comments.' }} />
    </Stack.Navigator>
  );
}

function WeeklyStack() {
  return <Stack.Navigator screenOptions={commonScreenOptions}><Stack.Screen name="WeeklyDashboard" component={WeeklyDashboardScreen} options={{ title: 'Weekly Dashboard' }} /></Stack.Navigator>;
}

function MonthlyStack() {
  return <Stack.Navigator screenOptions={commonScreenOptions}><Stack.Screen name="MonthlySummary" component={MonthlySummaryScreen} options={{ title: 'Monthly Summary' }} /></Stack.Navigator>;
}

function YearlyStack() {
  return <Stack.Navigator screenOptions={commonScreenOptions}><Stack.Screen name="YearlySummary" component={YearlySummaryScreen} options={{ title: 'Yearly Summary' }} /></Stack.Navigator>;
}

function InvoicesStack() {
  return <Stack.Navigator screenOptions={commonScreenOptions}><Stack.Screen name="InvoicesList" component={InvoiceListScreen} options={{ title: 'Invoices' }} /></Stack.Navigator>;
}

export default function MainNavigator() {
  const dimensions = useWindowDimensions();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: any = 'ellipse-outline';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Finder') iconName = focused ? 'locate' : 'locate-outline';
          else if (route.name === 'Weekly') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Monthly') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Yearly') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Invoices') iconName = focused ? 'receipt' : 'receipt-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#777',
        tabBarIndicatorStyle: { opacity: 0 },
        swipeEnabled: true,
        animationEnabled: true,
      })}
      style={styles.container}
      tabBarPosition="bottom"
      initialLayout={{ width: dimensions.width }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Finder" component={FinderStack} />
      <Tab.Screen name="Weekly" component={WeeklyStack} />
      <Tab.Screen name="Monthly" component={MonthlyStack} />
      <Tab.Screen name="Yearly" component={YearlyStack} />
      <Tab.Screen name="Invoices" component={InvoicesStack} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'white' },
  tabBar: {
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowOpacity: 0,
    elevation: 0,
  },
  tabItem: {
    padding: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
