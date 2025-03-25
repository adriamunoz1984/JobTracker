import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';

// Import your screens directly
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import ExpensesListScreen from '../screens/ExpensesListScreen';

// Define the scenes
const renderScene = SceneMap({
  home: HomeScreen,
  weekly: WeeklyDashboardScreen,
  monthly: MonthlySummaryScreen,
  yearly: YearlySummaryScreen,
  expenses: ExpensesListScreen,
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

  // Custom tab bar with icons
  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#2196F3' }}
      style={{ backgroundColor: 'white' }}
      labelStyle={{ color: '#2196F3' }}
      activeColor="#2196F3"
      inactiveColor="#000"
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
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
      renderTabBar={renderTabBar}
      swipeEnabled={true} // Enable swiping between tabs
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});