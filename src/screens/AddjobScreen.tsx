import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Switch, Text, SegmentedButtons, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

import { useJobs } from '../context/JobsContext';
import { PaymentMethod, Job } from '../types';

export default function AddJobScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addJob, updateJob, getJobById } = useJobs();
  
  // Check if we're editing an existing job
  const editJob = route.params?.job as Job | undefined;
  const isEditMode = !!editJob;
  
  // Basic job information
  const [date, setDate] = useState(editJob ? new Date(editJob.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [companyName, setCompanyName] = useState(editJob?.companyName || '');
  const [address, setAddress] = useState(editJob?.address || '');
  const [city, setCity] = useState(editJob?.city || '');
  const [yards, setYards] = useState(editJob?.yards ? editJob.yards.toString() : '');
  const [isPaid, setIsPaid] = useState(editJob?.isPaid || false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editJob?.paymentMethod || 'Cash');
  const [amount, setAmount] = useState(editJob?.amount ? editJob.amount.toString() : '');
  const [checkNumber, setCheckNumber] = useState(editJob?.checkNumber || '');
  const [notes, setNotes] = useState(editJob?.notes || '');
  const [isPaidToMe, setIsPaidToMe] = useState(editJob?.isPaidToMe || false);
  
  // Billing details (for Charge payment method)
  const [billingDetails, setBillingDetails] = useState({
    invoiceNumber: editJob?.billingDetails?.invoiceNumber || '',
    billingDate: editJob?.billingDetails?.billingDate || '',
    dueDate: editJob?.billingDetails?.dueDate || '',
    contactPerson: editJob?.billingDetails?.contactPerson || '',
    contactEmail: editJob?.billingDetails?.contactEmail || '',
    contactPhone: editJob?.billingDetails?.contactPhone || '',
  });

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

    // Create job object with proper date handling
    const jobData = {
      // Important fix: Convert date to ISO string at noon UTC to avoid timezone issues
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0).toISOString(),
      companyName: companyName.trim() || undefined,
      address: address.trim(),
      city: city.trim(),
      yards: parseFloat(yards),
      isPaid,
      isPaidToMe,
      paymentMethod,
      amount: parseFloat(amount),
      checkNumber: paymentMethod === 'Check' ? checkNumber.trim() : undefined,
      notes: notes.trim() || undefined,
      // Only include billing details if payment method is Charge
      billingDetails: paymentMethod === 'Charge' ? {
        invoiceNumber: billingDetails.invoiceNumber.trim() || undefined,
        billingDate: billingDetails.billingDate.trim() || undefined,
        dueDate: billingDetails.dueDate.trim() || undefined,
        contactPerson: billingDetails.contactPerson.trim() || undefined,
        contactEmail: billingDetails.contactEmail.trim() || undefined,
        contactPhone: billingDetails.contactPhone.trim() || undefined,
      } : undefined,
    };

    try {
      if (isEditMode && editJob) {
        // Update existing job
        await updateJob({
          ...editJob,
          ...jobData,
        });
      } else {
        // Add new job
        await addJob(jobData);
      }
      
      // Navigate back
      navigation.goBack();
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Failed to save job. Please try again.');
    }
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
            { value: 'Check', label: 'Check' },
            { value: 'Zelle', label: 'Zelle' },
            { value: 'Square', label: 'Square' },
            { value: 'Charge', label: 'Charge' },
            { value: 'Cash', label: 'Cash' },
          ]}
          style={styles.segmentedButtons}
          multiSelect={false}
        />

        {/* Paid To Me Option - Always visible for any payment method */}
        <View style={styles.switchContainer}>
          <Text>Paid Directly To Me</Text>
          <Switch value={isPaidToMe} onValueChange={setIsPaidToMe} />
        </View>

        {/* Conditional Fields based on Payment Method */}
        {paymentMethod === 'Check' && (
          <TextInput
            label="Check Number"
            value={checkNumber}
            onChangeText={setCheckNumber}
            style={styles.input}
            mode="outlined"
          />
        )}
        
        {/* Billing Information for Charge payment method */}
        {paymentMethod === 'Charge' && (
          <View style={styles.billingContainer}>
            <Divider style={styles.divider} />
            <Text style={styles.sectionTitle}>Billing Information</Text>
            
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
              autoCapitalize="none"
            />
            
            <TextInput
              label="Contact Phone"
              value={billingDetails.contactPhone}
              onChangeText={(text) => setBillingDetails({...billingDetails, contactPhone: text})}
              style={styles.input}
              mode="outlined"
              keyboardType="phone-pad"
            />
          </View>
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
          {isEditMode ? 'Update Job' : 'Save Job'}
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
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  billingContainer: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});