import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Define interfaces for our data types
interface Job {
  id: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  paymentMethod: 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';
  amount: number;
  date: string;
  sequenceNumber: number; // Changed to required field
  notes?: string;
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  category?: string;
  recurring?: boolean;
  recurringInterval?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
}

interface WeeklyGoal {
  id: string;
  weekStart: string;
  weekEnd: string;
  incomeTarget: number;
  actualIncome: number;
  notes?: string;
}

// Function to generate a year's worth of dummy jobs
function generateDummyJobData(startDate: Date = new Date(new Date().getFullYear(), 0, 1)): Job[] {
  const jobs: Job[] = [];
  const companyNames = [
    'Smith Construction', 'City Builders', 'Foundation Masters', 
    'Concrete Solutions', 'Metro Builders', 'Urban Development',
    'Foundation Pro', 'Quality Concrete', 'Solid Foundations',
    'Premier Builders', 'Elite Construction', 'Home Builders Inc.'
  ];
  
  const cities = [
    'Springfield', 'Riverside', 'Oakland', 'Centerville', 'Fairview',
    'Newport', 'Brighton', 'Lakeside', 'Maplewood', 'Georgetown'
  ];
  
  const streets = [
    'Main St', 'Oak Ave', 'Maple Rd', 'Washington Blvd', 'Park Ave',
    'Cedar Ln', 'Highland Dr', 'Sunset Blvd', 'River Rd', 'Forest Ave'
  ];
  
  const paymentMethods = ['Cash', 'Check', 'Zelle', 'Square', 'Charge'];
  
  // Generate a year's worth of jobs (3-5 jobs per week)
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  let currentDate = new Date(startDate);
  let jobIdCounter = 0; // Global counter for unique IDs
  
  // Track jobs by date to assign sequence numbers
  const jobsByDate: {[key: string]: number} = {};
  
  while (currentDate < endDate) {
    // Number of jobs this week (3-5)
    const jobsThisWeek = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < jobsThisWeek; i++) {
      // Random workday (Monday-Friday)
      const workday = currentDate.getDay();
      if (workday === 0 || workday === 6) {
        // If weekend, move to a weekday
        currentDate.setDate(currentDate.getDate() + (workday === 0 ? 1 : 2));
      }
      
      // Random company
      const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
      
      // Random city
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      // Random street address
      const streetNumber = Math.floor(Math.random() * 9000) + 1000;
      const street = streets[Math.floor(Math.random() * streets.length)];
      const address = `${streetNumber} ${street}`;
      
      // Random concrete yards (5-25)
      const yards = Math.floor(Math.random() * 21) + 5;
      
      // Random payment method
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)] as 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';
      
      // Random amount ($350-$500)
      const amount = Math.floor(Math.random() * 151) + 350;
      
      // Random payment status (80% chance of being paid)
      const isPaid = Math.random() < 0.8;
      
      // Create a date string key (YYYY-MM-DD format) for tracking sequence numbers
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Initialize counter for this date if not exists
      if (!jobsByDate[dateKey]) {
        jobsByDate[dateKey] = 0;
      }
      
      // Increment counter for this date
      jobsByDate[dateKey]++;
      
      // Create the job with guaranteed unique ID and sequence number
      const job: Job = {
        id: `job-${Date.now()}-${jobIdCounter++}`, // Ensure unique ID with counter
        companyName,
        address,
        city,
        yards,
        isPaid,
        paymentMethod,
        amount,
        date: new Date(currentDate).toISOString(),
        sequenceNumber: jobsByDate[dateKey], // Add sequence number
        notes: Math.random() < 0.3 ? "Special requirements noted by customer" : undefined
      };
      
      jobs.push(job);
      
      // Move to next job date (same day or next day)
      if (i < jobsThisWeek - 1) {
        const sameDay = Math.random() < 0.3;
        if (!sameDay) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
    
    // Move to next week
    currentDate.setDate(currentDate.getDate() + (7 - currentDate.getDay()));
  }
  
  return jobs;
}

