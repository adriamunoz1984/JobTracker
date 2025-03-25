import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Text } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { Appbar } from 'react-native-paper';

// Import your screens directly
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import ExpensesListScreen from '../screens/ExpensesListScreen';

// Create scene wrappers with headers
const HomeScene = () => (
  <View style={styles.sceneContainer}>
    <Appbar.Header style={styles.header}>
      <Appbar.Content title="My Jobs" />
    </Appbar.Header>
    <View style={styles.content}>
      <HomeScreen />
    </View>
  </View>
);

const WeeklyScene = () => (
  <View style={styles.sceneContainer}>
    <Appbar.Header style={styles.header}>
      <Appbar.Content title="Weekly Dashboard" />
    </Appbar.Header>
    <View style={styles.content}>
      <WeeklyDashboardScreen />
    </View>
  </View>
);

const MonthlyScene = () => (
  <View style={styles.sceneContainer}>
    <Appbar.Header style={styles.header}>
      <Appbar.Content title="Monthly Summary" />
    </Appbar.Header>
    <View style={styles.content}>
      <MonthlySummaryScreen />
    </View>
  </View>
);

const YearlyScene = () => (
  <View style={styles.sceneContainer}>
    <Appbar.Header style={styles.header}>
      <Appbar.Content title="Yearly Summary" />
    </Appbar.Header>
    <View style={styles.content}>
      <YearlySummaryScreen />
    </View>
  </View>
);

const ExpensesScene = () => (
  <View style={styles.sceneContainer}>
    <Appbar.Header style={styles.header}>
      <Appbar.Content title="My Expenses" />
    </Appbar.Header>
    <View style={styles.content}>
      <ExpensesListScreen />
    </View>
  </View>
);

// Define the scenes with headers
const renderScene = SceneMap({
  home: HomeScene,
  weekly: WeeklyScene,
  monthly: MonthlyScene,
  yearly: YearlyScene,
  expenses: ExpensesScene,
});

export default function TabViewNavigator() {
  const layout = useWindowDimensions();

  // Define the tabs
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home', icon: 'home' },
    { key: 'weekly', title: 'Weekly', icon: 'calendar' },
    { key: 'monthly', title: 'Monthly', icon: 'bar-chart' },
    { key: 'yearly', title: 'Yearly', icon: 'stats-chart' },
    { key: 'expenses', title: 'Expenses', icon: 'cash' },
  ]);

  // Custom tab bar with icons at the bottom
  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#2196F3' }}
      style={styles.tabBar}
      labelStyle={{ color: '#2196F3' }}
      activeColor="#2196F3"
      inactiveColor="#777"
      renderIcon={({ route, focused, color }) => {
        let iconName;
        
        switch (route.key) {
          case 'home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'weekly':
            iconName = focused ? 'calendar' : 'calendar-outline';
            break;
          case 'monthly':
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            break;
          case 'yearly':
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            break;
          case 'expenses':
            iconName = focused ? 'cash' : 'cash-outline';
            break;
          default:
            iconName = 'circle';
        }

        return <Ionicons name={iconName} size={24} color={color} />;
      }}
      renderLabel={({ route, focused, color }) => null} // Hide the labels, only show icons
    />
  );

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
        swipeEnabled={true} // Enable swiping between tabs
        tabBarPosition="bottom" // Position the tab bar at the bottom
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sceneContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2196F3',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: 'white',
    height: 60,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});