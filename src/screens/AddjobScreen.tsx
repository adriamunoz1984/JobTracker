import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Switch, Text, SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { PaymentMethod } from '../types';

export default function AddJobScreen() {
  const navigation = useNavigation();
  const { addJob } = useJobs();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [yards, setYards] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [amount, setAmount] = useState(job?.amount?.toString() || '');
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!address || !city || !yards || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    // Create job object
    const jobData = {
      date: date.toISOString(),
      companyName: companyName.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      yards: parseFloat(yards),
      isPaid,
      paymentMethod,
      amount: parseFloat(amount),
      checkNumber: paymentMethod === 'Check' ? checkNumber.trim() : undefined,
      notes: notes.trim() || undefined,
    };

    if (isEditMode && job) {
      // Update existing job
      await updateJob({
        ...job,
        ...jobData,
      });
    } else {
      // Add new job
      await addJob(jobData);
    }
    
    // Navigate back
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        {/* Date Picker */}
        <Text style={styles.dateLabel}>Job Date: {format(date, 'MMMM dd, yyyy')}</Text>
        <Button
          mode="outlined"
          onPress={showDatepicker}
          style={styles.dateButton}
        >
          Change Date
        </Button>
        
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        {/* Company Details */}
        <TextInput
          label="Company Name (Optional)"
          value={companyName}
          onChangeText={setCompanyName}
          style={styles.input}
          mode="outlined"
        />
        
        <TextInput
          label="Job Address *"
          value={address}
          onChangeText={setAddress}
          style={styles.input}
          mode="outlined"
          required
        />
        
        <TextInput
          label="City *"
          value={city}
          onChangeText={setCity}
          style={styles.input}
          mode="outlined"
          required
        />
        
        {/* Job Details */}
        <TextInput
          label="Yards of Concrete *"
          value={yards}
          onChangeText={setYards}
          keyboardType="numeric"
          style={styles.input}
          mode="outlined"
          required
        />
        
        <TextInput
          label="Amount Charged ($) *"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
          mode="outlined"
          required
        />

        {/* Payment Status */}
        <View style={styles.switchContainer}>
          <Text>Mark as Paid</Text>
          <Switch value={isPaid} onValueChange={setIsPaid} />
        </View>

        {/* Payment Method */}
        <Text style={styles.paymentLabel}>Payment Method</Text>
        <SegmentedButtons
          value={paymentMethod}
          onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
          buttons={[
            { value: 'Cash', label: 'Cash' },
            { value: 'Check', label: 'Check' },
            { value: 'Zelle', label: 'Zelle' },
            { value: 'Square', label: 'Square' },
            { value: 'Charge', label: 'Charge' },
          ]}
          style={styles.segmentedButtons}
          multiSelect={false}
        />

        {/* Conditional Fields */}
        {paymentMethod === 'Check' && (
          <TextInput
            label="Check Number"
            value={checkNumber}
            onChangeText={setCheckNumber}
            style={styles.input}
            mode="outlined"
          />
        )}

        {/* Notes */}
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          style={styles.input}
          mode="outlined"
          multiline
          numberOfLines={3}
        />

        {/* Submit Button */}
        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          style={styles.submitButton}
        >
          Save Job
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
  dateLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  dateButton: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  paymentLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});