// Function to generate expenses for a year
function generateDummyExpenses(startDate: Date = new Date(new Date().getFullYear(), 0, 1)): Expense[] {
  const expenses: Expense[] = [];
  
  // Common business expenses
  const expenseTemplates = [
    { name: 'Truck Payment', amount: 850, recurring: true, recurringInterval: 'monthly', category: 'Vehicle' },
    { name: 'Truck Insurance', amount: 350, recurring: true, recurringInterval: 'monthly', category: 'Insurance' },
    { name: 'General Liability Insurance', amount: 275, recurring: true, recurringInterval: 'monthly', category: 'Insurance' },
    { name: 'Equipment Maintenance', amount: 200, recurring: true, recurringInterval: 'monthly', category: 'Equipment' },
    { name: 'Fuel', amount: 600, recurring: true, recurringInterval: 'biweekly', category: 'Vehicle' },
    { name: 'Phone Bill', amount: 120, recurring: true, recurringInterval: 'monthly', category: 'Utilities' }
  ];
  
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  // Counter for unique IDs
  let expenseIdCounter = 0;
  
  // Add recurring expenses
  for (const template of expenseTemplates) {
    if (template.recurring) {
      let currentDate = new Date(startDate);
      
      while (currentDate < endDate) {
        // Add some variance to the amount (±10%)
        const variance = Math.random() * 0.2 - 0.1; // -10% to +10%
        const amount = Math.round(template.amount * (1 + variance));
        
        // Determine if it's already paid (past expenses likely paid)
        const now = new Date();
        const isPaid = currentDate < now && Math.random() < 0.9; // 90% chance past bills are paid
        
        const expense: Expense = {
          id: `expense-${Date.now()}-${expenseIdCounter++}`, // Unique ID with counter
          name: template.name,
          amount,
          dueDate: currentDate.toISOString(),
          isPaid,
          paidDate: isPaid ? new Date(currentDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          category: template.category,
          recurring: true,
          recurringInterval: template.recurringInterval as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
        };
        
        expenses.push(expense);
        
        // Advance to next occurrence
        switch (template.recurringInterval) {
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'biweekly':
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3);
            break;
          case 'yearly':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }
      }
    }
  }
  
  // Sort by due date
  expenses.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  return expenses;
}

// Function to generate weekly goals
function generateWeeklyGoals(startDate: Date, jobs: Job[]): WeeklyGoal[] {
  const weeklyGoals: WeeklyGoal[] = [];
  
  let currentDate = new Date(startDate);
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  // Counter for unique IDs
  let goalIdCounter = 0;
  
  while (currentDate < endDate) {
    // Get start and end of week
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Set to Saturday
    
    // Jobs for this week
    const weekJobs = jobs.filter(job => {
      const jobDate = new Date(job.date);
      return jobDate >= weekStart && jobDate <= weekEnd;
    });
    
    // Calculate actual income for the week
    const actualIncome = weekJobs.reduce((total, job) => total + job.amount, 0);
    
    // Set target income (based on average of actual income with some randomness)
    const targetBase = Math.max(1500, actualIncome);
    const variance = (Math.random() * 0.4) - 0.1; // -10% to +30%
    const incomeTarget = Math.round(targetBase * (1 + variance));
    
    const weeklyGoal: WeeklyGoal = {
      id: `goal-${Date.now()}-${goalIdCounter++}`, // Unique ID with counter
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      incomeTarget,
      actualIncome,
      notes: Math.random() < 0.3 ? "Plan to focus on residential jobs this week" : undefined
    };
    
    weeklyGoals.push(weeklyGoal);
    
    // Move to next week
    currentDate.setDate(currentDate.getDate() + 7);
  }
  
  return weeklyGoals;
}

// Main function to generate all dummy data
function generateDummyData(startDate: Date = new Date(new Date().getFullYear(), 0, 1)) {
  // Generate data
  const jobs = generateDummyJobData(startDate);
  const expenses = generateDummyExpenses(startDate);
  const weeklyGoals = generateWeeklyGoals(startDate, jobs);
  
  return {
    jobs,
    expenses,
    weeklyGoals
  };
}

