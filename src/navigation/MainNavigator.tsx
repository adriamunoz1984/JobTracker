// src/navigation/MainNavigator.tsx
import InvoiceListScreen from '../screens/InvoiceListScreen';
import NotificationBell from '../components/NotificationBell';
import DraggableFAB from '../components/DraggableFAB';
import React, { useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Header } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions, TouchableOpacity, View, Text } from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import PumpFinderScreen from '../screens/PumpFinderScreen';
import { useAppTheme, makeStyles } from '../theme';

const Tab = createMaterialTopTabNavigator();

const ProfileButton = () => {
  const { colors: Colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={{ marginRight: 10 }}>
      {user?.photoURL ? (
        <Avatar.Image source={{ uri: user.photoURL }} size={34} style={{ backgroundColor: Colors.primary }} />
      ) : user?.displayName ? (
        <Avatar.Text
          size={34}
          label={user.displayName.substring(0, 2).toUpperCase()}
          style={{ backgroundColor: Colors.primary }}
          color={Colors.onPrimary}
        />
      ) : (
        <IconButton icon="account-circle" size={28} iconColor={Colors.onHeader} />
      )}
    </TouchableOpacity>
  );
};

// Gear icon: opens private Settings (business tools, pay, theme, log out)
const SettingsButton = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  return (
    <IconButton
      icon="cog-outline"
      size={24}
      iconColor={colors.onHeader}
      onPress={() => navigation.navigate('Settings')}
      accessibilityLabel="Settings"
      style={{ margin: 0 }}
    />
  );
};

// Title shown in the fixed top bar for each tab
const TAB_TITLES: Record<string, string> = {
  Home: 'My Jobs',
  Finder: 'Pump Finder',
  Weekly: 'Weekly Dashboard',
  Monthly: 'Monthly Summary',
  Yearly: 'Yearly Summary',
  Invoices: 'Invoices',
};

// The one top bar for the main tabs. It sits ABOVE the swipeable tabs, so it stays
// put while you swipe — only the title changes. Job details, Add Job, and the
// Pump Finder sub-screens open as full screens on top (from App.tsx) with a back button.
function FixedTopBar({ title }: { title: string }) {
  const { colors, headerTitleStyle } = useAppTheme();
  return (
    <Header
      title={title}
      // Left-aligned so the title has room next to the bell, gear, and avatar
      headerTitleAlign="left"
      headerStyle={{ backgroundColor: colors.header }}
      headerTintColor={colors.onHeader}
      headerTitle={() => (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[headerTitleStyle, { color: colors.onHeader }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
      )}
      headerRight={() => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NotificationBell />
          <SettingsButton />
          <ProfileButton />
        </View>
      )}
    />
  );
}

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
        <Tab.Screen name="Finder" component={PumpFinderScreen} />
        <Tab.Screen name="Weekly" component={WeeklyDashboardScreen} />
        <Tab.Screen name="Monthly" component={MonthlySummaryScreen} />
        <Tab.Screen name="Yearly" component={YearlySummaryScreen} />
        <Tab.Screen name="Invoices" component={InvoiceListScreen} />
      </Tab.Navigator>

      <DraggableFAB
        variant={
          activeTab === 'Invoices'
            ? 'invoice'
            : activeTab === 'Finder'
              ? 'finder'
              : 'default'
        }
      />
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
