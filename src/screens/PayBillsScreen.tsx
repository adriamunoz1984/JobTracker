import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Checkbox, Divider, Text, List, Surface } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useExpenses } from '../context/ExpensesContext';
import { format } from 'date-fns';

// Define types for the navigation and route
type RootStackParamList = {
  WeeklyDashboard: undefined;
  PayBills: { suggestions: Expense[] };
  // Add other screens as needed
};

type PayBillsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PayBills'>;
type PayBillsScreenRouteProp = RouteProp<RootStackParamList, 'PayBills'>;

// Define the Expense type
interface Expense {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  // Add other properties as needed
}

export default function PayBillsScreen() {
  const navigation = useNavigation<PayBillsScreenNavigationProp>();
  const route = useRoute<PayBillsScreenRouteProp>();
  const { updateExpense } = useExpenses();
  
  // Get suggested bills from navigation params or use empty array if not provided
  const suggestedBills: Expense[] = route.params?.suggestions || [];
  
  // State to track selected bills
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Initialize selectedBills with all suggestions selected
  useEffect(() => {
    setSelectedBills(suggestedBills.map(bill => bill.id));
  }, []);
  
  // Toggle bill selection
  const toggleBillSelection = (billId: string): void => {
    if (selectedBills.includes(billId)) {
      setSelectedBills(selectedBills.filter(id => id !== billId));
    } else {
      setSelectedBills([...selectedBills, billId]);
    }
  };
  
  // Calculate total of selected bills
  const calculateTotal = (): number => {
    return suggestedBills
      .filter(bill => selectedBills.includes(bill.id))
      .reduce((sum, bill) => sum + bill.amount, 0);
  };
  
  // Format currency for display
  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined) return '$0.00';
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };
  
  // Handle marking bills as paid
  const handlePayBills = async (): Promise<void> => {
    if (selectedBills.length === 0) {
      Alert.alert('No Bills Selected', 'Please select at least one bill to pay.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Update each selected bill as paid
      const updatePromises = selectedBills.map(billId => {
        const bill = suggestedBills.find(b => b.id === billId);
        if (!bill) return Promise.resolve();
        
        return updateExpense({
          ...bill,
          isPaid: true,
          paidDate: new Date().toISOString()
        });
      });
      
      await Promise.all(updatePromises);
      
      Alert.alert(
        'Bills Paid Successfully',
        `You've successfully paid ${selectedBills.length} bills totaling ${formatCurrency(calculateTotal())}.`,
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('WeeklyDashboard') 
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'There was a problem marking bills as paid. Please try again.');
      console.error('Error paying bills:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Cancel and go back
  const handleCancel = (): void => {
    navigation.goBack();
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>Pay Bills</Title>
          <Paragraph>Select the bills you want to pay</Paragraph>
        </Card.Content>
      </Card>
      
      {suggestedBills.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Paragraph style={styles.emptyText}>No bills available to pay</Paragraph>
            <Button 
              mode="contained" 
              style={styles.backButton}
              onPress={handleCancel}
            >
              Go Back
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card style={styles.billsCard}>
            <Card.Content>
              <Title>Suggested Bills</Title>
              <Divider style={styles.divider} />
              
              <List.Section>
                {suggestedBills.map(bill => (
                  <Surface key={bill.id} style={styles.billSurface}>
                    <List.Item
                      title={bill.name}
                      description={`Due: ${format(new Date(bill.dueDate), 'MMM d, yyyy')}`}
                      left={() => (
                        <Checkbox
                          status={selectedBills.includes(bill.id) ? 'checked' : 'unchecked'}
                          onPress={() => toggleBillSelection(bill.id)}
                        />
                      )}
                      right={() => (
                        <View style={styles.amountContainer}>
                          <Text style={styles.amount}>{formatCurrency(bill.amount)}</Text>
                        </View>
                      )}
                      onPress={() => toggleBillSelection(bill.id)}
                      style={styles.billItem}
                    />
                  </Surface>
                ))}
              </List.Section>
            </Card.Content>
          </Card>
          
          <Card style={styles.summaryCard}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Title>Total Selected</Title>
                <Title>{formatCurrency(calculateTotal())}</Title>
              </View>
              
              <View style={styles.summaryRow}>
                <Paragraph>Bills Selected</Paragraph>
                <Paragraph>{selectedBills.length} of {suggestedBills.length}</Paragraph>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="outlined" 
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  style={styles.payButton}
                  onPress={handlePayBills}
                  disabled={selectedBills.length === 0 || isProcessing}
                  loading={isProcessing}
                >
                  Pay Selected Bills
                </Button>
              </View>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  billsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyCard: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 12,
  },
  billSurface: {
    elevation: 1,
    borderRadius: 4,
    marginBottom: 8,
  },
  billItem: {
    padding: 0,
  },
  amountContainer: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  amount: {
    fontWeight: 'bold',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  payButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
  },
  backButton: {
    marginTop: 16,
  },
});