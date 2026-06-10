// src/screens/InvoiceListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { 
  Card, 
  Text, 
  FAB,
  Chip,
  Searchbar,
  Divider
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Invoice } from '../types';
import { format } from 'date-fns';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

export default function InvoiceListScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invoiceData: Invoice[] = [];
      snapshot.forEach((doc) => {
        invoiceData.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(invoiceData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredInvoices = searchQuery
    ? invoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : invoices;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'sent': return Colors.info;
      case 'overdue': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const handleCreateInvoice = () => {
    (navigation as any).navigate('Invoice');
  };

  const handleInvoicePress = (invoice: Invoice) => {
    (navigation as any).navigate('InvoiceDetail', { invoice });
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity 
      onPress={() => handleInvoicePress(item)}
      activeOpacity={0.7}
    >
      <Card style={styles.invoiceCard}>
        <Card.Content>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
              <Text style={styles.clientName}>{item.clientName}</Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>${item.total.toFixed(2)}</Text>
              <Chip 
                mode="flat" 
                style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
                textStyle={{ color: getStatusColor(item.status) }}
              >
                {item.status}
              </Chip>
            </View>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.invoiceDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Issued:</Text>
              <Text style={styles.value}>{format(new Date(item.date), 'MMM d, yyyy')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Due:</Text>
              <Text style={styles.value}>{format(new Date(item.dueDate), 'MMM d, yyyy')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Jobs:</Text>
              <Text style={styles.value}>{item.jobIds.length}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search invoices..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {filteredInvoices.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>📄 No invoices yet</Text>
          <Text style={styles.emptySubtext}>
            Create invoices from the Reports screen
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          renderItem={renderInvoice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB
        icon="plus"
        label="New Invoice"
        style={styles.fab}
        onPress={handleCreateInvoice}
        color={Colors.textInverse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    margin: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  invoiceCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    color: Colors.text,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statusChip: {
    height: 32,
  },
  divider: {
    marginVertical: Spacing.md,
  },
  invoiceDetails: {
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: Spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
  },
});