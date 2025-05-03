import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Card, Title, Paragraph, Button, Divider, Chip, IconButton, TextInput, List, FAB, Dialog, Portal, Modal } from 'react-native-paper';
import { format } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job, JobExpense, JobExpenseCategory } from '../types';

type RouteParams = {
  jobId: string;
};

// Form for adding a job expense
const AddJobExpenseForm = ({ 
  visible, 
  onDismiss, 
  onSubmit, 
  jobDate 
}: { 
  visible: boolean; 
  onDismiss: () => void; 
  onSubmit: (expense: Omit<JobExpense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  jobDate: string;
}) => {
  const [category, setCategory] = useState<JobExpenseCategory>('Fuel');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  const resetForm = () => {
    setCategory('Fuel');
    setDescription('');
    setAmount('');
  };
  
  const handleSubmit = () => {
    if (!description.trim() || !amount || isNaN(parseFloat(amount))) {
      Alert.alert('Please fill all fields', 'Description and amount are required');
      return;
    }
    
    onSubmit({
      category,
      description: description.trim(),
      amount: parseFloat(amount),
      date: jobDate,
    });
    
    resetForm();
    onDismiss();
  };
  
  // Category selection chips
  const categories: JobExpenseCategory[] = ['Fuel', 'Food', 'Materials', 'Equipment', 'Labor', 'Repairs', 'Other'];
  
  return (
    <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
      <Card style={styles.modalCard}>
        <Card.Title title="Add Job Expense" />
        <Card.Content>
          <ScrollView style={styles.categoryScrollView} horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                selected={category === cat}
                onPress={() => setCategory(cat)}
                style={styles.categoryChip}
                selectedColor="#2196F3"
              >
                {cat}
              </Chip>
            ))}
          </ScrollView>
          
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Amount ($)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.modalActions}>
            <Button onPress={onDismiss} style={styles.modalButton}>Cancel</Button>
            <Button mode="contained" onPress={navigation.navigate('AddExpense', { mode: 'job', jobId: job.id })} style={styles.modalButton}>Add Expense</Button>
            
          </View>
        </Card.Content>
      </Card>
    </Modal>
  );
};

