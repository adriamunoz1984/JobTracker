import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { TabView } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { Appbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// Import your screens directly
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import ExpensesListScreen from '../screens/ExpensesListScreen';

export default function TabViewNavigator() {
  const layout = useWindowDimensions();
  const navigation = useNavigation();

  // Define the tabs
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home' },
    { key: 'weekly', title: 'Weekly' },
    { key: 'monthly', title: 'Monthly' },
    { key: 'yearly', title: 'Yearly' },
    { key: 'expenses', title: 'Expenses' },
  ]);

  // Create scene renderers with navigation properly passed through
  const renderScene = ({ route }) => {
    // Pass the navigation object to all screens
    switch (route.key) {
      case 'home':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="My Jobs" />
            </Appbar.Header>
            <View style={styles.content}>
              <HomeScreen navigation={navigation} />
            </View>
          </View>
        );
      case 'weekly':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="Weekly Dashboard" />
            </Appbar.Header>
            <View style={styles.content}>
              <WeeklyDashboardScreen navigation={navigation} />
            </View>
          </View>
        );
      case 'monthly':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="Monthly Summary" />
            </Appbar.Header>
            <View style={styles.content}>
              <MonthlySummaryScreen navigation={navigation} />
            </View>
          </View>
        );
      case 'yearly':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="Yearly Summary" />
            </Appbar.Header>
            <View style={styles.content}>
              <YearlySummaryScreen navigation={navigation} />
            </View>
          </View>
        );
      case 'expenses':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="My Expenses" />
            </Appbar.Header>
            <View style={styles.content}>
              <ExpensesListScreen navigation={navigation} />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // Custom Tab Bar Component with only icons
  const CustomTabBar = ({ navigationState, jumpTo }) => {
    return (
      <View style={styles.tabBar}>
        {navigationState.routes.map((route, i) => {
          const isFocused = navigationState.index === i;
          const color = isFocused ? '#2196F3' : '#777';
          
          let iconName;
          switch (route.key) {
            case 'home':
              iconName = isFocused ? 'home' : 'home-outline';
              break;
            case 'weekly':
              iconName = isFocused ? 'calendar' : 'calendar-outline';
              break;
            case 'monthly':
              iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'yearly':
              iconName = isFocused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'expenses':
              iconName = isFocused ? 'cash' : 'cash-outline';
              break;
            default:
              iconName = 'circle';
          }
          
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => jumpTo(route.key)}
            >
              <Ionicons name={iconName} size={24} color={color} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={props => <CustomTabBar {...props} />}
        swipeEnabled={true}
        tabBarPosition="bottom"
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
    flexDirection: 'row',
    backgroundColor: 'white',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});