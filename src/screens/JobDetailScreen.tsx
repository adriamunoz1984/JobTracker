// src/screens/JobDetailScreen.tsx
import { collection, query, where, getDocs,getFirestore,deleteDoc,doc} from 'firebase/firestore';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text,  Button,  Divider, Chip,IconButton} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { Job } from '../types';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadows } from '../theme/colors';

const db = getFirestore();

export default function JobDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { job } = route.params as { job: Job };
  const { deleteJob } = useJobs();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    (navigation as any).navigate('AddJob', { job });
  };

 const handleGenerateInvoice = async () => {
  try {
    // Check if invoice already exists for this job
    const invoicesRef = collection(db, 'invoices');
    const q = query(
      invoicesRef,
      where('createdBy', '==', user!.uid),
      where('jobIds', 'array-contains', job.id)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.docs.length > 0) {
      // Invoice already exists
      const existingInvoice = snapshot.docs[0].data();
      
      Alert.alert(
        'Invoice Already Exists',
        'An invoice has already been created for this job.',
        [
          {
            text: 'View Existing',
            onPress: () => {
              (navigation as any).navigate('InvoiceDetail', {
                invoice: { id: snapshot.docs[0].id, ...existingInvoice }
              });
            }
          },
          {
            text: 'Create New',
            onPress: () => {
              (navigation as any).navigate('Invoice', { jobs: [job] });
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else {
      // No invoice exists, create new
      (navigation as any).navigate('Invoice', { jobs: [job] });
    }
  } catch (error) {
    console.error('Error checking invoice:', error);
    // If there's an error checking, just proceed to create
    (navigation as any).navigate('Invoice', { jobs: [job] });
  }
};

  const handleDelete = () => {
    Alert.alert(
      'Delete Job?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteJob(job.id);
              Alert.alert('Success', 'Job deleted');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting job:', error);
              Alert.alert('Error', 'Failed to delete job');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'Cash': return '💵';
      case 'Check': return '📝';
      case 'Charge': return '📋';
      case 'Zelle': return '📱';
      case 'Card': return '💳';
      default: return '💰';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>📋 Job Details</Text>
        <Text style={styles.headerSubtitle}>
          {format(new Date(job.date), 'MMMM dd, yyyy')}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Basic Info */}
       {/* Basic Info */}
<Card style={styles.card}>
  <Card.Content>
    <Text variant="titleMedium" style={styles.sectionTitle}>Job Information</Text>
    <Divider style={styles.divider} />

    {job.clientName && (
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md }}>
        {job.clientName}
      </Text>
    )}

    <Text style={{ fontSize: 14, color: Colors.text, marginBottom: Spacing.xs }}>
      {job.address}
    </Text>
    
    <Text style={{ fontSize: 14, color: Colors.text, marginBottom: Spacing.md }}>
      {job.city}
    </Text>
    <View style={styles.row}>
      <Text style={styles.label}>Yards:</Text>
      <Text style={styles.value}>{job.yards}</Text>
    </View>

    {job.isFlatRate && (
      <View style={styles.row}>
        <Text style={styles.label}>Rate:</Text>
        <Chip mode="flat" icon="check" style={{ backgroundColor: Colors.warning + '20' }}>
          Flat Rate
        </Chip>
      </View>
    )}
  </Card.Content>
</Card>

        {/* Pricing */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Pricing</Text>
            <Divider style={styles.divider} />

            {!job.isFlatRate && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Amount per Yard:</Text>
                  <Text style={styles.value}>${job.amountPerYard?.toFixed(2)}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Setup Charge:</Text>
                  <Text style={styles.value}>${job.setupCharge?.toFixed(2)}</Text>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            <View style={[styles.row, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${job.amount.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Payment */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Payment</Text>
            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Method:</Text>
              <Chip mode="flat">
                {getPaymentIcon(job.paymentMethod)} {job.paymentMethod}
              </Chip>
            </View>

            {job.checkNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>Check #:</Text>
                <Text style={styles.value}>{job.checkNumber}</Text>
              </View>
            )}

            {job.zelleName && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Zelle Name:</Text>
                  <Text style={styles.value}>{job.zelleName}</Text>
                </View>
                {job.zellePhone && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Zelle Phone:</Text>
                    <Text style={styles.value}>{job.zellePhone}</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Paid to Me:</Text>
              <Chip mode="flat" icon={job.isPaidToMe ? 'check' : 'close'}>
                {job.isPaidToMe ? 'Yes' : 'No'}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Billing Info */}
        {job.useDifferentBilling && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💳 Billing Information</Text>
              <Divider style={styles.divider} />

              {job.billingName && (
                <View style={styles.row}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={styles.value}>{job.billingName}</Text>
                </View>
              )}

              {job.billingAddress && (
                <View style={styles.row}>
                  <Text style={styles.label}>Address:</Text>
                  <Text style={styles.value}>{job.billingAddress}</Text>
                </View>
              )}

              {job.billingCity && (
                <View style={styles.row}>
                  <Text style={styles.label}>City:</Text>
                  <Text style={styles.value}>{job.billingCity}, {job.billingState} {job.billingZip}</Text>
                </View>
              )}

              {job.billingEmail && (
                <View style={styles.row}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{job.billingEmail}</Text>
                </View>
              )}

              {job.billingPhone && (
                <View style={styles.row}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{job.billingPhone}</Text>
                </View>
              )}

              {job.billingPO && (
                <View style={styles.row}>
                  <Text style={styles.label}>PO #:</Text>
                  <Text style={styles.value}>{job.billingPO}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Notes */}
        {job.notes && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
              <Divider style={styles.divider} />
              <Text style={styles.notesText}>{job.notes}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleGenerateInvoice}
            style={styles.button}
            icon="file-document"
            buttonColor={Colors.success}
          >
            Generate Invoice
          </Button>

          <Button
            mode="contained"
            onPress={handleEdit}
            style={styles.button}
            icon="pencil"
          >
            Edit Job
          </Button>

          <Button
            mode="contained"
            onPress={handleDelete}
            loading={isDeleting}
            disabled={isDeleting}
            style={styles.button}
            icon="delete"
            buttonColor={Colors.error}
          >
            Delete Job
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
   clientName: {
  fontSize: 24,  // Increase from 18 to 24
  fontWeight: 'bold',
  color: Colors.text,
  marginBottom: Spacing.xs,
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
  card: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  totalRow: {
    paddingTop: Spacing.md,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actions: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  button: {
    paddingVertical: Spacing.sm,
  },
 
});