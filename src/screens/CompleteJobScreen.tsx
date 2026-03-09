// src/screens/CompleteJobScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Title, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  doc, 
  getDoc,
  updateDoc
} from 'firebase/firestore';

const db = getFirestore();

interface OwnerJob {
  id: string;
  date: string;
  companyName?: string;
  address: string;
  city: string;
  notes?: string;
  ownerId: string;
  assignedTo: string;
  status: string;
  yards?: number;
  amount?: number;
  paymentMethod?: 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';
  isPaidToMe?: boolean;
  checkNumber?: string;
}

export default function CompleteJobScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { jobId } = route.params as { jobId: string };

  const [isLoading, setIsLoading] = useState(false);
  const [job, setJob] = useState<OwnerJob | null>(null);

  // Job completion fields
  const [yards, setYards] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge'>('Cash');
  const [isPaidToMe, setIsPaidToMe] = useState(false);
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'users', user!.uid, 'ownerJobs', jobId));
      if (jobDoc.exists()) {
        const jobData = { id: jobDoc.id, ...jobDoc.data() } as OwnerJob;
        setJob(jobData);
        
        // Pre-fill existing data if any
        if (jobData.yards) setYards(jobData.yards.toString());
        if (jobData.amount) setAmount(jobData.amount.toString());
        if (jobData.paymentMethod) setPaymentMethod(jobData.paymentMethod);
        if (jobData.isPaidToMe !== undefined) setIsPaidToMe(jobData.isPaidToMe);
        if (jobData.checkNumber) setCheckNumber(jobData.checkNumber);
        if (jobData.notes) setNotes(jobData.notes);
      }
    } catch (error) {
      console.error('Error loading job:', error);
      Alert.alert('Error', 'Failed to load job details');
    }
  };

  const handleComplete = async () => {
    // Validation
    if (!yards.trim() || parseFloat(yards) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of yards');
      return;
    }

    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'Check' && !checkNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter a check number');
      return;
    }

    try {
      setIsLoading(true);

      const updates: any = {
        yards: parseFloat(yards),
        amount: parseFloat(amount),
        paymentMethod,
        isPaidToMe,
        isPaid: false, // Add this - job starts as unpaid
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        jobType: 'employee', // Add this - marks it as employee job
      };

      if (paymentMethod === 'Check' && checkNumber.trim()) {
        updates.checkNumber = checkNumber.trim();
      }

      if (notes.trim()) {
        updates.notes = notes.trim();
      }

      await updateDoc(doc(db, 'users', user!.uid, 'ownerJobs', jobId), updates);

      Alert.alert(
        'Job Completed!',
        'The job details have been saved and sent to your employer.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error completing job:', error);
      Alert.alert('Error', 'Failed to save job details');
    } finally {
      setIsLoading(false);
    }
  };

  if (!job) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Title>Complete Job Details</Title>
        <Text style={styles.subtitle}>
          Add the job details after completing the work
        </Text>

        <Divider style={styles.divider} />

        {/* Job Info (Read-only) */}
        <View style={styles.infoSection}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{format(new Date(job.date), 'MMMM dd, yyyy')}</Text>

          {job.companyName && (
            <>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{job.companyName}</Text>
            </>
          )}

          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{job.address}, {job.city}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* Yards */}
        <TextInput
          label="Yards Pumped *"
          value={yards}
          onChangeText={setYards}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
        />

        {/* Amount */}
        <TextInput
          label="Total Amount ($) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="currency-usd" />}
        />

        {/* Payment Method */}
        <Text style={styles.sectionLabel}>Payment Method:</Text>
        <SegmentedButtons
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as any)}
          buttons={[
            { value: 'Cash', label: '💵 Cash' },
            { value: 'Check', label: '📝 Check' },
            { value: 'Charge', label: '📋 Charge' },
          ]}
          style={styles.segmentedButtons}
        />

        {paymentMethod === 'Check' && (
          <TextInput
            label="Check Number *"
            value={checkNumber}
            onChangeText={setCheckNumber}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
        )}

        {/* Paid to Me Toggle */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I received this payment directly</Text>
          <Button
            mode={isPaidToMe ? 'contained' : 'outlined'}
            onPress={() => setIsPaidToMe(!isPaidToMe)}
            compact
          >
            {isPaidToMe ? '✓ Yes' : 'No'}
          </Button>
        </View>

        {/* Notes */}
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleComplete}
          style={styles.submitButton}
          loading={isLoading}
          disabled={isLoading}
        >
          Complete Job
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  inputContainer: {
    padding: 16,
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  infoSection: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
  },
});