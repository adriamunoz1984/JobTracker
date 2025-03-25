// src/navigation/MainNavigator.tsx with daily expenses screens
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useWindowDimensions } from 'react-native';

// Existing screens
import HomeScreen from '../screens/HomeScreen';
import WeeklySummaryScreen from '../screens/WeeklySummaryScreen';
import MonthlySummaryScreen from '../screens/MonthlySummaryScreen';
import YearlySummaryScreen from '../screens/YearlySummaryScreen';
import AddJobScreen from '../screens/AddjobScreen';
import JobDetailScreen from '../screens/JobDetailScreen';

// Expense screens
import ExpensesListScreen from '../screens/ExpensesListScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import WeeklyDashboardScreen from '../screens/WeeklyDashBoardScreen';
import SetWeeklyGoalScreen from '../screens/SetWeeklyGoalScreen';
import PayBillsScreen from '../screens/PayBillsScreen';
import BillCalendarScreen from '../screens/BillCalendarScreen';

// New daily expense screens
import DailyExpensesScreen from '../screens/DailyExpensesScreen';
import AddDailyExpenseScreen from '../screens/AddDailyExpenseScreen';

const Tab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

// Define custom header options with centered title
const screenOptions = {
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: '#2196F3',
  },
  headerTintColor: '#fff',
}

// Home stack includes the job list and related screens
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    <Stack.Navigator screenOptions={screenOptions}>
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
      {/* Add Daily Expenses screens to Weekly stack */}
      <Stack.Screen 
        name="DailyExpenses" 
        component={DailyExpensesScreen} 
        options={{ title: 'Daily Expenses' }} 
      />
      <Stack.Screen 
        name="AddDailyExpense" 
        component={AddDailyExpenseScreen} 
        options={({ route }) => ({ 
          title: route.params?.expenseId ? 'Edit Daily Expense' : 'Add Daily Expense' 
        })} 
      />
    </Stack.Navigator>
  );
}

// Monthly screen
function MonthlyStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen 
        name="YearlySummary" 
        component={YearlySummaryScreen} 
        options={{ title: 'Yearly Summary' }} 
      />
    </Stack.Navigator>
  );
}

// Expenses stack includes expense list and related screens
function ExpensesStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
      {/* Also add Daily Expenses screens to Expenses stack */}
      <Stack.Screen 
        name="DailyExpenses" 
        component={DailyExpensesScreen} 
        options={{ title: 'Daily Expenses' }} 
      />
      <Stack.Screen 
        name="AddDailyExpense" 
        component={AddDailyExpenseScreen} 
        options={({ route }) => ({ 
          title: route.params?.expenseId ? 'Edit Daily Expense' : 'Add Daily Expense' 
        })} 
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
          } else if (route.name === 'Expenses') {
            iconName = focused ? 'cash' : 'cash-outline';
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
      <Tab.Screen name="Expenses" component={ExpensesStack} />
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