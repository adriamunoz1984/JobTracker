// src/screens/JobDetailScreen.tsx
import { collection, query, where, getDocs, getFirestore, deleteDoc, doc } from 'firebase/firestore';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import { Card, Text, Button, Divider, Chip, IconButton } from 'react-native-paper';
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
  const { job: initialJob } = route.params as { job: Job };
  const { deleteJob, updateJob } = useJobs();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode state
  const [editedJob, setEditedJob] = useState<Job>(initialJob);

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      await updateJob(editedJob);
      Alert.alert('Success', 'Job updated successfully');
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating job:', error);
      Alert.alert('Error', 'Failed to update job');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedJob(initialJob);
    setIsEditMode(false);
  };

  const handleGenerateInvoice = async () => {
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('createdBy', '==', user!.uid),
        where('jobIds', 'array-contains', initialJob.id)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
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
                (navigation as any).navigate('Invoice', { jobs: [initialJob] });
              }
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        (navigation as any).navigate('Invoice', { jobs: [initialJob] });
      }
    } catch (error) {
      console.error('Error checking invoice:', error);
      (navigation as any).navigate('Invoice', { jobs: [initialJob] });
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
              await deleteJob(initialJob.id);
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

  const currentJob = isEditMode ? editedJob : initialJob;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>📋 Job Details</Text>
          <IconButton
            icon={isEditMode ? 'close' : 'pencil'}
            size={28}
            iconColor={Colors.textInverse}
            onPress={() => isEditMode ? handleCancel() : setIsEditMode(true)}
          />
        </View>
        <Text style={styles.headerSubtitle}>
          {format(new Date(initialJob.date), 'MMMM dd, yyyy')}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Basic Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Job Information</Text>
            <Divider style={styles.divider} />

            {isEditMode ? (
              <>
                <Text style={styles.editLabel}>Client Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedJob.clientName || ''}
                  onChangeText={(text) => setEditedJob({...editedJob, clientName: text})}
                  placeholder="Client name"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.editLabel}>Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedJob.address}
                  onChangeText={(text) => setEditedJob({...editedJob, address: text})}
                  placeholder="Address"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.editLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedJob.city}
                  onChangeText={(text) => setEditedJob({...editedJob, city: text})}
                  placeholder="City"
                  placeholderTextColor={Colors.textSecondary}
                />

                <Text style={styles.editLabel}>Yards</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedJob.yards.toString()}
                  onChangeText={(text) => setEditedJob({...editedJob, yards: parseFloat(text) || 0})}
                  placeholder="Yards"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textSecondary}
                />
              </>
            ) : (
              <>
                {currentJob.clientName && (
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md }}>
                    {currentJob.clientName}
                  </Text>
                )}

                <Text style={{ fontSize: 14, color: Colors.text, marginBottom: Spacing.xs }}>
                  {currentJob.address}
                </Text>
                
                <Text style={{ fontSize: 14, color: Colors.text, marginBottom: Spacing.md }}>
                  {currentJob.city}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.label}>Yards:</Text>
                  <Text style={styles.value}>{currentJob.yards}</Text>
                </View>

                {currentJob.isFlatRate && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Rate:</Text>
                    <Chip mode="flat" icon="check" style={{ backgroundColor: Colors.warning + '20' }}>
                      Flat Rate
                    </Chip>
                  </View>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Pricing */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Pricing</Text>
            <Divider style={styles.divider} />

            {isEditMode ? (
              <>
                {!editedJob.isFlatRate && (
                  <>
                    <Text style={styles.editLabel}>Amount per Yard</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editedJob.amountPerYard?.toString() || ''}
                      onChangeText={(text) => setEditedJob({...editedJob, amountPerYard: parseFloat(text) || 0})}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textSecondary}
                    />

                    <Text style={styles.editLabel}>Setup Charge</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editedJob.setupCharge?.toString() || ''}
                      onChangeText={(text) => setEditedJob({...editedJob, setupCharge: parseFloat(text) || 0})}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </>
                )}

                <Text style={styles.editLabel}>Total Amount</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedJob.amount.toString()}
                  onChangeText={(text) => setEditedJob({...editedJob, amount: parseFloat(text) || 0})}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={Colors.textSecondary}
                />
              </>
            ) : (
              <>
                {!currentJob.isFlatRate && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>Amount per Yard:</Text>
                      <Text style={styles.value}>${currentJob.amountPerYard?.toFixed(2)}</Text>
                    </View>

                    <View style={styles.row}>
                      <Text style={styles.label}>Setup Charge:</Text>
                      <Text style={styles.value}>${currentJob.setupCharge?.toFixed(2)}</Text>
                    </View>
                  </>
                )}

                <Divider style={styles.divider} />

                <View style={[styles.row, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>${currentJob.amount.toFixed(2)}</Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Payment */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Payment</Text>
            <Divider style={styles.divider} />

            {isEditMode ? (
              <>
                <Text style={styles.editLabel}>Payment Method</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedJob.paymentMethod}
                  onChangeText={(text) => setEditedJob({...editedJob, paymentMethod: text as any})}
                  placeholder="Payment method"
                  placeholderTextColor={Colors.textSecondary}
                />

                {editedJob.paymentMethod === 'Check' && (
                  <>
                    <Text style={styles.editLabel}>Check Number</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editedJob.checkNumber || ''}
                      onChangeText={(text) => setEditedJob({...editedJob, checkNumber: text})}
                      placeholder="Check #"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </>
                )}

                {editedJob.paymentMethod === 'Zelle' && (
                  <>
                    <Text style={styles.editLabel}>Zelle Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editedJob.zelleName || ''}
                      onChangeText={(text) => setEditedJob({...editedJob, zelleName: text})}
                      placeholder="Zelle name"
                      placeholderTextColor={Colors.textSecondary}
                    />

                    <Text style={styles.editLabel}>Zelle Phone</Text>
                    <TextInput
                      style={styles.textInput}
                      value={editedJob.zellePhone || ''}
                      onChangeText={(text) => setEditedJob({...editedJob, zellePhone: text})}
                      placeholder="Zelle phone"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Method:</Text>
                  <Chip mode="flat">
                    {getPaymentIcon(currentJob.paymentMethod)} {currentJob.paymentMethod}
                  </Chip>
                </View>

                {currentJob.checkNumber && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Check #:</Text>
                    <Text style={styles.value}>{currentJob.checkNumber}</Text>
                  </View>
                )}

                {currentJob.zelleName && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>Zelle Name:</Text>
                      <Text style={styles.value}>{currentJob.zelleName}</Text>
                    </View>
                    {currentJob.zellePhone && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Zelle Phone:</Text>
                        <Text style={styles.value}>{currentJob.zellePhone}</Text>
                      </View>
                    )}
                  </>
                )}

                <View style={styles.row}>
                  <Text style={styles.label}>Paid to Me:</Text>
                  <Chip mode="flat" icon={currentJob.isPaidToMe ? 'check' : 'close'}>
                    {currentJob.isPaidToMe ? 'Yes' : 'No'}
                  </Chip>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Billing Info */}
        {currentJob.useDifferentBilling && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>💳 Billing Information</Text>
              <Divider style={styles.divider} />

              {isEditMode ? (
                <>
                  {currentJob.billingName && (
                    <>
                      <Text style={styles.editLabel}>Billing Name</Text>
                      <TextInput
                        style={styles.textInput}
                        value={currentJob.billingName}
                        onChangeText={(text) => setEditedJob({...editedJob, billingName: text})}
                        placeholder="Billing name"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </>
                  )}

                  {currentJob.billingAddress && (
                    <>
                      <Text style={styles.editLabel}>Billing Address</Text>
                      <TextInput
                        style={styles.textInput}
                        value={currentJob.billingAddress}
                        onChangeText={(text) => setEditedJob({...editedJob, billingAddress: text})}
                        placeholder="Billing address"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </>
                  )}

                  {currentJob.billingCity && (
                    <>
                      <Text style={styles.editLabel}>Billing City</Text>
                      <TextInput
                        style={styles.textInput}
                        value={currentJob.billingCity}
                        onChangeText={(text) => setEditedJob({...editedJob, billingCity: text})}
                        placeholder="City"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </>
                  )}

                  {currentJob.billingEmail && (
                    <>
                      <Text style={styles.editLabel}>Billing Email</Text>
                      <TextInput
                        style={styles.textInput}
                        value={currentJob.billingEmail}
                        onChangeText={(text) => setEditedJob({...editedJob, billingEmail: text})}
                        placeholder="Email"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </>
                  )}

                  {currentJob.billingPO && (
                    <>
                      <Text style={styles.editLabel}>PO Number</Text>
                      <TextInput
                        style={styles.textInput}
                        value={currentJob.billingPO}
                        onChangeText={(text) => setEditedJob({...editedJob, billingPO: text})}
                        placeholder="PO #"
                        placeholderTextColor={Colors.textSecondary}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {currentJob.billingName && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Name:</Text>
                      <Text style={styles.value}>{currentJob.billingName}</Text>
                    </View>
                  )}

                  {currentJob.billingAddress && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Address:</Text>
                      <Text style={styles.value}>{currentJob.billingAddress}</Text>
                    </View>
                  )}

                  {currentJob.billingCity && (
                    <View style={styles.row}>
                      <Text style={styles.label}>City:</Text>
                      <Text style={styles.value}>{currentJob.billingCity}, {currentJob.billingState} {currentJob.billingZip}</Text>
                    </View>
                  )}

                  {currentJob.billingEmail && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Email:</Text>
                      <Text style={styles.value}>{currentJob.billingEmail}</Text>
                    </View>
                  )}

                  {currentJob.billingPhone && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Phone:</Text>
                      <Text style={styles.value}>{currentJob.billingPhone}</Text>
                    </View>
                  )}

                  {currentJob.billingPO && (
                    <View style={styles.row}>
                      <Text style={styles.label}>PO #:</Text>
                      <Text style={styles.value}>{currentJob.billingPO}</Text>
                    </View>
                  )}
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Notes */}
        {!isEditMode && currentJob.notes && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
              <Divider style={styles.divider} />
              <Text style={styles.notesText}>{currentJob.notes}</Text>
            </Card.Content>
          </Card>
        )}

        {isEditMode && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
              <Divider style={styles.divider} />
              <TextInput
                style={[styles.textInput, { minHeight: 100 }]}
                value={editedJob.notes || ''}
                onChangeText={(text) => setEditedJob({...editedJob, notes: text})}
                placeholder="Add notes..."
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={4}
              />
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isEditMode ? (
            <>
              <Button
                mode="contained"
                onPress={handleSaveChanges}
                loading={isSaving}
                disabled={isSaving}
                style={styles.button}
                icon="check"
                buttonColor={Colors.success}
              >
                Save Changes
              </Button>

              <Button
                mode="outlined"
                onPress={handleCancel}
                style={styles.button}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
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
                onPress={() => setIsEditMode(true)}
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
            </>
          )}
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
  header: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    ...Shadows.medium,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
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
  editLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
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