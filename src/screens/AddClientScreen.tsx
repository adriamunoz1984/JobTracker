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
  Chip,
  IconButton,
  Card,
  Checkbox
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job, Client, ClientAddress } from '../types';
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/colors';

const db = getFirestore();

export default function AddJobScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { addJob, updateJob } = useJobs();
  const { user } = useAuth();

  const editingJob = (route.params as any)?.job as Job | undefined;
  const isEditing = !!editingJob;

  const FLAT_RATE_THRESHOLD = 10;
  const FLAT_RATE_AMOUNT = 350;

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null);
  
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredAddresses, setFilteredAddresses] = useState<ClientAddress[]>([]);

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
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge' | 'Card'>(
    editingJob?.paymentMethod || 'Cash'
  );
  const [isPaidToMe, setIsPaidToMe] = useState(editingJob?.isPaidToMe || false);
  const [checkNumber, setCheckNumber] = useState(editingJob?.checkNumber || '');
  const [notes, setNotes] = useState(editingJob?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Zelle fields
  const [zelleName, setZelleName] = useState(editingJob?.zelleName || '');
  const [zellePhone, setZellePhone] = useState(editingJob?.zellePhone || '');
  const [zelleNumber, setZelleNumber] = useState(editingJob?.zelleNumber || '');

  // Billing override fields (NEW)
  const [useDifferentBilling, setUseDifferentBilling] = useState(editingJob?.useDifferentBilling || false);
  const [billingName, setBillingName] = useState(editingJob?.billingName || '');
  const [billingAddress, setBillingAddress] = useState(editingJob?.billingAddress || '');
  const [billingCity, setBillingCity] = useState(editingJob?.billingCity || '');
  const [billingState, setBillingState] = useState(editingJob?.billingState || '');
  const [billingZip, setBillingZip] = useState(editingJob?.billingZip || '');
  const [billingEmail, setBillingEmail] = useState(editingJob?.billingEmail || '');
  const [billingPhone, setBillingPhone] = useState(editingJob?.billingPhone || '');
  const [billingPO, setBillingPO] = useState(editingJob?.billingPO || '');

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
    
    // Pre-fill billing info from client if available and not using different billing
    if (!useDifferentBilling && client.billingName) {
      setBillingName(client.billingName);
      setBillingAddress(client.billingAddress || '');
      setBillingCity(client.billingCity || '');
      setBillingState(client.billingState || '');
      setBillingZip(client.billingZip || '');
      setBillingEmail(client.billingEmail || '');
      setBillingPhone(client.billingPhone || '');
      setBillingPO(client.billingPO || '');
    }
    
    setFilteredAddresses(client.addresses);
  };

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

  const handleAddressFocus = () => {
    if (selectedClient && selectedClient.addresses.length > 0) {
      setFilteredAddresses(selectedClient.addresses);
      setShowAddressDropdown(true);
    }
  };

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

  const promptUpdateClientBilling = async () => {
    if (!selectedClient || !useDifferentBilling) return;

    // Check if billing info has changed from what's on file
    const hasChanges = 
      billingName !== (selectedClient.billingName || '') ||
      billingAddress !== (selectedClient.billingAddress || '') ||
      billingCity !== (selectedClient.billingCity || '') ||
      billingState !== (selectedClient.billingState || '') ||
      billingZip !== (selectedClient.billingZip || '') ||
      billingEmail !== (selectedClient.billingEmail || '') ||
      billingPhone !== (selectedClient.billingPhone || '') ||
      billingPO !== (selectedClient.billingPO || '');

    if (hasChanges) {
      Alert.alert(
        'Update Billing Info?',
        'Would you like to update the billing information on file for this client?',
        [
          { text: 'No, Just This Job', style: 'cancel' },
          {
            text: 'Yes, Update Client',
            onPress: async () => {
              try {
                let ownerId = user!.uid;
                if (user!.role === 'employee' && user!.ownerId) {
                  ownerId = user!.ownerId;
                }

                const clientRef = doc(db, 'users', ownerId, 'clients', selectedClient.id);
                await updateDoc(clientRef, {
                  billingName: billingName.trim() || null,
                  billingAddress: billingAddress.trim() || null,
                  billingCity: billingCity.trim() || null,
                  billingState: billingState.trim() || null,
                  billingZip: billingZip.trim() || null,
                  billingEmail: billingEmail.trim() || null,
                  billingPhone: billingPhone.trim() || null,
                  billingPO: billingPO.trim() || null,
                  updatedAt: new Date().toISOString(),
                });
                console.log('✅ Client billing info updated');
              } catch (error) {
                console.error('Error updating client billing:', error);
              }
            }
          }
        ]
      );
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
        isPaid: isPaidToMe ? true : false,
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

      // Add Zelle details if payment method is Zelle
      if (paymentMethod === 'Zelle') {
        if (zelleName.trim()) jobData.zelleName = zelleName.trim();
        if (zellePhone.trim()) jobData.zellePhone = zellePhone.trim();
        if (zelleNumber.trim()) jobData.zelleNumber = zelleNumber.trim();
      }

      // Add billing override if payment is Charge
      if (paymentMethod === 'Charge' && useDifferentBilling) {
        jobData.useDifferentBilling = true;
        if (billingName.trim()) jobData.billingName = billingName.trim();
        if (billingAddress.trim()) jobData.billingAddress = billingAddress.trim();
        if (billingCity.trim()) jobData.billingCity = billingCity.trim();
        if (billingState.trim()) jobData.billingState = billingState.trim();
        if (billingZip.trim()) jobData.billingZip = billingZip.trim();
        if (billingEmail.trim()) jobData.billingEmail = billingEmail.trim();
        if (billingPhone.trim()) jobData.billingPhone = billingPhone.trim();
        if (billingPO.trim()) jobData.billingPO = billingPO.trim();
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
        navigation.goBack();
      } else {
        await addJob(jobData);
        Alert.alert('Success', 'Job added successfully');
        
        // Prompt to update client billing if applicable
        await promptUpdateClientBilling();
        
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving job:', error);
      Alert.alert('Error', 'Failed to save job');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {isEditing ? '✏️ Edit Job' : '➕ Add New Job'}
        </Text>
        <Text style={styles.headerSubtitle}>{format(date, 'MMMM dd, yyyy')}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Date Picker */}
        <View style={styles.section}>
          <Button
            mode="outlined"
            icon="calendar"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            textColor={Colors.primary}
          >
            Change Date
          </Button>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )}

        <Divider style={styles.divider} />

        {/* Client Autocomplete */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          <TextInput
            label="Company Name (Optional)"
            value={companyName}
            onChangeText={handleCompanyNameChange}
            onFocus={handleCompanyNameFocus}
            mode="outlined"
            style={styles.input}
            right={selectedClient ? <TextInput.Icon icon="check-circle" iconColor={Colors.success} /> : undefined}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          
          {showClientDropdown && (
            <View style={styles.dropdownCard}>
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
            </View>
          )}
        </View>

        {/* Address Autocomplete */}
        <View style={styles.section}>
          <TextInput
            label="Address *"
            value={address}
            onChangeText={handleAddressChange}
            onFocus={handleAddressFocus}
            mode="outlined"
            style={styles.input}
            right={selectedAddress ? <TextInput.Icon icon="check-circle" iconColor={Colors.success} /> : undefined}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          
          {showAddressDropdown && filteredAddresses.length > 0 && (
            <View style={styles.dropdownCard}>
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
            </View>
          )}
        </View>

        <TextInput
          label="City *"
          value={city}
          onChangeText={setCity}
          mode="outlined"
          style={styles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />

        <Divider style={styles.divider} />

        {/* Yards & Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <TextInput
            label="Yards *"
            value={yards}
            onChangeText={setYards}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="truck-delivery" iconColor={Colors.primary} />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        {isFlatRate && !manualOverride && (
          <View style={styles.flatRateNotice}>
            <IconButton icon="check-circle" iconColor={Colors.warning} size={20} />
            <Text style={styles.flatRateText}>
              Flat rate applied: {yardsNum} yards ≤ {FLAT_RATE_THRESHOLD} yards = ${FLAT_RATE_AMOUNT}
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
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
            <TextInput
              label="Setup Charge ($) *"
              value={setupCharge}
              onChangeText={setSetupCharge}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
          </>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Manual amount override</Text>
          <Switch value={manualOverride} onValueChange={setManualOverride} color={Colors.primary} />
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
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        )}

        <Divider style={styles.divider} />

        {/* Total */}
        <LinearGradient
          colors={[Colors.success, Colors.successLight]}
          style={styles.totalContainer}
        >
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </LinearGradient>

        {!manualOverride && yards && (
          <Text style={styles.calculation}>
            {isFlatRate ? `Flat rate for ${yards} yards` : `(${yards} yards × $${amountPerYard || 0}) + $${setupCharge || 0}`}
          </Text>
        )}

        <Divider style={styles.divider} />

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <Text>Current payment method: {paymentMethod}</Text>
          <View style={styles.paymentMethodContainer}>
            {['Cash', 'Check', 'Charge', 'Zelle', 'Card'].map((method) => (
              <Chip
                key={method}
                selected={paymentMethod === method}
                onPress={() => setPaymentMethod(method as any)}
                style={styles.paymentChip}
                selectedColor={Colors.primary}
              >
                {method === 'Cash' && '💵'}
                {method === 'Check' && '📝'}
                {method === 'Charge' && '📋'}
                {method === 'Zelle' && '📱'}
                {method === 'Card' && '💳'}
                {' '}{method}
              </Chip>
            ))}
          </View>
        </View>

        {paymentMethod === 'Check' && (
          <TextInput
            label="Check Number *"
            value={checkNumber}
            onChangeText={setCheckNumber}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        )}

        {/* Zelle Details */}
        {paymentMethod === 'Zelle' && (
          <View style={styles.zelleContainer}>
            <Text style={styles.subLabel}>Zelle Payment Details (Optional)</Text>
            
            <TextInput
              label="Recipient Name"
              value={zelleName}
              onChangeText={setZelleName}
              mode="outlined"
              style={styles.input}
              placeholder="Name on Zelle account"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
            
            <TextInput
              label="Phone Number"
              value={zellePhone}
              onChangeText={setZellePhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              placeholder="Phone used for Zelle"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
            
            <TextInput
              label="Confirmation Number"
              value={zelleNumber}
              onChangeText={setZelleNumber}
              mode="outlined"
              style={styles.input}
              placeholder="Transaction confirmation #"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
          </View>
        )}

        {/* Billing Override for Charge (NEW) */}
        {paymentMethod === 'Charge' && (
          <View style={styles.billingSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setUseDifferentBilling(!useDifferentBilling)}
            >
              <Checkbox
                status={useDifferentBilling ? 'checked' : 'unchecked'}
                onPress={() => setUseDifferentBilling(!useDifferentBilling)}
                color={Colors.primary}
              />
              <Text style={styles.checkboxLabel}>Use different billing info for this job</Text>
            </TouchableOpacity>

            {useDifferentBilling && (
              <Card style={styles.billingCard}>
                <Card.Content>
                  <Text style={styles.billingCardTitle}>💳 Billing Information</Text>
                  
                  <TextInput
                    label="Billing Name"
                    value={billingName}
                    onChangeText={setBillingName}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Company name for invoice"
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />

                  <TextInput
                    label="Billing Address"
                    value={billingAddress}
                    onChangeText={setBillingAddress}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Street address"
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />

                  <View style={styles.row}>
                    <TextInput
                      label="City"
                      value={billingCity}
                      onChangeText={setBillingCity}
                      mode="outlined"
                      style={[styles.input, styles.flexInput]}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                    />
                    
                    <TextInput
                      label="State"
                      value={billingState}
                      onChangeText={setBillingState}
                      mode="outlined"
                      style={[styles.input, styles.shortInput]}
                      maxLength={2}
                      autoCapitalize="characters"
                      placeholder="CA"
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                    />
                  </View>

                  <TextInput
                    label="ZIP Code"
                    value={billingZip}
                    onChangeText={setBillingZip}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                    maxLength={10}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />

                  <TextInput
                    label="Billing Email"
                    value={billingEmail}
                    onChangeText={setBillingEmail}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                    left={<TextInput.Icon icon="email" iconColor={Colors.primary} />}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />

                  <TextInput
                    label="Billing Phone"
                    value={billingPhone}
                    onChangeText={setBillingPhone}
                    mode="outlined"
                    keyboardType="phone-pad"
                    style={styles.input}
                    left={<TextInput.Icon icon="phone" iconColor={Colors.primary} />}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />

                  <TextInput
                    label="PO Number"
                    value={billingPO}
                    onChangeText={setBillingPO}
                    mode="outlined"
                    style={styles.input}
                    placeholder="Purchase order #"
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>Direct Payment</Text>
            <Text style={styles.switchSubtext}>
              Payment received directly (not through company account)
            </Text>
          </View>
          <Switch 
            value={isPaidToMe} 
            onValueChange={setIsPaidToMe}
            color={Colors.primary}
          />
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
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={isSaving}
          disabled={isSaving}
          buttonColor={Colors.primary}
          icon={isEditing ? 'check' : 'content-save'}
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
    backgroundColor: Colors.background,
  },
  header: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    ...Shadows.medium,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  content: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  dateButton: {
    borderColor: Colors.primary,
  },
  input: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  shortInput: {
    width: 80,
  },
  divider: {
    marginVertical: Spacing.lg,
    backgroundColor: Colors.borderLight,
  },
  dropdownCard: {
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
    maxHeight: 200,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  dropdown: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: Colors.text,
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dropdownPricing: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  addressDropdownItem: {
    gap: 4,
  },
  addressLabelChip: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  flatRateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  flatRateText: {
    flex: 1,
    fontSize: 14,
    color: Colors.warning,
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.sm,
    ...Shadows.medium,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
  },
  calculation: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  paymentChip: {
    marginBottom: 4,
  },
  zelleContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.infoBg,
    borderRadius: BorderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
    marginBottom: Spacing.md,
  },
  billingSection: {
    marginBottom: Spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  billingCard: {
    backgroundColor: Colors.infoBg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  billingCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.infoBg,
    borderRadius: BorderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
    ...Shadows.small,
  },
  switchContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  saveButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
});