export default function JobDetailScreen() {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation();
  const { getJobById, updateJob, deleteJob } = useJobs();
  const { user } = useAuth();
  
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const { jobId } = route.params || {};
  
  // For billing details form
  const [isEditing, setIsEditing] = useState(false);
  
  // State for billing details
  const [billingDetails, setBillingDetails] = useState({
    invoiceNumber: '',
    billingDate: '',
    dueDate: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (jobId) {
      const jobData = getJobById(jobId);
      setJob(jobData);
      
      // Initialize billing details if they exist
      if (jobData?.billingDetails) {
        setBillingDetails(jobData.billingDetails);
      }
    }
  }, [jobId, getJobById]);

  const handleEdit = () => {
    if (job) {
      navigation.navigate('AddJob' as never, { job } as never);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (job) {
              await deleteJob(job.id);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const togglePaymentStatus = async () => {
    if (job) {
      const updatedJob = { ...job, isPaid: !job.isPaid };
      await updateJob(updatedJob);
      setJob(updatedJob);
    }
  };
  
  // Handle saving billing details
  const saveBillingDetails = async () => {
    if (job) {
      const updatedJob = {
        ...job,
        billingDetails: billingDetails
      };
      
      await updateJob(updatedJob);
      setJob(updatedJob);
      setIsEditing(false);
      Alert.alert('Success', 'Billing details have been saved');
    }
  };
  
  // Handle adding job expense
  const handleAddExpense = (expenseData: Omit<JobExpense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!job) return;
    
    const now = new Date().toISOString();
    const newExpense: JobExpense = {
      ...expenseData,
      id: `expense-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
    };
    
    const updatedExpenses = [...(job.expenses || []), newExpense];
    const updatedJob = { ...job, expenses: updatedExpenses };
    
    updateJob(updatedJob)
      .then(() => {
        setJob(updatedJob);
        Alert.alert('Expense Added', 'The expense has been added to this job');
      })
      .catch(error => {
        console.error('Error adding expense:', error);
        Alert.alert('Error', 'Failed to add expense. Please try again.');
      });
  };
  
  // Handle deleting job expense
  const handleDeleteExpense = (expenseId: string) => {
    if (!job || !job.expenses) return;
    
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedExpenses = job.expenses.filter(exp => exp.id !== expenseId);
            const updatedJob = { ...job, expenses: updatedExpenses };
            
            try {
              await updateJob(updatedJob);
              setJob(updatedJob);
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };

  // Calculate total expenses
  const calculateTotalExpenses = (): number => {
    if (!job || !job.expenses || job.expenses.length === 0) return 0;
    return job.expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  if (!job) {
    return (
      <View style={styles.centered}>
        <Paragraph>Job not found</Paragraph>
      </View>
    );
  }

  const formattedDate = format(new Date(job.date), 'MMMM dd, yyyy');
  const formattedAmount = job.amount !== undefined 
    ? job.amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    : '$0.00';
  
  const totalExpenses = calculateTotalExpenses();
  const netProfit = job.amount - totalExpenses;
  
  // Group expenses by category for display
  const expensesByCategory: Record<string, JobExpense[]> = {};
  
  if (job.expenses) {
    job.expenses.forEach(expense => {
      if (!expensesByCategory[expense.category]) {
        expensesByCategory[expense.category] = [];
      }
      expensesByCategory[expense.category].push(expense);
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Title style={styles.title}>{job.companyName || 'Unnamed Job'}</Title>
              <Chip
                mode="outlined"
                textStyle={{ fontWeight: 'bold' }}
                style={job.isPaid ? styles.paidChip : styles.unpaidChip}
              >
                {job.isPaid ? 'PAID' : 'UNPAID'}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <Paragraph style={styles.label}>Date:</Paragraph>
              <Paragraph>{formattedDate}</Paragraph>
            </View>

            <View style={styles.detailRow}>
              <Paragraph style={styles.label}>Address:</Paragraph>
              <Paragraph>{`${job.address}, ${job.city}`}</Paragraph>
            </View>

            <View style={styles.detailRow}>
              <Paragraph style={styles.label}>Concrete:</Paragraph>
              <Paragraph>{`${job.yards} yards`}</Paragraph>
            </View>

            <View style={styles.detailRow}>
              <Paragraph style={styles.label}>Amount:</Paragraph>
              <Paragraph style={styles.amount}>{formattedAmount}</Paragraph>
            </View>

            <View style={styles.detailRow}>
              <Paragraph style={styles.label}>Payment Method:</Paragraph>
              <Paragraph>{job.paymentMethod}</Paragraph>
            </View>

            {job.paymentMethod === 'Check' && job.checkNumber && (
              <View style={styles.detailRow}>
                <Paragraph style={styles.label}>Check Number:</Paragraph>
                <Paragraph>{job.checkNumber}</Paragraph>
              </View>
            )}

            {job.notes && (
              <>
                <Divider style={styles.divider} />
                <Paragraph style={styles.label}>Notes:</Paragraph>
                <Paragraph style={styles.notes}>{job.notes}</Paragraph>
              </>
            )}
          </Card.Content>
        </Card>
        
        {/* Expenses Section */}
        <Card style={styles.expensesCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title>Job Expenses</Title>
              <Button 
                mode="contained" 
                onPress={() => setShowExpenseForm(true)}
                icon="plus"
                style={styles.addExpenseButton}
              >
                Add Expense
              </Button>
            </View>
            
            <Divider style={styles.divider} />
            
            {(!job.expenses || job.expenses.length === 0) ? (
              <Paragraph style={styles.emptyMessage}>No expenses recorded for this job</Paragraph>
            ) : (
              <>
                {/* Expense Summary */}
                <View style={styles.expenseSummary}>
                  <View style={styles.summaryRow}>
                    <Paragraph style={styles.label}>Job Revenue:</Paragraph>
                    <Paragraph style={styles.amount}>{formattedAmount}</Paragraph>
                  </View>
                  
                  <View style={styles.summaryRow}>
                    <Paragraph style={styles.label}>Total Expenses:</Paragraph>
                    <Paragraph style={styles.expenseAmount}>
                      {totalExpenses.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </Paragraph>
                  </View>
                  
                  <Divider style={styles.summaryDivider} />
                  
                  <View style={styles.summaryRow}>
                    <Paragraph style={styles.netLabel}>Net Profit:</Paragraph>
                    <Paragraph style={[
                      styles.netAmount,
                      netProfit >= 0 ? styles.profit : styles.loss
                    ]}>
                      {netProfit.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      })}
                    </Paragraph>
                  </View>
                </View>
                
                <Divider style={styles.divider} />
                
                {/* Expenses by Category */}
                {Object.entries(expensesByCategory).map(([category, expenses]) => (
                  <View key={category} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      <Title style={styles.categoryTitle}>{category}</Title>
                      <Paragraph style={styles.categoryTotal}>
                        {expenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </Paragraph>
                    </View>
                    
                    {expenses.map(expense => (
                      <View key={expense.id} style={styles.expenseItem}>
                        <View style={styles.expenseDetails}>
                          <Paragraph style={styles.expenseDescription}>{expense.description}</Paragraph>
                          <Paragraph style={styles.expenseDate}>
                            {format(new Date(expense.date), 'MMM d, yyyy')}
                          </Paragraph>
                        </View>
                        
                        <View style={styles.expenseAmountContainer}>
                          <Paragraph style={styles.expenseItemAmount}>
                            {expense.amount.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </Paragraph>
                          <IconButton
                            icon="delete"
                            size={16}
                            onPress={() => handleDeleteExpense(expense.id)}
                            style={styles.deleteButton}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            )}
          </Card.Content>
        </Card>
        
        {/* Billing Information Section - only for Charge jobs */}
        {job.paymentMethod === 'Charge' && (
          <Card style={styles.billingCard}>
            <Card.Content>
              <View style={styles.billingHeader}>
                <Title>Billing Information</Title>
                <Button 
                  mode="text" 
                  onPress={() => setIsEditing(!isEditing)}
                  icon={isEditing ? "check" : "pencil"}
                >
                  {isEditing ? 'Done' : 'Edit'}
                </Button>
              </View>
              <Divider style={styles.divider} />
              
              {/* Display billing details if available */}
              {!isEditing && (
                <>
                  {job.billingDetails?.invoiceNumber ? (
                    <View style={styles.detailRow}>
                      <Paragraph style={styles.label}>Invoice #:</Paragraph>
                      <Paragraph>{job.billingDetails.invoiceNumber}</Paragraph>
                    </View>
                  ) : null}
                  
                  {job.billingDetails?.billingDate ? (
                    <View style={styles.detailRow}>
                      <Paragraph style={styles.label}>Billing Date:</Paragraph>
                      <Paragraph>{job.billingDetails.billingDate}</Paragraph>
                    </View>
                  ) : null}
                  
                  {job.billingDetails?.dueDate ? (
                    <View style={styles.detailRow}>
                      <Paragraph style={styles.label}>Due Date:</Paragraph>
                      <Paragraph>{job.billingDetails.dueDate}</Paragraph>
                    </View>
                  ) : null}
                  
                  {job.billingDetails?.contactPerson ? (
                    <View style={styles.detailRow}>
                      <Paragraph style={styles.label}>Contact:</Paragraph>
                      <Paragraph>{job.billingDetails.contactPerson}</Paragraph>
                    </View>
                  ) : null}
                  
                  {job.billingDetails?.contactEmail ? (
                    <View style={styles.detailRow}>
                      <Paragraph style={styles.label}>Email:</Paragraph>
                      <Paragraph>{job.billingDetails.contactEmail}</Paragraph>
                    </View>
                  ) : null}
                  
                  {job.billingDetails?.contactPhone ? (
                    <View style={styles.detailRow}>
                      <Paragraph style={styles.label}>Phone:</Paragraph>
                      <Paragraph>{job.billingDetails.contactPhone}</Paragraph>
                    </View>
                  ) : null}
                  
                  {!job.billingDetails || (
                    !job.billingDetails.invoiceNumber && 
                    !job.billingDetails.contactPerson &&
                    !job.billingDetails.billingDate
                  ) ? (
                    <Paragraph style={styles.emptyBilling}>No billing details entered yet</Paragraph>
                  ) : null}
                </>
              )}
              
              {/* Billing details form */}
              {isEditing && (
                <View style={styles.billingForm}>
                  <TextInput
                    label="Invoice Number"
                    value={billingDetails.invoiceNumber}
                    onChangeText={(text) => setBillingDetails({...billingDetails, invoiceNumber: text})}
                    style={styles.input}
                    mode="outlined"
                  />
                  
                  <TextInput
                    label="Billing Date (MM/DD/YYYY)"
                    value={billingDetails.billingDate}
                    onChangeText={(text) => setBillingDetails({...billingDetails, billingDate: text})}
                    style={styles.input}
                    mode="outlined"
                  />
                  
                  <TextInput
                    label="Due Date (MM/DD/YYYY)"
                    value={billingDetails.dueDate}
                    onChangeText={(text) => setBillingDetails({...billingDetails, dueDate: text})}
                    style={styles.input}
                    mode="outlined"
                  />
                  
                  <TextInput
                    label="Contact Person"
                    value={billingDetails.contactPerson}
                    onChangeText={(text) => setBillingDetails({...billingDetails, contactPerson: text})}
                    style={styles.input}
                    mode="outlined"
                  />
                  
                  <TextInput
                    label="Contact Email"
                    value={billingDetails.contactEmail}
                    onChangeText={(text) => setBillingDetails({...billingDetails, contactEmail: text})}
                    style={styles.input}
                    mode="outlined"
                    keyboardType="email-address"
                  />
                  
                  <TextInput
                    label="Contact Phone"
                    value={billingDetails.contactPhone}
                    onChangeText={(text) => setBillingDetails({...billingDetails, contactPhone: text})}
                    style={styles.input}
                    mode="outlined"
                    keyboardType="phone-pad"
                  />
                  
                  <Button 
                    mode="contained" 
                    onPress={saveBillingDetails}
                    style={styles.saveBillingButton}
                  >
                    Save Billing Details
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={togglePaymentStatus}
            style={job.isPaid ? styles.markUnpaidButton : styles.markPaidButton}
          >
            {job.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
          </Button>

          <View style={styles.editDeleteButtons}>
            <Button
              mode="outlined"
              onPress={handleEdit}
              style={styles.editButton}
              icon="pencil"
            >
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={handleDelete}
              style={styles.deleteButton}
              icon="delete"
            >
              Delete
            </Button>
          </View>
        </View>
      </ScrollView>
      
      {/* Add Expense FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowExpenseForm(true)}
        label="Add Expense"
      />
      
      {/* Add Expense Form Modal */}
      <AddJobExpenseForm
        visible={showExpenseForm}
        onDismiss={() => setShowExpenseForm(false)}
        onSubmit={handleAddExpense}
        jobDate={job.date}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  expensesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 3,
    backgroundColor: '#FAFAFA',
  },
  billingCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  paidChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  unpaidChip: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
  },
  divider: {
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 100,
  },
  amount: {
    fontWeight: 'bold',
  },
  notes: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: {
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  markPaidButton: {
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
  },
  markUnpaidButton: {
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#F44336',
  },
  editDeleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#F44336',
    color: '#F44336',
  },
  billingForm: {
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  saveBillingButton: {
    marginTop: 8,
    backgroundColor: '#2196F3',
  },
  emptyBilling: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
    color: '#757575',
  },
  addExpenseButton: {
    backgroundColor: '#2196F3',
  },
  emptyMessage: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 16,
    color: '#757575',
  },
  expenseSummary: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryDivider: {
    marginVertical: 8,
  },
  netLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  netAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  profit: {
    color: '#4CAF50',
  },
  loss: {
    color: '#F44336',
  },
  expenseAmount: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    padding: 8,
    borderRadius: 4,
  },
  categoryTitle: {
    fontSize: 16,
  },
  categoryTotal: {
    fontWeight: 'bold',
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 14,
  },
  expenseDate: {
    fontSize: 12,
    color: '#757575',
  },
  expenseAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseItemAmount: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  deleteButton: {
    margin: 0,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  // Modal styles
  modalContainer: {
    margin: 20,
  },
  modalCard: {
    padding: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
  categoryScrollView: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
});