// Component to display data seeding tools
const DummyDataSeeder: React.FC = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<{
    jobs: number;
    expenses: number;
    weeklyGoals: number;
  } | null>(null);
  
  // Function to seed the app with dummy data
  const seedDummyData = async () => {
    try {
      setIsLoading(true);
      
      // First check if there's existing data
      const existingJobs = await AsyncStorage.getItem('jobs');
      if (existingJobs && JSON.parse(existingJobs).length > 0) {
        Alert.alert(
          'Existing Data Found',
          'This will replace all existing data with dummy data. Continue?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsLoading(false) },
            { text: 'Continue', style: 'destructive', onPress: performDataSeed }
          ]
        );
      } else {
        performDataSeed();
      }
    } catch (error) {
      console.error('Error checking for existing data:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to check for existing data.');
    }
  };
  
  // Perform the actual data seeding
  const performDataSeed = async () => {
    try {
      // Set start date to beginning of current year
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1);
      
      // Generate dummy data
      const dummyData = generateDummyData(startDate);
      
      // Store the data in AsyncStorage
      await AsyncStorage.setItem('jobs', JSON.stringify(dummyData.jobs));
      await AsyncStorage.setItem('expenses', JSON.stringify(dummyData.expenses));
      await AsyncStorage.setItem('weeklyGoals', JSON.stringify(dummyData.weeklyGoals));
      
      // Update stats
      setStats({
        jobs: dummyData.jobs.length,
        expenses: dummyData.expenses.length,
        weeklyGoals: dummyData.weeklyGoals.length
      });
      
      Alert.alert(
        'Success', 
        'Dummy data has been seeded successfully! You may need to restart the app for all changes to take effect.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate to Home screen after successful seeding
              // @ts-ignore
              navigation.navigate('Home');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error seeding dummy data:', error);
      Alert.alert('Error', 'Failed to seed dummy data. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to clear all data
  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove ALL data from the app. This cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All Data', 
          style: 'destructive', 
          onPress: async () => {
            try {
              setIsLoading(true);
              await AsyncStorage.multiRemove(['jobs', 'expenses', 'weeklyGoals']);
              setStats(null);
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data. See console for details.');
            } finally {
              setIsLoading(false);
            }
          } 
        }
      ]
    );
  };
  
  // Check data counts when component mounts
  React.useEffect(() => {
    const checkDataCounts = async () => {
      try {
        const jobsData = await AsyncStorage.getItem('jobs');
        const expensesData = await AsyncStorage.getItem('expenses');
        const goalsData = await AsyncStorage.getItem('weeklyGoals');
        
        const jobs = jobsData ? JSON.parse(jobsData).length : 0;
        const expenses = expensesData ? JSON.parse(expensesData).length : 0;
        const weeklyGoals = goalsData ? JSON.parse(goalsData).length : 0;
        
        if (jobs > 0 || expenses > 0 || weeklyGoals > 0) {
          setStats({ jobs, expenses, weeklyGoals });
        }
      } catch (error) {
        console.error('Error checking data counts:', error);
      }
    };
    
    checkDataCounts();
  }, []);
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Data Seeder Utility</Title>
          <Paragraph>
            This tool will generate a year's worth of dummy data for your Job Tracker app.
            Use this for testing and demonstration purposes.
          </Paragraph>
        </Card.Content>
      </Card>
      
      {stats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Current Data</Title>
            <Divider style={styles.divider} />
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Jobs:</Text>
              <Text style={styles.statsValue}>{stats.jobs}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Expenses:</Text>
              <Text style={styles.statsValue}>{stats.expenses}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={styles.statsLabel}>Weekly Goals:</Text>
              <Text style={styles.statsValue}>{stats.weeklyGoals}</Text>
            </View>
          </Card.Content>
        </Card>
      )}
      
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title>Actions</Title>
          <Divider style={styles.divider} />
          
          <Button 
            mode="contained" 
            onPress={seedDummyData} 
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
          >
            Seed Dummy Data
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={clearAllData}
            disabled={isLoading}
            style={[styles.button, styles.dangerButton]}
          >
            Clear All Data
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title>About Dummy Data</Title>
          <Divider style={styles.divider} />
          <Paragraph>
            The generated data includes:
          </Paragraph>
          <View style={styles.bulletPoints}>
            <Text>• 3-5 jobs per week for a full year</Text>
            <Text>• Job charges ranging from $350-$500</Text>
            <Text>• Common business expenses with realistic due dates</Text>
            <Text>• Weekly income goals</Text>
            <Text>• Realistic payment methods and statuses</Text>
            <Text>• Proper sequencing for multiple jobs on the same day</Text>
          </View>
          <Paragraph style={styles.note}>
            Note: After seeding data, it's recommended to restart the app for all contexts to reload the new data properly.
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#e3f2fd',
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  divider: {
    marginVertical: 12,
  },
  button: {
    marginVertical: 8,
  },
  dangerButton: {
    borderColor: '#f44336',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statsLabel: {
    fontWeight: 'bold',
  },
  statsValue: {
    fontSize: 16,
  },
  bulletPoints: {
    marginVertical: 8,
    paddingLeft: 8,
  },
  note: {
    fontStyle: 'italic',
    marginTop: 16,
    fontSize: 12,
  },
});

export default DummyDataSeeder;