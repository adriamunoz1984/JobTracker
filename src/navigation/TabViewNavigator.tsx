import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { TabView } from 'react-native-tab-view';
import { Ionicons } from '@expo/vector-icons';
import { Appbar } from 'react-native-paper';

// Import your screens directly
import HomeScreen from '../screens/HomeScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import { useAppTheme, makeStyles } from '../theme';


export default function TabViewNavigator() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const layout = useWindowDimensions();

  // Define the tabs
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home',   title: 'Home' },
    { key: 'weekly', title: 'Weekly' },
    { key: 'monthly', title: 'Monthly' },
    { key: 'yearly', title: 'Yearly' },
  ]);

  // Screens obtain navigation from their own hooks.
  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'home':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="My Jobs" style={styles.headerContent} />
            </Appbar.Header>
            <View style={styles.content}>
              <HomeScreen />
            </View>
          </View>
        );
      case 'weekly':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="Weekly Dashboard" style={styles.headerContent} />
            </Appbar.Header>
            <View style={styles.content}>
              <WeeklyDashboardScreen />
            </View>
          </View>
        );
      case 'monthly':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="Monthly Summary" style={styles.headerContent} />
            </Appbar.Header>
            <View style={styles.content}>
              <MonthlySummaryScreen />
            </View>
          </View>
        );
      case 'yearly':
        return (
          <View style={styles.sceneContainer}>
            <Appbar.Header style={styles.header}>
              <Appbar.Content title="Yearly Summary" style={styles.headerContent} />
            </Appbar.Header>
            <View style={styles.content}>
              <YearlySummaryScreen />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // Custom Tab Bar Component with only icons
  const CustomTabBar = ({ navigationState, jumpTo }: { navigationState: { index: number; routes: { key: string; title: string }[] }; jumpTo: (key: string) => void }) => {
    return (
      <View style={styles.tabBar}>
        {navigationState.routes.map((route, i) => {
          const isFocused = navigationState.index === i;
          const color = isFocused ? Colors.primary : Colors.textLight;
          
          let iconName: React.ComponentProps<typeof Ionicons>['name'];
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
            default:
              iconName = 'ellipse';
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

const useStyles = makeStyles((Colors) => ({
  container: {
    flex: 1,
  },
  sceneContainer: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.primary,
  },
  headerContent: {
    alignItems: 'center', // Center the title text
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    height: 60,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
