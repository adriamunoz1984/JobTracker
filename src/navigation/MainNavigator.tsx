import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

// Existing screens
import HomeScreen from '../screens/HomeScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import AddJobScreen from '../screens/AddjobScreen';
import JobDetailScreen from '../screens/JobDetailScreen';

// New screens
import ExpensesListScreen from '../screens/ExpensesListScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import SetWeeklyGoalScreen from '../screens/SetWeeklyGoalScreen';
import PayBillsScreen from '../screens/PayBillsScreen';
import BillCalendarScreen from '../screens/BillCalendarScreen';

// Import SwipeNavigationWrapper
import SwipeNavigationWrapper from './SwipeNavigationWrapper';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Home stack includes the job list and related screens
function HomeStack() {
  return (
    <Stack.Navigator>
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

// Weekly stack includes weekly dashboard and related screens
function WeeklyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="WeeklyDashboard" 
        component={WeeklyDashboardScreen} 
        options={{ title: 'Weekly Dashboard' }} 
      />
      <Stack.Screen 
        name="WeeklySummary" 
        component={WeeklySummaryScreen} 
        options={{ title: 'Weekly Summary' }} 
      />
      <Stack.Screen 
        name="SetWeeklyGoal" 
        component={SetWeeklyGoalScreen} 
        options={{ title: 'Set Weekly Goal' }} 
      />
      <Stack.Screen 
        name="PayBills" 
        component={PayBillsScreen} 
        options={{ title: 'Pay Bills' }} 
      />
    </Stack.Navigator>
  );
}

// Expenses stack includes expense list and related screens
function ExpensesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ExpensesList" 
        component={ExpensesListScreen} 
        options={{ title: 'My Expenses' }} 
      />
      <Stack.Screen 
        name="ExpenseDetail" 
        component={ExpenseDetailScreen} 
        options={{ title: 'Expense Details' }} 
      />
      <Stack.Screen 
        name="AddExpense" 
        component={AddExpenseScreen} 
        options={{ title: 'Add Expense' }} 
      />
      <Stack.Screen 
        name="BillCalendar" 
        component={BillCalendarScreen} 
        options={{ title: 'Bill Calendar' }} 
      />
    </Stack.Navigator>
  );
}

// Swipeable summary screens with tab controls
function SummaryStack() {
  const [activeIndex, setActiveIndex] = useState(0);
  const summaryTypes = ['Weekly', 'Monthly', 'Yearly'];
  
  // Handle index change from swipe
  const handleIndexChange = (index) => {
    setActiveIndex(index);
  };
  
  // Create header with tabs
  const SummaryHeader = ({ navigation, route }) => {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>{summaryTypes[activeIndex]} Summary</Text>
        <View style={styles.tabsContainer}>
          {summaryTypes.map((type, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => setActiveIndex(index)}
              style={[
                styles.tab, 
                activeIndex === index ? styles.activeTab : null
              ]}
            >
              <Text style={[
                styles.tabText, 
                activeIndex === index ? styles.activeTabText : null
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  return (
    <Stack.Navigator screenOptions={{ header: SummaryHeader }}>
      <Stack.Screen name="SummaryScreens">
        {() => (
          <SwipeNavigationWrapper 
            initialIndex={activeIndex} 
            onIndexChange={handleIndexChange}
          >
            <WeeklySummaryScreen />
            <MonthlySummaryScreen />
            <YearlySummaryScreen />
          </SwipeNavigationWrapper>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// Main tab navigation
export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Weekly') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Summary') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'Expenses') {
            iconName = focused ? 'cash' : 'cash-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ headerShown: false }} 
      />
      <Tab.Screen 
        name="Weekly" 
        component={WeeklyStack}
        options={{ headerShown: false }} 
      />
      <Tab.Screen 
        name="Summary" 
        component={SummaryStack}
        options={{ headerShown: false }} 
      />
      <Tab.Screen 
        name="Expenses" 
        component={ExpensesStack}
        options={{ headerShown: false }} 
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#2196F3',
    paddingTop: 40,
    paddingBottom: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
});