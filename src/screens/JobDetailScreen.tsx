import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Card, Title, Paragraph, Button, Divider, Chip, IconButton, TextInput, List } from 'react-native-paper';
import { format } from 'date-fns';

import { useJobs } from '../context/JobsContext';

type RouteParams = {
  jobId: string;
};

// Extended Job interface with billing details
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
  sequenceNumber?: number;
  notes?: string;
  billingDetails?: {
    invoiceNumber?: string;
    billingDate?: string;
    dueDate?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  checkNumber?: string;
}

export default function JobDetailScreen() {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation();
  const { getJobById, updateJob, deleteJob } = useJobs();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const { jobId } = route.params || {};
  
  // State for billing details
  const [showBillingForm, setShowBillingForm] = useState(false);
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
      setShowBillingForm(false);
      Alert.alert('Success', 'Billing details have been saved');
    }
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

  return (
    <ScrollView style={styles.container}>
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
      
      {/* Billing Information Section - only for Charge jobs */}
      {job.paymentMethod === 'Charge' && (
        <Card style={styles.billingCard}>
          <Card.Content>
            <View style={styles.billingHeader}>
              <Title>Billing Information</Title>
              <Button 
                mode="text" 
                onPress={() => setShowBillingForm(!showBillingForm)}
                icon={showBillingForm ? "chevron-up" : "chevron-down"}
              >
                {showBillingForm ? 'Hide Form' : 'Edit'}
              </Button>
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Display billing details if available */}
            {!showBillingForm && (
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
            {showBillingForm && (
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
});