// src/screens/AddjobScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  SegmentedButtons, 
  Switch, 
  Divider,
  Card,
  Chip
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job, Client, ClientAddress } from '../types';
import { 
  getFirestore, 
  collection, 
  onSnapshot
} from 'firebase/firestore';

const db = getFirestore();

export default function AddJobScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addJob, updateJob } = useJobs();
  const { user } = useAuth();

  // Check if we're editing an existing job
  const editingJob = (route.params as any)?.job as Job | undefined;
  const isEditing = !!editingJob;

  // Flat rate settings
  const FLAT_RATE_THRESHOLD = 10;
  const FLAT_RATE_AMOUNT = 350;

  // Client selection
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null);
  
  // Autocomplete states
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredAddresses, setFilteredAddresses] = useState<ClientAddress[]>([]);

  // Form state
  const [date, setDate] = useState(editingJob ? new Date(editingJob.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [companyName, setCompanyName] = useState(editingJob?.companyName || '');
  const [address, setAddress] = useState(editingJob?.address || '');
  const [city, setCity] = useState(editingJob?.city || '');
  const [yards, setYards] = useState(editingJob?.yards?.toString() || '');
  const [amountPerYard, setAmountPerYard] = useState(editingJob?.amountPerYard?.toString() || '');
  const [setupCharge, setSetupCharge] = useState(editingJob?.setupCharge?.toString() || '');
  const [manualOverride, setManualOverride] = useState(false);
  const [manualAmount, setManualAmount] = useState(editingJob?.amount?.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge'>(
    editingJob?.paymentMethod || 'Cash'
  );
  const [isPaidToMe, setIsPaidToMe] = useState(editingJob?.isPaidToMe || false);
  const [checkNumber, setCheckNumber] = useState(editingJob?.checkNumber || '');
  const [notes, setNotes] = useState(editingJob?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Load clients
  useEffect(() => {
    if (!user?.uid) return;

    const loadClients = async () => {
      try {
        let ownerId = user.uid;
        
        if (user.role === 'employee' && user.ownerId) {
          ownerId = user.ownerId;
        }

        const clientsRef = collection(db, 'users', ownerId, 'clients');
        
        const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
          const loadedClients = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Client));

          setClients(loadedClients.sort((a, b) => a.name.localeCompare(b.name)));
          console.log(`📋 Loaded ${loadedClients.length} clients for ${user.role}`);
        }, (error) => {
          console.error('Error loading clients:', error);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up clients listener:', error);
      }
    };

    loadClients();
  }, [user?.uid, user?.role, user?.ownerId]);

  // Filter clients as user types
  const handleCompanyNameChange = (text: string) => {
    setCompanyName(text);
    
    if (text.trim().length === 0) {
      setShowClientDropdown(false);
      setFilteredClients([]);
      setSelectedClient(null);
      return;
    }

    const matches = clients.filter(client => 
      client.name.toLowerCase().includes(text.toLowerCase())
    );
    
    setFilteredClients(matches);
    setShowClientDropdown(matches.length > 0);
  };

  // Select client from dropdown
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCompanyName(client.name);
    setShowClientDropdown(false);
    
    if (client.defaultPricePerYard && !amountPerYard) {
      setAmountPerYard(client.defaultPricePerYard.toString());
    }
    if (client.defaultSetupCharge && !setupCharge) {
      setSetupCharge(client.defaultSetupCharge.toString());
    }
    
    setFilteredAddresses(client.addresses);
  };

  // Filter addresses as user types
  const handleAddressChange = (text: string) => {
    setAddress(text);
    
    if (!selectedClient) {
      setShowAddressDropdown(false);
      return;
    }
    
    if (text.trim().length === 0) {
      setShowAddressDropdown(false);
      setFilteredAddresses(selectedClient.addresses);
      setSelectedAddress(null);
      return;
    }

    const matches = selectedClient.addresses.filter(addr => 
      addr.label.toLowerCase().includes(text.toLowerCase()) ||
      addr.address.toLowerCase().includes(text.toLowerCase()) ||
      addr.city.toLowerCase().includes(text.toLowerCase())
    );
    
    setFilteredAddresses(matches);
    setShowAddressDropdown(matches.length > 0);
  };

  // Select address from dropdown
  const handleSelectAddress = (addr: ClientAddress) => {
    setSelectedAddress(addr);
    setAddress(addr.address);
    setCity(addr.city);
    setShowAddressDropdown(false);
    
    if (addr.pricePerYard) {
      setAmountPerYard(addr.pricePerYard.toString());
    } else if (selectedClient?.defaultPricePerYard) {
      setAmountPerYard(selectedClient.defaultPricePerYard.toString());
    }
    
    if (addr.setupCharge) {
      setSetupCharge(addr.setupCharge.toString());
    } else if (selectedClient?.defaultSetupCharge) {
      setSetupCharge(selectedClient.defaultSetupCharge.toString());
    }
  };

  // Show dropdown when address field is focused
  const handleAddressFocus = () => {
    if (selectedClient && selectedClient.addresses.length > 0) {
      setFilteredAddresses(selectedClient.addresses);
      setShowAddressDropdown(true);
    }
  };

  // Show dropdown when company name field is focused
  const handleCompanyNameFocus = () => {
    if (clients.length > 0 && companyName.trim().length === 0) {
      setFilteredClients(clients);
      setShowClientDropdown(true);
    }
  };

  const yardsNum = parseFloat(yards) || 0;
  const isFlatRate = yardsNum > 0 && yardsNum <= FLAT_RATE_THRESHOLD;

  const calculateTotal = (): number => {
    if (manualOverride) {
      return parseFloat(manualAmount) || 0;
    }

    if (isFlatRate) {
      return FLAT_RATE_AMOUNT;
    }

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

      if (isFlatRate) {
        jobData.flatRateAmount = FLAT_RATE_AMOUNT;
      } else if (!manualOverride) {
        jobData.amountPerYard = parseFloat(amountPerYard);
        jobData.setupCharge = parseFloat(setupCharge);
      }

      if (selectedClient) {
        jobData.clientId = selectedClient.id;
        jobData.clientName = selectedClient.name;
      }
      if (selectedAddress) {
        jobData.addressId = selectedAddress.id;
        jobData.addressLabel = selectedAddress.label;
      }

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
        const updatedJob: Job = {
          ...editingJob,
          ...jobData,
          updatedAt: new Date().toISOString(),
        };
        await updateJob(updatedJob);
        Alert.alert('Success', 'Job updated successfully');
      } else {
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.inputContainer}>
        <Text variant="titleLarge">{isEditing ? 'Edit Job' : 'Add New Job'}</Text>

        <Text style={styles.dateLabel}>Job Date: {format(date, 'MMMM dd, yyyy')}</Text>
        <Button mode="outlined" onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
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

        <Divider style={styles.divider} />

        {/* Company Name Autocomplete */}
        {/* Company Name Autocomplete */}
    <View>
  <TextInput
    label="Company Name (Optional)"
    value={companyName}
    onChangeText={handleCompanyNameChange}
    onFocus={handleCompanyNameFocus}
    mode="outlined"
    style={styles.input}
    right={selectedClient ? <TextInput.Icon icon="check-circle" color="#4CAF50" /> : undefined}
  />
  
  {showClientDropdown && (
    <Card style={styles.dropdownCardStatic}>
      <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="always">
        {filteredClients.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.dropdownItem}
            onPress={() => handleSelectClient(item)}
          >
            <Text style={styles.dropdownItemText}>{item.name}</Text>
            {item.addresses.length > 0 && (
              <Text style={styles.dropdownItemSubtext}>
                {item.addresses.length} saved address{item.addresses.length > 1 ? 'es' : ''}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  )}
    </View>

        {/* Address Autocomplete */}
       {/* Address Autocomplete */}
<View>
  <TextInput
    label="Address *"
    value={address}
    onChangeText={handleAddressChange}
    onFocus={handleAddressFocus}
    mode="outlined"
    style={styles.input}
    right={selectedAddress ? <TextInput.Icon icon="check-circle" color="#4CAF50" /> : undefined}
  />
  
  {showAddressDropdown && filteredAddresses.length > 0 && (
    <Card style={styles.dropdownCardStatic}>
      <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="always">
        {filteredAddresses.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.dropdownItem}
            onPress={() => handleSelectAddress(item)}
          >
            <View style={styles.addressDropdownItem}>
              <Chip mode="outlined" compact style={styles.addressLabelChip}>
                {item.label}
              </Chip>
              <Text style={styles.dropdownItemText}>{item.address}</Text>
              <Text style={styles.dropdownItemSubtext}>{item.city}</Text>
              {(item.pricePerYard || item.setupCharge) && (
                <Text style={styles.dropdownPricing}>
                  ${item.pricePerYard || '—'}/yd • ${item.setupCharge || '—'} setup
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Card>
  )}
</View>

        <TextInput label="City *" value={city} onChangeText={setCity} mode="outlined" style={styles.input} />
        <TextInput label="Yards *" value={yards} onChangeText={setYards} keyboardType="decimal-pad" mode="outlined" style={styles.input} />

        {isFlatRate && !manualOverride && (
          <View style={styles.flatRateNotice}>
            <Text style={styles.flatRateText}>
              ✓ Flat rate applied: {yardsNum} yards ≤ {FLAT_RATE_THRESHOLD} yards = ${FLAT_RATE_AMOUNT}
            </Text>
          </View>
        )}

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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Manual amount override</Text>
          <Switch value={manualOverride} onValueChange={setManualOverride} />
        </View>

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

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>

        {!manualOverride && yards && (
          <Text style={styles.calculation}>
            {isFlatRate ? `Flat rate for ${yards} yards` : `(${yards} yards × $${amountPerYard || 0}) + $${setupCharge || 0}`}
          </Text>
        )}

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

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Paid directly to me</Text>
          <Button mode={isPaidToMe ? 'contained' : 'outlined'} onPress={() => setIsPaidToMe(!isPaidToMe)} compact>
            {isPaidToMe ? '✓ Yes' : 'No'}
          </Button>
        </View>

        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Button mode="contained" onPress={handleSave} style={styles.saveButton} loading={isSaving} disabled={isSaving}>
          {isEditing ? 'Update Job' : 'Save Job'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  inputContainer: { padding: 16 },
  dateLabel: { fontSize: 16, marginBottom: 8, marginTop: 16 },
  dateButton: { marginBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 8 },
  input: { marginBottom: 16, backgroundColor: 'white' },
  segmentedButtons: { marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, padding: 12, backgroundColor: 'white', borderRadius: 8 },
  switchLabel: { fontSize: 14, flex: 1 },
  flatRateNotice: { backgroundColor: '#FFF9C4', padding: 12, borderRadius: 8, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FBC02D' },
  flatRateText: { fontSize: 14, color: '#F57F17', fontWeight: 'bold' },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 8, marginBottom: 8 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32' },
  totalAmount: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20' },
  calculation: { fontSize: 14, color: '#666', fontStyle: 'italic', textAlign: 'center', marginBottom: 16 },
  divider: { marginVertical: 16 },
  saveButton: { marginTop: 24, marginBottom: 32, paddingVertical: 8, backgroundColor: '#2196F3' },
autocompleteContainer: {
  marginBottom: 16,
},
dropdownCardStatic: {
  marginTop: -8,
  marginBottom: 16,
  maxHeight: 200,
  elevation: 4,
  backgroundColor: 'white',
},
  dropdown: {
  maxHeight: 200,
},
 dropdownItem: {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
  backgroundColor: 'white',
},
  dropdownItemText: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  dropdownItemSubtext: { fontSize: 12, color: '#666' },
  dropdownPricing: { fontSize: 12, color: '#1976D2', marginTop: 4 },
  addressDropdownItem: { gap: 4 },
  addressLabelChip: { alignSelf: 'flex-start', marginBottom: 4 },
  
});