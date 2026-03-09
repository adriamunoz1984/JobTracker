// src/screens/AddjobScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, Title, Switch, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useJobs } from '../context/JobsContext';
import { Job } from '../types';

export default function AddJobScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addJob, updateJob } = useJobs();

  // Check if we're editing an existing job
  const editingJob = (route.params as any)?.job as Job | undefined;
  const isEditing = !!editingJob;

  // Flat rate settings
  const FLAT_RATE_THRESHOLD = 10; // yards
  const FLAT_RATE_AMOUNT = 350; // dollars

  // Form state
  const [date, setDate] = useState(editingJob ? new Date(editingJob.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [companyName, setCompanyName] = useState(editingJob?.companyName || '');
  const [address, setAddress] = useState(editingJob?.address || '');
  const [city, setCity] = useState(editingJob?.city || '');
  const [yards, setYards] = useState(editingJob?.yards?.toString() || '');
  const [amountPerYard, setAmountPerYard] = useState(editingJob?.amountPerYard?.toString() || '');
  const [setupCharge, setSetupCharge] = useState(editingJob?.setupCharge?.toString() || '');
  const [manualOverride, setManualOverride] = useState(false); // Allow manual override
  const [manualAmount, setManualAmount] = useState(editingJob?.amount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge'>(
    editingJob?.paymentMethod || 'Cash'
  );
  const [isPaidToMe, setIsPaidToMe] = useState(editingJob?.isPaidToMe || false);
  const [checkNumber, setCheckNumber] = useState(editingJob?.checkNumber || '');
  const [notes, setNotes] = useState(editingJob?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Determine if we're in flat rate territory
  const yardsNum = parseFloat(yards) || 0;
  const isFlatRate = yardsNum > 0 && yardsNum <= FLAT_RATE_THRESHOLD;

  // Calculate total automatically
  const calculateTotal = (): number => {
    if (manualOverride) {
      return parseFloat(manualAmount) || 0;
    }

    if (isFlatRate) {
      return FLAT_RATE_AMOUNT;
    }

    // Per-yard calculation
    const perYardNum = parseFloat(amountPerYard) || 0;
    const setupNum = parseFloat(setupCharge) || 0;
    
    return (yardsNum * perYardNum) + setupNum;
  };

  const total = calculateTotal();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!address.trim()) {
      Alert.alert('Missing Information', 'Please enter an address');
      return;
    }

    if (!city.trim()) {
      Alert.alert('Missing Information', 'Please enter a city');
      return;
    }

    if (!yards.trim() || parseFloat(yards) <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of yards');
      return;
    }

    // Validate based on mode
    if (!isFlatRate && !manualOverride) {
      if (!amountPerYard.trim() || parseFloat(amountPerYard) <= 0) {
        Alert.alert('Invalid Input', 'Please enter a valid amount per yard');
        return;
      }

      if (!setupCharge.trim() || parseFloat(setupCharge) < 0) {
        Alert.alert('Invalid Input', 'Please enter a valid setup charge (can be 0)');
        return;
      }
    }

    if (manualOverride && (!manualAmount.trim() || parseFloat(manualAmount) <= 0)) {
      Alert.alert('Invalid Input', 'Please enter a valid manual amount');
      return;
    }

    if (paymentMethod === 'Check' && !checkNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter a check number');
      return;
    }

    try {
      setIsSaving(true);

      const jobData: any = {
        date: date.toISOString(),
        address: address.trim(),
        city: city.trim(),
        yards: parseFloat(yards),
        amount: total,
        paymentMethod,
        isPaidToMe,
        isPaid: false,
        isFlatRate: isFlatRate,
      };

      // Add calculation details based on mode
      if (isFlatRate) {
        jobData.flatRateAmount = FLAT_RATE_AMOUNT;
      } else if (!manualOverride) {
        jobData.amountPerYard = parseFloat(amountPerYard);
        jobData.setupCharge = parseFloat(setupCharge);
      }

      // Add optional fields only if they have values
      if (companyName.trim()) {
        jobData.companyName = companyName.trim();
      }

      if (paymentMethod === 'Check' && checkNumber.trim()) {
        jobData.checkNumber = checkNumber.trim();
      }

      if (notes.trim()) {
        jobData.notes = notes.trim();
      }

      if (isEditing && editingJob) {
        // Update existing job
        const updatedJob: Job = {
          ...editingJob,
          ...jobData,
          updatedAt: new Date().toISOString(),
        };
        await updateJob(updatedJob);
        Alert.alert('Success', 'Job updated successfully');
      } else {
        // Add new job
        await addJob(jobData);
        Alert.alert('Success', 'Job added successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Title>{isEditing ? 'Edit Job' : 'Add New Job'}</Title>

        {/* Date Picker */}
        <Text style={styles.dateLabel}>Job Date: {format(date, 'MMMM dd, yyyy')}</Text>
        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
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

        {/* Company Name */}
        <TextInput
          label="Company Name (Optional)"
          value={companyName}
          onChangeText={setCompanyName}
          mode="outlined"
          style={styles.input}
        />

        {/* Address */}
        <TextInput
          label="Address *"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          style={styles.input}
        />

        {/* City */}
        <TextInput
          label="City *"
          value={city}
          onChangeText={setCity}
          mode="outlined"
          style={styles.input}
        />

        {/* Yards */}
        <TextInput
          label="Yards *"
          value={yards}
          onChangeText={setYards}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
        />

        {/* Flat Rate Detection Notice */}
        {isFlatRate && !manualOverride && (
          <View style={styles.flatRateNotice}>
            <Text style={styles.flatRateText}>
              ✓ Flat rate applied: {yardsNum} yards ≤ {FLAT_RATE_THRESHOLD} yards = ${FLAT_RATE_AMOUNT}
            </Text>
          </View>
        )}

        {/* Per-Yard Calculation (only if > 10 yards and not manual) */}
        {!isFlatRate && !manualOverride && (
          <>
            <TextInput
              label="Amount Per Yard ($) *"
              value={amountPerYard}
              onChangeText={setAmountPerYard}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
            />

            <TextInput
              label="Setup Charge ($) *"
              value={setupCharge}
              onChangeText={setSetupCharge}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
            />
          </>
        )}

        {/* Manual Override Toggle */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Manual amount override</Text>
          <Switch
            value={manualOverride}
            onValueChange={setManualOverride}
          />
        </View>

        {/* Manual Amount Input */}
        {manualOverride && (
          <TextInput
            label="Manual Amount ($) *"
            value={manualAmount}
            onChangeText={setManualAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="currency-usd" />}
          />
        )}

        <Divider style={styles.divider} />

        {/* Total (Calculated) */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>

        {/* Show calculation breakdown */}
        {!manualOverride && yards && (
          <Text style={styles.calculation}>
            {isFlatRate 
              ? `Flat rate for ${yards} yards`
              : `(${yards} yards × $${amountPerYard || 0}) + $${setupCharge || 0}`
            }
          </Text>
        )}

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
            label="Check Number"
            value={checkNumber}
            onChangeText={setCheckNumber}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
          />
        )}

        {/* Paid to Me Toggle */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Paid directly to me</Text>
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

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={isSaving}
          disabled={isSaving}
        >
          {isEditing ? 'Update Job' : 'Save Job'}
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
    marginTop: 16,
  },
  dateButton: {
    marginBottom: 16,
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
    marginVertical: 8,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
  },
  flatRateNotice: {
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  flatRateText: {
    fontSize: 14,
    color: '#F57F17',
    fontWeight: 'bold',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  calculation: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  saveButton: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },
});