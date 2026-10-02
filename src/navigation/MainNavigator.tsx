// src/navigation/MainNavigator.tsx
import InvoiceListScreen from '../screens/InvoiceListScreen';
import NotificationBell from '../components/NotificationBell';
import React, { useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Header } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions, TouchableOpacity, View } from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import { useAppTheme, makeStyles } from '../theme';

const Tab = createMaterialTopTabNavigator();

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

// Title shown in the fixed top bar for each tab
const TAB_TITLES: Record<string, string> = {
  Home: 'My Jobs',
  Weekly: 'Weekly Dashboard',
  Monthly: 'Monthly Summary',
  Yearly: 'Yearly Summary',
  Invoices: 'Invoices',
};

// The one top bar for the main tabs. It sits ABOVE the swipeable tabs, so it stays
// put while you swipe — only the title changes. Job details / Add Job open as full
// screens on top (from App.tsx) with their own back button.
function FixedTopBar({ title }: { title: string }) {
  const { colors, headerTitleStyle } = useAppTheme();
  return (
    <Header
      title={title}
      headerTitleAlign="center"
      headerStyle={{ backgroundColor: colors.header }}
      headerTintColor={colors.onHeader}
      headerTitleStyle={headerTitleStyle}
      headerRight={() => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NotificationBell />
          <ProfileButton />
        </View>
      )}
    />
  );
}

// Main tab navigation
export default function MainNavigator() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const dimensions = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('Home');
  
  return (
    <View style={styles.root}>
    <FixedTopBar title={TAB_TITLES[activeTab] ?? ''} />
    <Tab.Navigator
      screenListeners={({ route }) => ({
        focus: () => setActiveTab(route.name),
      })}
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Weekly" component={WeeklyDashboardScreen} />
      <Tab.Screen name="Monthly" component={MonthlySummaryScreen} />
      <Tab.Screen name="Yearly" component={YearlySummaryScreen} />
      <Tab.Screen name="Invoices" component={InvoiceListScreen} />
    </Tab.Navigator>
    </View>
  );
}

const useStyles = makeStyles((Colors) => ({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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