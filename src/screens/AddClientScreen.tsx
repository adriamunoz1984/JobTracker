// src/screens/AddClientScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  IconButton,
  Chip,
  Divider,
  Switch,
  FAB,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Client, ClientAddress } from '../types';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useAppTheme, makeStyles } from '../theme';

const db = getFirestore();

export default function AddClientScreen() {
  const { colors: Colors, gradients } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const editingClient = (route.params as any)?.client as Client | undefined;
  const isEditing = !!editingClient;

  // Client fields
  const [clientName, setClientName] = useState(editingClient?.name || '');
  const [phone, setPhone] = useState(editingClient?.phone || '');
  const [email, setEmail] = useState(editingClient?.email || '');
  const [notes, setNotes] = useState(editingClient?.notes || '');
  const [isPrivate, setIsPrivate] = useState(editingClient?.isPrivate || false);

  // Default pricing
  const [defaultPricePerYard, setDefaultPricePerYard] = useState(
    editingClient?.defaultPricePerYard?.toString() || ''
  );
  const [defaultSetupCharge, setDefaultSetupCharge] = useState(
    editingClient?.defaultSetupCharge?.toString() || ''
  );

  // Billing info
  const [billingName, setBillingName] = useState(editingClient?.billingName || '');
  const [billingAddress, setBillingAddress] = useState(editingClient?.billingAddress || '');
  const [billingCity, setBillingCity] = useState(editingClient?.billingCity || '');
  const [billingState, setBillingState] = useState(editingClient?.billingState || '');
  const [billingZip, setBillingZip] = useState(editingClient?.billingZip || '');
  const [billingEmail, setBillingEmail] = useState(editingClient?.billingEmail || '');
  const [billingPhone, setBillingPhone] = useState(editingClient?.billingPhone || '');
  const [billingPO, setBillingPO] = useState(editingClient?.billingPO || '');

  // Address fields
  const [addresses, setAddresses] = useState<ClientAddress[]>(editingClient?.addresses || []);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressLabel, setAddressLabel] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pricePerYard, setPricePerYard] = useState('');
  const [setupCharge, setSetupCharge] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const resetAddressForm = () => {
    setAddressLabel('');
    setAddress('');
    setCity('');
    setPricePerYard('');
    setSetupCharge('');
    setEditingAddressIndex(null);
    setShowAddressForm(false);
  };

  const handleAddAddress = () => {
    if (!addressLabel.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Missing Info', 'Please fill in label, address, and city');
      return;
    }

    const newAddress: ClientAddress = {
      id: editingAddressIndex !== null ? addresses[editingAddressIndex].id : `addr_${Date.now()}`,
      label: addressLabel.trim(),
      address: address.trim(),
      city: city.trim(),
      pricePerYard: pricePerYard ? parseFloat(pricePerYard) : undefined,
      setupCharge: setupCharge ? parseFloat(setupCharge) : undefined,
    };

    if (editingAddressIndex !== null) {
      const updatedAddresses = [...addresses];
      updatedAddresses[editingAddressIndex] = newAddress;
      setAddresses(updatedAddresses);
    } else {
      setAddresses([...addresses, newAddress]);
    }

    resetAddressForm();
  };

  const handleEditAddress = (index: number) => {
    const addr = addresses[index];
    setAddressLabel(addr.label);
    setAddress(addr.address);
    setCity(addr.city);
    setPricePerYard(addr.pricePerYard?.toString() || '');
    setSetupCharge(addr.setupCharge?.toString() || '');
    setEditingAddressIndex(index);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = (index: number) => {
    const updatedAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(updatedAddresses);
  };

  const handleSave = async () => {
    if (!clientName.trim()) {
      Alert.alert('Missing Info', 'Please enter a client name');
      return;
    }

    try {
      setIsSaving(true);

      const clientData: any = {
        name: clientName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        notes: notes.trim() || null,
        isPrivate,
        addresses,
        updatedAt: new Date().toISOString(),
      };

      // Add default pricing if provided
      if (defaultPricePerYard) {
        clientData.defaultPricePerYard = parseFloat(defaultPricePerYard);
      }
      if (defaultSetupCharge) {
        clientData.defaultSetupCharge = parseFloat(defaultSetupCharge);
      }

      // Add billing info if provided
      if (billingName.trim()) clientData.billingName = billingName.trim();
      if (billingAddress.trim()) clientData.billingAddress = billingAddress.trim();
      if (billingCity.trim()) clientData.billingCity = billingCity.trim();
      if (billingState.trim()) clientData.billingState = billingState.trim();
      if (billingZip.trim()) clientData.billingZip = billingZip.trim();
      if (billingEmail.trim()) clientData.billingEmail = billingEmail.trim();
      if (billingPhone.trim()) clientData.billingPhone = billingPhone.trim();
      if (billingPO.trim()) clientData.billingPO = billingPO.trim();

      if (isEditing && editingClient) {
        // Update existing client
        const clientRef = doc(db, 'users', user!.uid, 'clients', editingClient.id);
        await updateDoc(clientRef, clientData);
        Alert.alert('Success', 'Client updated successfully');
      } else {
        // Create new client
        const clientsRef = collection(db, 'users', user!.uid, 'clients');
        await addDoc(clientsRef, {
          ...clientData,
          createdAt: new Date().toISOString(),
        });
        Alert.alert('Success', 'Client added successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving client:', error);
      Alert.alert('Error', 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <LinearGradient
        colors={gradients.accent}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {isEditing ? '✏️ Edit Client' : '➕ Add New Client'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {addresses.length} saved address{addresses.length !== 1 ? 'es' : ''}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <TextInput
            label="Client Name *"
            value={clientName}
            onChangeText={setClientName}
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>🔒 Private (hide contact info from employees)</Text>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              color={Colors.primary}
            />
          </View>

          <TextInput
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Default Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Pricing</Text>
          <Text style={styles.sectionSubtitle}>
            Used for all jobs at this client (can be overridden per address)
          </Text>

          <TextInput
            label="Price Per Yard ($)"
            value={defaultPricePerYard}
            onChangeText={setDefaultPricePerYard}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Setup Charge ($)"
            value={defaultSetupCharge}
            onChangeText={setDefaultSetupCharge}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Billing Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Billing Information</Text>
          <Text style={styles.sectionSubtitle}>For invoices</Text>

          <TextInput
            label="Billing Name"
            value={billingName}
            onChangeText={setBillingName}
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Billing Address"
            value={billingAddress}
            onChangeText={setBillingAddress}
            mode="outlined"
            style={styles.input}
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
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Billing Phone"
            value={billingPhone}
            onChangeText={setBillingPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="PO Number"
            value={billingPO}
            onChangeText={setBillingPO}
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Addresses */}
        <View style={styles.section}>
          <View style={styles.addressHeader}>
            <Text style={styles.sectionTitle}>📍 Saved Addresses</Text>
            <Chip
              icon="plus"
              onPress={() => setShowAddressForm(!showAddressForm)}
              style={styles.addAddressChip}
            >
              {showAddressForm ? 'Cancel' : 'Add Address'}
            </Chip>
          </View>

          {showAddressForm && (
            <Card style={styles.addressFormCard}>
              <Card.Content>
                <TextInput
                  label="Address Label (e.g. Main, Warehouse) *"
                  value={addressLabel}
                  onChangeText={setAddressLabel}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="Street Address *"
                  value={address}
                  onChangeText={setAddress}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={setCity}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <Text style={styles.pricingLabel}>Custom Pricing (optional)</Text>

                <TextInput
                  label="Price Per Yard"
                  value={pricePerYard}
                  onChangeText={setPricePerYard}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="Setup Charge"
                  value={setupCharge}
                  onChangeText={setSetupCharge}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <View style={styles.addressFormButtons}>
                  <Button
                    mode="contained"
                    onPress={handleAddAddress}
                    style={styles.addButton}
                    buttonColor={Colors.success}
                    icon="check"
                  >
                    {editingAddressIndex !== null ? 'Update' : 'Add'}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={resetAddressForm}
                    style={styles.cancelButton}
                    textColor={Colors.primary}
                  >
                    Cancel
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          {addresses.length === 0 ? (
            <Text style={styles.noAddressesText}>No addresses saved yet</Text>
          ) : (
            addresses.map((addr, index) => (
              <Card key={addr.id} style={styles.addressCard}>
                <Card.Content>
                  <View style={styles.addressCardHeader}>
                    <View>
                      <Chip mode="outlined" compact style={styles.addressChip}>
                        {addr.label}
                      </Chip>
                      <Text style={styles.addressCardText}>{addr.address}</Text>
                      <Text style={styles.addressCardText}>{addr.city}</Text>
                      {(addr.pricePerYard || addr.setupCharge) && (
                        <Text style={styles.customPricing}>
                          ${addr.pricePerYard || '—'}/yd • ${addr.setupCharge || '—'} setup
                        </Text>
                      )}
                    </View>
                    <View style={styles.addressActions}>
                      <IconButton
                        icon="pencil"
                        size={20}
                        onPress={() => handleEditAddress(index)}
                        iconColor={Colors.primary}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        iconColor={Colors.error}
                        onPress={() => handleDeleteAddress(index)}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={isSaving}
          disabled={isSaving}
          buttonColor={Colors.accent}
          icon={isEditing ? 'check' : 'content-save'}
        >
          {isEditing ? 'Update Client' : 'Save Client'}
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
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.infoBg,
    borderRadius: BorderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  divider: {
    marginVertical: Spacing.lg,
    backgroundColor: Colors.borderLight,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addAddressChip: {
    backgroundColor: Colors.primary,
  },
  addressFormCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.infoBg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  pricingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  addressFormButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  addButton: {
    flex: 1,
    borderRadius: BorderRadius.medium,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BorderRadius.medium,
  },
  noAddressesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  addressCard: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.small,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressChip: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
    backgroundColor: Colors.surface,
    borderColor: Colors.accent,
  },
  addressCardText: {
    fontSize: 14,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  customPricing: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  addressActions: {
    flexDirection: 'row',
  },
  saveButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
}));