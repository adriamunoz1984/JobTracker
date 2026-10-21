// src/screens/AddjobScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Switch, 
  Divider,
  Chip,
  IconButton,
  Card,
  Checkbox
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
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
import { Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useAppTheme, makeStyles } from '../theme';

const db = getFirestore();

export default function AddJobScreen() {
  const { colors: Colors, gradients } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const route = useRoute();
  const { addJob, updateJob } = useJobs();
  const { user } = useAuth();

  const editingJob = (route.params as any)?.job as Job | undefined;
  const isEditing = !!editingJob;

  const FLAT_RATE_THRESHOLD = 10;
  // Short jobs can have different minimum charges depending on location.

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientLoadError, setClientLoadError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null);
  
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showAllSavedClients, setShowAllSavedClients] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [filteredAddresses, setFilteredAddresses] = useState<ClientAddress[]>([]);

  const [date, setDate] = useState(editingJob ? parseISO(editingJob.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [companyName, setCompanyName] = useState(editingJob?.companyName || '');
  // Derive matches from the current clients and typed name. This also updates
  // suggestions when Firestore finishes loading after the field was focused.
  const matchingClients = clients.filter(client =>
    (client.name || '').toLowerCase().includes(companyName.trim().toLowerCase())
  );
  const visibleClientOptions = showAllSavedClients ? clients : matchingClients;
  const [address, setAddress] = useState(editingJob?.address || '');
  const [city, setCity] = useState(editingJob?.city || '');
  const [yards, setYards] = useState(editingJob?.yards?.toString() || '');
  const [amountPerYard, setAmountPerYard] = useState(editingJob?.amountPerYard?.toString() || '');
  const [setupCharge, setSetupCharge] = useState(editingJob?.setupCharge?.toString() || '');
  const [manualOverride, setManualOverride] = useState(false);
  const [manualAmount, setManualAmount] = useState(editingJob?.amount?.toString() || '');
  const [minimumCharge, setMinimumCharge] = useState(
    editingJob?.isFlatRate ? String(editingJob.flatRateAmount ?? editingJob.amount ?? '') : ''
  );
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge' | 'Card'>(
    editingJob?.paymentMethod || 'Cash'
  );
  const [isPaidToMe, setIsPaidToMe] = useState(editingJob?.isPaidToMe || false);
  const [checkNumber, setCheckNumber] = useState(editingJob?.checkNumber || '');
  const [jobNumber, setJobNumber] = useState(editingJob?.jobNumber || '');
  const [poNumber, setPoNumber] = useState(editingJob?.poNumber || '');
  const [notes, setNotes] = useState(editingJob?.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const connectedToEmployer = user?.role === 'employee' && user?.ownerStatus === 'active' && !!user?.ownerId;
  const isPrivateExisting = !!editingJob && !editingJob.isEmployeeJob && editingJob.jobType !== 'employee' && !editingJob.ownerId;
  const [independentJob, setIndependentJob] = useState(isEditing ? isPrivateExisting : !connectedToEmployer);
  const [jobCommission, setJobCommission] = useState(String(editingJob?.employeeCommissionRate ?? user?.commissionRate ?? (user?.role === 'owner' ? 100 : 50)));

  // Zelle fields
  const [zelleName, setZelleName] = useState(editingJob?.zelleName || '');
  const [zellePhone, setZellePhone] = useState(editingJob?.zellePhone || '');
  const [zelleNumber, setZelleNumber] = useState(editingJob?.zelleNumber || '');

  // Auto-invoice
  const [generateInvoice, setGenerateInvoice] = useState(false);

  // Billing override fields
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
    if (!user?.uid) {
      setClients([]);
      setIsLoadingClients(false);
      setClientLoadError(null);
      return;
    }

    setIsLoadingClients(true);
    setClientLoadError(null);
    // Keep the Firestore listener directly inside the effect so React receives
    // the unsubscribe function. The previous async wrapper returned cleanup
    // from the inner function instead, leaving the listener alive after logout.
    // Once Firebase Auth signed out, that stale listener tried to read the
    // former owner's clients and correctly hit the security rules.
    // Match Client Management and Add Client: saved clients are stored
    // under the signed-in user's own account, including linked employees.
    // An employee's owner may have a separate client collection, but it is
    // not the source used by the current Client Management screen.
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    let active = true;

    const unsubscribe = onSnapshot(
      clientsRef,
      (snapshot) => {
        if (!active) return;

        const loadedClients = snapshot.docs.map(clientDoc => ({
          id: clientDoc.id,
          ...clientDoc.data()
        } as Client));

        setClients(loadedClients.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setIsLoadingClients(false);
        setClientLoadError(null);
        console.log(`📋 Loaded ${loadedClients.length} clients for ${user.role}`);
      },
      (error) => {
        // If auth changed while this screen is being torn down, cleanup will
        // stop the listener. Only report genuine errors while it is active.
        if (active) {
          console.error('Error loading clients:', error);
          setClients([]);
          setIsLoadingClients(false);
          setClientLoadError('Could not load saved clients. Check your connection or account access.');
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid, user?.role, user?.ownerId]);

  const handleCompanyNameChange = (text: string) => {
    setCompanyName(text);
    // Editing the name after selecting a saved client should not silently
    // save this job against the wrong client or an unrelated saved address.
    if (selectedClient && text !== selectedClient.name) {
      setSelectedClient(null);
      setSelectedAddress(null);
      setFilteredAddresses([]);
      setShowAddressDropdown(false);
    }
    // Empty input shows all clients; typed input filters them.
    setShowAllSavedClients(text.trim().length === 0);
    setShowClientDropdown(true);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCompanyName(client.name);
    setShowClientDropdown(false);
    setShowAllSavedClients(false);
    
    if (client.defaultPricePerYard && !amountPerYard) {
      setAmountPerYard(client.defaultPricePerYard.toString());
    }
    if (client.defaultSetupCharge && !setupCharge) {
      setSetupCharge(client.defaultSetupCharge.toString());
    }
    
    // Pre-fill billing from client if available
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
    
    setFilteredAddresses(client.addresses || []);
  };

  const handleAddressChange = (text: string) => {
    setAddress(text);
    
    if (!selectedClient) {
      setShowAddressDropdown(false);
      return;
    }
    
    if (text.trim().length === 0) {
      setShowAddressDropdown(false);
      setFilteredAddresses(selectedClient.addresses || []);
      setSelectedAddress(null);
      return;
    }

    const matches = (selectedClient.addresses || []).filter(addr => 
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
    if (selectedClient && (selectedClient.addresses?.length || 0) > 0) {
      setFilteredAddresses(selectedClient.addresses || []);
      setShowAddressDropdown(true);
    }
  };

  const handleCompanyNameFocus = () => {
    // Always offer saved clients, including when editing an existing company
    // name or while the listener is still loading them.
    setShowAllSavedClients(companyName.trim().length === 0);
    setShowClientDropdown(true);
  };

  const yardsNum = parseFloat(yards) || 0;
  const isFlatRate = yardsNum > 0 && yardsNum <= FLAT_RATE_THRESHOLD;

  const calculateTotal = (): number => {
    if (manualOverride) {
      return parseFloat(manualAmount) || 0;
    }

    if (isFlatRate) {
      return parseFloat(minimumCharge) || 0;
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
                // Update the same client's collection used for selection.
                const clientRef = doc(db, 'users', user!.uid, 'clients', selectedClient.id);
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

    if (isFlatRate && !manualOverride &&
        (!minimumCharge.trim() || !Number.isFinite(Number(minimumCharge)) || Number(minimumCharge) <= 0)) {
      Alert.alert('Minimum Charge Required', 'Enter the minimum charge for this job and location.');
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

    const rate = Number(jobCommission);
    if (independentJob && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      Alert.alert('Invalid commission', 'Enter a percentage from 0 to 100.');
      return;
    }
    try {
      setIsSaving(true);

      const jobData: any = {
        // Jobs are scheduled by calendar day, so store a local date-only value.
        // This avoids UTC conversion shifting backfilled jobs onto an adjacent day.
        date: format(date, 'yyyy-MM-dd'),
        address: address.trim(),
        city: city.trim(),
        yards: parseFloat(yards),
        amount: total,
        paymentMethod,
        isPaidToMe,
        isPaid: isPaidToMe ? true : false,
        isFlatRate: isFlatRate,
        ...(!isEditing || isPrivateExisting ? {
          jobType: independentJob ? 'personal' : 'employee',
          ...(independentJob ? { employeeCommissionRate: rate } : {}),
        } : {}),
      };

      if (isFlatRate) {
        jobData.flatRateAmount = parseFloat(minimumCharge);
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

      // Job # and PO # are optional per job. When editing, null clears an old value.
      if (jobNumber.trim()) {
        jobData.jobNumber = jobNumber.trim();
      } else if (isEditing && editingJob?.jobNumber) {
        jobData.jobNumber = null;
      }

      if (poNumber.trim()) {
        jobData.poNumber = poNumber.trim();
      } else if (isEditing && editingJob?.poNumber) {
        jobData.poNumber = null;
      }

      if (paymentMethod === 'Check' && checkNumber.trim()) {
        jobData.checkNumber = checkNumber.trim();
      }

      if (paymentMethod === 'Zelle') {
        if (zelleName.trim()) jobData.zelleName = zelleName.trim();
        if (zellePhone.trim()) jobData.zellePhone = zellePhone.trim();
        if (zelleNumber.trim()) jobData.zelleNumber = zelleNumber.trim();
      }

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
} 
else 
  {
  await addJob(jobData);
  
  await promptUpdateClientBilling();
  
  // If generate invoice is checked, navigate to invoice creation
  if (generateInvoice) 
    {
      const jobForInvoice = 
      {
        id: `job_${Date.now()}`,
        ...jobData,
        date: jobData.date || date.toISOString(),
      };
    
      (navigation as any).navigate('Invoice', { 
        jobs: [jobForInvoice] 
      });
    } 
    else 
      {
        Alert.alert('Success', 'Job added successfully');
        navigation.goBack();
      }
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
        colors={gradients.primary}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {isEditing ? '✏️ Edit Job' : '➕ Add New Job'}
        </Text>
        <Text style={styles.headerSubtitle}>{format(date, 'MMMM dd, yyyy')}</Text>
      </LinearGradient>

      <View style={styles.content}>
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
          
          <Button
            mode="outlined"
            icon="account-search-outline"
            style={{ alignSelf: 'flex-start', marginBottom: Spacing.md }}
            onPress={() => {
              if (showClientDropdown && showAllSavedClients) {
                setShowClientDropdown(false);
              } else {
                setShowAllSavedClients(true);
                setShowClientDropdown(true);
              }
            }}
          >
            {showClientDropdown && showAllSavedClients ? 'Hide Saved Clients' : 'Choose Saved Client'}
          </Button>

          {showClientDropdown && (
            <View style={styles.dropdownCard}>
              {isLoadingClients ? (
                <Text style={styles.dropdownHint}>Loading saved clients...</Text>
              ) : clientLoadError ? (
                <Text style={styles.dropdownHint}>{clientLoadError}</Text>
              ) : visibleClientOptions.length === 0 ? (
                <Text style={styles.dropdownHint}>
                  {clients.length === 0
                    ? 'No saved clients for this account. You can still type a company name.'
                    : 'No matching saved clients. You can enter a new company name.'}
                </Text>
              ) : (
                <ScrollView style={styles.dropdown} nestedScrollEnabled keyboardShouldPersistTaps="always">
                  {visibleClientOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectClient(item)}
                    >
                      <Text style={styles.dropdownItemText}>{item.name}</Text>
                      {(item.addresses?.length || 0) > 0 && (
                        <Text style={styles.dropdownItemSubtext}>
                          {item.addresses.length} saved address{item.addresses.length > 1 ? 'es' : ''}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>

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

        {!isEditing && (
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Independent Job</Text>
              <Text style={styles.switchSubtext}>
                {connectedToEmployer ? 'Private job: only you can see it.' : 'Save to your personal records.'}
              </Text>
            </View>
            <Switch value={independentJob} onValueChange={setIndependentJob} color={Colors.primary} />
          </View>
        )}
        {independentJob && (
          <TextInput
            label="My commission for this job (%)"
            value={jobCommission}
            onChangeText={setJobCommission}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        )}
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

          <View style={styles.row}>
            <TextInput
              label="Job Number (Optional)"
              value={jobNumber}
              onChangeText={setJobNumber}
              mode="outlined"
              style={[styles.input, styles.flexInput]}
              placeholder="Job #"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
            <TextInput
              label="PO Number (Optional)"
              value={poNumber}
              onChangeText={setPoNumber}
              mode="outlined"
              style={[styles.input, styles.flexInput]}
              placeholder="PO #"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
          </View>
        </View>

        {isFlatRate && !manualOverride && (
          <TextInput
            label="Minimum Charge for This Job ($) *"
            value={minimumCharge}
            onChangeText={setMinimumCharge}
            placeholder="Enter location-based minimum"
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="currency-usd" />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
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

        <LinearGradient
          colors={gradients.success}
          style={styles.totalContainer}
        >
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </LinearGradient>

        {!manualOverride && yards && (
          <Text style={styles.calculation}>
            {isFlatRate ? `Minimum charge for ${yards} yards` : `(${yards} yards × $${amountPerYard || 0}) + $${setupCharge || 0}`}
          </Text>
        )}

        <Divider style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
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

      {/* Direct Payment Switch */}
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
        
      
      {/* Auto-Generate Invoice - NEW */}
      <View style={styles.switchRow}>
        <View style={styles.switchContent}>
          <Text style={styles.switchLabel}>📄 Generate Invoice</Text>
          <Text style={styles.switchSubtext}>
            Automatically create an invoice for this job
          </Text>
        </View>
        <Switch 
          value={generateInvoice} 
          onValueChange={setGenerateInvoice}
          color={Colors.primary}
        />
      </View>
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

const useStyles = makeStyles((Colors) => ({
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
  dropdownHint: {
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
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
}));