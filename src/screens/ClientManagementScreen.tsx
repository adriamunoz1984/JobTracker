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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { 
  getFirestore, 
  collection, 
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

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
      <LinearGradient
        colors={[Colors.accent, Colors.accentDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🏢 Client Management</Text>
        <Text style={styles.headerSubtitle}>
          {clients.length} client{clients.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading clients...</Text>
          </View>
        ) : clients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.emptyTitle}>No Clients Yet</Text>
              <Paragraph style={styles.emptyText}>
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
                    <Text variant="titleLarge" style={styles.clientName}>{client.name}</Text>
                    
                    {client.isPrivate && user?.role === 'owner' && (
                      <Chip 
                        icon="lock" 
                        mode="outlined" 
                        compact
                        style={styles.privateChip}
                        textStyle={styles.privateChipText}
                      >
                        Private
                      </Chip>
                    )}
                    
                    {(!client.isPrivate || user?.role === 'owner') && (
                      <>
                        {client.phone && (
                          <View style={styles.contactRow}>
                            <IconButton icon="phone" size={16} iconColor={Colors.primary} style={styles.contactIcon} />
                            <Text style={styles.contactText}>{client.phone}</Text>
                          </View>
                        )}
                        {client.email && (
                          <View style={styles.contactRow}>
                            <IconButton icon="email" size={16} iconColor={Colors.primary} style={styles.contactIcon} />
                            <Text style={styles.contactText}>{client.email}</Text>
                          </View>
                        )}
                      </>
                    )}
                    
                    {client.isPrivate && user?.role === 'employee' && (
                      <Text style={styles.privateNote}>🔒 Contact info private</Text>
                    )}
                  </View>
                  
                  <View style={styles.actions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleEditClient(client)}
                      iconColor={Colors.primary}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor={Colors.error}
                      onPress={() => handleDeleteClient(client)}
                    />
                  </View>
                </View>

                <Divider style={styles.divider} />

                {/* Default Pricing */}
                {(client.defaultPricePerYard || client.defaultSetupCharge) && (
                  <View style={styles.pricingSection}>
                    <Text style={styles.sectionLabel}>Default Pricing:</Text>
                    <View style={styles.pricingRow}>
                      {client.defaultPricePerYard && (
                        <Chip 
                          icon="currency-usd" 
                          compact
                          style={styles.pricingChip}
                        >
                          ${client.defaultPricePerYard}/yard
                        </Chip>
                      )}
                      {client.defaultSetupCharge && (
                        <Chip 
                          icon="truck" 
                          compact
                          style={styles.pricingChip}
                        >
                          ${client.defaultSetupCharge} setup
                        </Chip>
                      )}
                    </View>
                  </View>
                )}

                {/* Addresses */}
                <View style={styles.addressSection}>
                  <Text style={styles.sectionLabel}>
                    📍 Saved Addresses ({client.addresses.length}):
                  </Text>
                  {client.addresses.map((addr) => (
                    <View key={addr.id} style={styles.addressItem}>
                      <View style={styles.addressHeader}>
                        <Chip mode="outlined" compact style={styles.addressChip}>
                          {addr.label}
                        </Chip>
                        {(addr.pricePerYard || addr.setupCharge) && (
                          <IconButton icon="currency-usd" size={16} iconColor={Colors.info} />
                        )}
                      </View>
                      <Text style={styles.addressText}>
                        {addr.address}, {addr.city}
                      </Text>
                      {(addr.pricePerYard || addr.setupCharge) && (
                        <Text style={styles.customPricing}>
                          Custom: ${addr.pricePerYard || '—'}/yd • ${addr.setupCharge || '—'} setup
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                {/* Notes */}
                {client.notes && (!client.isPrivate || user?.role === 'owner') && (
                  <>
                    <Divider style={styles.divider} />
                    <Text style={styles.notesLabel}>📝 Notes:</Text>
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
        color={Colors.textInverse}
        onPress={() => navigation.navigate('AddClient' as never)}
      />
    </View>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.large,
    ...Shadows.medium,
  },
  emptyTitle: {
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  emptyText: {
    color: Colors.textSecondary,
  },
  clientCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.large,
    ...Shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    marginBottom: Spacing.xs,
    color: Colors.text,
    fontWeight: 'bold',
  },
  privateChip: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warning,
  },
  privateChipText: {
    color: Colors.warning,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  contactIcon: {
    margin: 0,
    marginRight: -8,
  },
  contactText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  privateNote: {
    fontSize: 12,
    color: Colors.warning,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
  },
  divider: {
    marginVertical: Spacing.md,
    backgroundColor: Colors.borderLight,
  },
  pricingSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  pricingChip: {
    backgroundColor: Colors.successBg,
  },
  addressSection: {
    marginTop: Spacing.sm,
  },
  addressItem: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderRadius: BorderRadius.medium,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  addressChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  addressText: {
    fontSize: 14,
    marginTop: Spacing.xs,
    color: Colors.text,
  },
  customPricing: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.text,
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: Spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    ...Shadows.large,
  },
});