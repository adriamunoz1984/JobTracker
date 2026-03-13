// src/screens/AddClientScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Title, 
  Divider,
  IconButton,
  Card
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Client, ClientAddress } from '../types';
import { 
  getFirestore, 
  doc, 
  setDoc
} from 'firebase/firestore';

const db = getFirestore();

export default function AddClientScreen() {
  const [isPrivate, setIsPrivate] = useState(editingClient?.isPrivate || false);
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  const editingClient = (route.params as any)?.client as Client | undefined;
  const isEditing = !!editingClient;

  // Client info
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
  
  // Addresses
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
    // Validation
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please enter a client name');
      return;
    }

    if (addresses.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one address');
      return;
    }

    // Validate addresses
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
        isPrivate: isPrivate, // Add this
        updatedAt: new Date().toISOString(),
      };

      // Optional fields
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
      
      <View style={styles.inputContainer}>
        <Title>{isEditing ? 'Edit Client' : 'Add New Client'}</Title>

        {/* Basic Info */}
        <Text style={styles.sectionTitle}>Client Information</Text>
        
        <TextInput
          label="Client/Company Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />
        {/* Privacy Toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>Private Client</Text>
            <Text style={styles.switchSubtext}>
              Employees can see name and addresses, but not contact info or notes
            </Text>
          </View>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
          />
        </View>
        <TextInput
          label="Phone (Optional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Email (Optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          mode="outlined"
          style={styles.input}
        />

        <Divider style={styles.divider} />

        {/* Default Pricing */}
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
        />

        <TextInput
          label="Default Setup Charge ($)"
          value={defaultSetupCharge}
          onChangeText={setDefaultSetupCharge}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
          left={<TextInput.Icon icon="currency-usd" />}
        />

        <Divider style={styles.divider} />

        {/* Addresses */}
        <View style={styles.addressesHeader}>
          <Text style={styles.sectionTitle}>Addresses</Text>
          <Button
            mode="outlined"
            icon="plus"
            onPress={handleAddAddress}
            compact
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
              <View style={styles.addressHeader}>
                <Text style={styles.addressNumber}>Address {index + 1}</Text>
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#F44336"
                  onPress={() => handleRemoveAddress(index)}
                />
              </View>

              <TextInput
                label="Label (e.g., Main Office) *"
                value={addr.label}
                onChangeText={(value) => handleUpdateAddress(index, 'label', value)}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Street Address *"
                value={addr.address}
                onChangeText={(value) => handleUpdateAddress(index, 'address', value)}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="City *"
                value={addr.city}
                onChangeText={(value) => handleUpdateAddress(index, 'city', value)}
                mode="outlined"
                style={styles.input}
              />

              <Text style={styles.customPricingLabel}>
                Custom Pricing (Optional - overrides client defaults)
              </Text>

              <TextInput
                label="Price Per Yard ($)"
                value={addr.pricePerYard?.toString() || ''}
                onChangeText={(value) => handleUpdateAddress(index, 'pricePerYard', value ? parseFloat(value) : '')}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />

              <TextInput
                label="Setup Charge ($)"
                value={addr.setupCharge?.toString() || ''}
                onChangeText={(value) => handleUpdateAddress(index, 'setupCharge', value ? parseFloat(value) : '')}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />
            </Card.Content>
          </Card>
        ))}

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
        />

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
          loading={isSaving}
          disabled={isSaving}
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
    backgroundColor: '#f5f5f5',
  },
  inputContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  divider: {
    marginVertical: 16,
  },
  addressesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  noAddresses: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  addressCard: {
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  customPricingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginTop: 8,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 32,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
  },

  switchRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  backgroundColor: 'white',
  borderRadius: 8,
  marginVertical: 8,
},
switchContent: {
  flex: 1,
  marginRight: 16,
},
switchLabel: {
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 4,
},
switchSubtext: {
  fontSize: 12,
  color: '#666',
},
});