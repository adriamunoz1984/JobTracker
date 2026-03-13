// src/screens/ClientManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Text, 
  IconButton, 
  Chip,
  ActivityIndicator,
  Divider,
  FAB
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';

const db = getFirestore();

export default function ClientManagementScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const loadedClients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Client));

      setClients(loadedClients.sort((a, b) => a.name.localeCompare(b.name)));
      setIsLoading(false);
      console.log(`📋 Loaded ${loadedClients.length} clients`);
    }, (error) => {
      console.error('Error loading clients:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleDeleteClient = (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user!.uid, 'clients', client.id));
              console.log(`✅ Deleted client: ${client.name}`);
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'Failed to delete client');
            }
          }
        }
      ]
    );
  };

  const handleEditClient = (client: Client) => {
    navigation.navigate('AddClient' as never, { client } as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.title}>Client Management</Title>
          <Paragraph style={styles.subtitle}>
            Manage your clients and their saved addresses
          </Paragraph>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading clients...</Text>
          </View>
        ) : clients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Title>No Clients Yet</Title>
              <Paragraph>
                Add your first client to save their information and addresses for quick job entry.
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          clients.map((client) => (
            <Card key={client.id} style={styles.clientCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.clientInfo}>
                  <Title>{client.name}</Title>
                  
                  {/* Show privacy badge */}
                  {client.isPrivate && user?.role === 'owner' && (
                    <Chip icon="lock" mode="outlined" style={styles.privateChip}>
                      Private
                    </Chip>
                  )}
                  
                  {/* Only show contact info if not private, or if user is owner */}
                  {(!client.isPrivate || user?.role === 'owner') && (
                    <>
                      {client.phone && (
                        <Text style={styles.phone}>📞 {client.phone}</Text>
                      )}
                      {client.email && (
                        <Text style={styles.email}>✉️ {client.email}</Text>
                      )}
                    </>
                  )}
                  
                  {/* Show "Contact info hidden" message for private clients */}
                  {client.isPrivate && user?.role === 'employee' && (
                    <Text style={styles.privateNote}>🔒 Contact info private</Text>
                  )}
                </View>
                  <View style={styles.actions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleEditClient(client)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#F44336"
                      onPress={() => handleDeleteClient(client)}
                    />
                  </View>
                </View>

                <Divider style={styles.divider} />

                {/* Default Pricing */}
                {(client.defaultPricePerYard || client.defaultSetupCharge) && (
                  <View style={styles.pricingSection}>
                    <Text style={styles.sectionLabel}>Default Pricing:</Text>
                    {client.defaultPricePerYard && (
                      <Text style={styles.pricingText}>
                        💰 ${client.defaultPricePerYard}/yard
                      </Text>
                    )}
                    {client.defaultSetupCharge && (
                      <Text style={styles.pricingText}>
                        🚚 ${client.defaultSetupCharge} setup
                      </Text>
                    )}
                  </View>
                )}

                {/* Addresses */}
                <View style={styles.addressSection}>
                  <Text style={styles.sectionLabel}>
                    Saved Addresses ({client.addresses.length}):
                  </Text>
                  {client.addresses.map((addr) => (
                    <View key={addr.id} style={styles.addressItem}>
                      <Chip mode="outlined" style={styles.addressChip}>
                        {addr.label}
                      </Chip>
                      <Text style={styles.addressText}>
                        {addr.address}, {addr.city}
                      </Text>
                      {(addr.pricePerYard || addr.setupCharge) && (
                        <Text style={styles.customPricing}>
                          Custom: ${addr.pricePerYard || '—'}/yd, ${addr.setupCharge || '—'} setup
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {/* Notes */}
                {/* Notes - only show if not private or user is owner */}
                {client.notes && (!client.isPrivate || user?.role === 'owner') && (
                  <>
                    <Divider style={styles.divider} />
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notes}>{client.notes}</Text>
                  </>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        label="Add Client"
        style={styles.fab}
        onPress={() => navigation.navigate('AddClient' as never)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  clientCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: {
    flex: 1,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  divider: {
    marginVertical: 12,
  },
  pricingSection: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pricingText: {
    fontSize: 14,
    color: '#2E7D32',
    marginTop: 4,
  },
  addressSection: {
    marginTop: 8,
  },
  addressItem: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  addressChip: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    marginTop: 4,
  },
  customPricing: {
    fontSize: 12,
    color: '#1976D2',
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  privateChip: {
  marginTop: 8,
  alignSelf: 'flex-start',
  backgroundColor: '#FFF3E0',
},
privateNote: {
  fontSize: 12,
  color: '#FF9800',
  fontStyle: 'italic',
  marginTop: 4,
},
});