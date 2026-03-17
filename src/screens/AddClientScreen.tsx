// src/screens/AddClientScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Divider,
  IconButton,
  Card,
  Switch,
  Chip
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Client, ClientAddress } from '../types';
import { 
  getFirestore, 
  doc, 
  setDoc
} from 'firebase/firestore';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const db = getFirestore();

export default function AddClientScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  const editingClient = (route.params as any)?.client as Client | undefined;
  const isEditing = !!editingClient;

  const [name, setName] = useState(editingClient?.name || '');
  const [phone, setPhone] = useState(editingClient?.phone || '');
  const [email, setEmail] = useState(editingClient?.email || '');
  const [defaultPricePerYard, setDefaultPricePerYard] = useState(
    editingClient?.defaultPricePerYard?.toString() || ''
  );
  const [defaultSetupCharge, setDefaultSetupCharge] = useState(
    editingClient?.defaultSetupCharge?.toString() || ''
  );
  const [notes, setNotes] = useState(editingClient?.notes || '');
  const [isPrivate, setIsPrivate] = useState(editingClient?.isPrivate || false);
  
  const [addresses, setAddresses] = useState<ClientAddress[]>(
    editingClient?.addresses || []
  );
  
  const [isSaving, setIsSaving] = useState(false);

  const handleAddAddress = () => {
    const newAddress: ClientAddress = {
      id: `addr_${Date.now()}`,
      label: '',
      address: '',
      city: '',
    };
    setAddresses([...addresses, newAddress]);
  };

  const handleUpdateAddress = (index: number, field: keyof ClientAddress, value: string | number) => {
    const updated = [...addresses];
    (updated[index] as any)[field] = value;
    setAddresses(updated);
  };

  const handleRemoveAddress = (index: number) => {
    Alert.alert(
      'Remove Address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updated = addresses.filter((_, i) => i !== index);
            setAddresses(updated);
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter a client name');
      return;
    }

    if (addresses.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one address');
      return;
    }

    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      if (!addr.label.trim()) {
        Alert.alert('Invalid Address', `Address ${i + 1} needs a label (e.g., "Main Office")`);
        return;
      }
      if (!addr.address.trim()) {
        Alert.alert('Invalid Address', `Address ${i + 1} needs a street address`);
        return;
      }
      if (!addr.city.trim()) {
        Alert.alert('Invalid Address', `Address ${i + 1} needs a city`);
        return;
      }
    }

    try {
      setIsSaving(true);

      const clientId = editingClient?.id || `client_${Date.now()}`;
      
      const clientData: Partial<Client> = {
        name: name.trim(),
        addresses: addresses.map(addr => ({
          ...addr,
          label: addr.label.trim(),
          address: addr.address.trim(),
          city: addr.city.trim(),
        })),
        isPrivate: isPrivate,
        updatedAt: new Date().toISOString(),
      };

      if (phone.trim()) clientData.phone = phone.trim();
      if (email.trim()) clientData.email = email.trim();
      if (defaultPricePerYard.trim()) {
        clientData.defaultPricePerYard = parseFloat(defaultPricePerYard);
      }
      if (defaultSetupCharge.trim()) {
        clientData.defaultSetupCharge = parseFloat(defaultSetupCharge);
      }
      if (notes.trim()) clientData.notes = notes.trim();

      if (!isEditing) {
        clientData.createdAt = new Date().toISOString();
      }

      await setDoc(
        doc(db, 'users', user!.uid, 'clients', clientId),
        clientData,
        { merge: true }
      );

      Alert.alert(
        'Success',
        `Client ${isEditing ? 'updated' : 'added'} successfully`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving client:', error);
      Alert.alert('Error', 'Failed to save client');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.accent, Colors.accentDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>
          {isEditing ? '✏️ Edit Client' : '➕ Add New Client'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <TextInput
            label="Client/Company Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Phone (Optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="phone" iconColor={Colors.primary} />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Email (Optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="email" iconColor={Colors.primary} />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          {/* Privacy Toggle */}
          <View style={styles.privacyRow}>
            <View style={styles.privacyContent}>
              <Text style={styles.privacyLabel}>🔒 Private Client</Text>
              <Text style={styles.privacySubtext}>
                Employees can see name and addresses, but not contact info or notes
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              color={Colors.primary}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Default Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Pricing (Optional)</Text>
          <Text style={styles.subtitle}>
            These rates will be used if an address doesn't have custom pricing
          </Text>

          <TextInput
            label="Default Price Per Yard ($)"
            value={defaultPricePerYard}
            onChangeText={setDefaultPricePerYard}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="currency-usd" />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />

          <TextInput
            label="Default Setup Charge ($)"
            value={defaultSetupCharge}
            onChangeText={setDefaultSetupCharge}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="truck" />}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        <Divider style={styles.divider} />

        {/* Addresses */}
        <View style={styles.section}>
          <View style={styles.addressesHeader}>
            <Text style={styles.sectionTitle}>Addresses</Text>
            <Button
              mode="outlined"
              icon="plus"
              onPress={handleAddAddress}
              compact
              textColor={Colors.primary}
              style={styles.addAddressButton}
            >
              Add Address
            </Button>
          </View>

          {addresses.length === 0 && (
            <Text style={styles.noAddresses}>No addresses yet. Add at least one.</Text>
          )}

          {addresses.map((addr, index) => (
            <Card key={addr.id} style={styles.addressCard}>
              <Card.Content>
                <View style={styles.addressCardHeader}>
                  <Chip mode="flat" style={styles.addressNumber}>
                    Address {index + 1}
                  </Chip>
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={Colors.error}
                    onPress={() => handleRemoveAddress(index)}
                  />
                </View>

                <TextInput
                  label="Label (e.g., Main Office) *"
                  value={addr.label}
                  onChangeText={(value) => handleUpdateAddress(index, 'label', value)}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="Street Address *"
                  value={addr.address}
                  onChangeText={(value) => handleUpdateAddress(index, 'address', value)}
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="map-marker" iconColor={Colors.primary} />}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="City *"
                  value={addr.city}
                  onChangeText={(value) => handleUpdateAddress(index, 'city', value)}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <Text style={styles.customPricingLabel}>
                  💰 Custom Pricing (Optional - overrides client defaults)
                </Text>

                <TextInput
                  label="Price Per Yard ($)"
                  value={addr.pricePerYard?.toString() || ''}
                  onChangeText={(value) => handleUpdateAddress(index, 'pricePerYard', value ? parseFloat(value) : '')}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="currency-usd" />}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />

                <TextInput
                  label="Setup Charge ($)"
                  value={addr.setupCharge?.toString() || ''}
                  onChangeText={(value) => handleUpdateAddress(index, 'setupCharge', value ? parseFloat(value) : '')}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="truck" />}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                />
              </Card.Content>
            </Card>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Notes */}
        <TextInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="e.g., Call 30min before arrival, Gate code: 1234"
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
          {isEditing ? 'Update Client' : 'Save Client'}
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
  },
  content: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },
  input: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  divider: {
    marginVertical: Spacing.lg,
    backgroundColor: Colors.borderLight,
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  privacyContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.text,
  },
  privacySubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  addressesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addAddressButton: {
    borderColor: Colors.primary,
  },
  noAddresses: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  addressCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.large,
    ...Shadows.small,
  },
  addressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addressNumber: {
    backgroundColor: Colors.primary,
  },
  customPricingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.info,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  saveButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
});