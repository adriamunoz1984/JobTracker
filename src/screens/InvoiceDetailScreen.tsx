// src/screens/InvoiceDetailScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Divider,
  Chip,
  SegmentedButtons,
  TextInput
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Invoice, InvoiceLineItem } from '../types';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  doc, 
  updateDoc, 
  deleteDoc,
  getFirestore 
} from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Spacing, BorderRadius, Shadows } from '../theme/colors';
import { useAppTheme, makeStyles } from '../theme';
import InvoicePaperPreview from '../components/InvoicePaperPreview';
import { buildConcretePumpInvoiceHtml } from '../utils/invoiceTemplate';

const db = getFirestore();

export default function InvoiceDetailScreen() {
  const { colors: Colors, gradients } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const route = useRoute();
  const { invoice: initialInvoice } = route.params as { invoice: Invoice };
  const { user } = useAuth();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit state
  const [clientName, setClientName] = useState(initialInvoice.clientName);
  const [clientEmail, setClientEmail] = useState(initialInvoice.clientEmail || '');
  const [clientPhone, setClientPhone] = useState(initialInvoice.clientPhone || '');
  const [clientAddress, setClientAddress] = useState(initialInvoice.clientAddress || '');
  const [dueDate, setDueDate] = useState(initialInvoice.dueDate);
  const [terms, setTerms] = useState(initialInvoice.terms || '');
  const [notes, setNotes] = useState(initialInvoice.notes || '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(initialInvoice.lineItems);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'sent': return Colors.info;
      case 'overdue': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const calculateTotals = (items: InvoiceLineItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const tax = Number(initialInvoice.tax || 0);
    return {
      subtotal,
      total: subtotal + tax,
    };
  };

  const buildCurrentInvoice = (): Invoice => {
    const { subtotal, total } = calculateTotals(lineItems);
    return {
      ...initialInvoice,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      clientAddress: clientAddress.trim() || undefined,
      dueDate,
      terms: terms.trim() || undefined,
      notes: notes.trim() || undefined,
      lineItems,
      subtotal,
      total,
      issuerName: initialInvoice.issuerName || user?.displayName || 'Concrete Pumping',
      issuerEmail: initialInvoice.issuerEmail || user?.email || '',
    };
  };

  const handleSaveEdit = async () => {
    try {
      setIsUpdating(true);
      
      const editedInvoice = buildCurrentInvoice();
      const renderedHtml = buildConcretePumpInvoiceHtml(
        editedInvoice,
        editedInvoice.issuerName,
        editedInvoice.issuerEmail
      );
      
      const invoiceRef = doc(db, 'invoices', initialInvoice.id);
      await updateDoc(invoiceRef, {
        clientName: editedInvoice.clientName,
        clientEmail: editedInvoice.clientEmail || '',
        clientPhone: editedInvoice.clientPhone || '',
        clientAddress: editedInvoice.clientAddress || '',
        dueDate: editedInvoice.dueDate,
        terms: editedInvoice.terms || '',
        notes: editedInvoice.notes || '',
        lineItems: editedInvoice.lineItems,
        subtotal: editedInvoice.subtotal,
        total: editedInvoice.total,
        renderedHtml,
        updatedAt: new Date().toISOString(),
      });
      
      Alert.alert('Success', 'Invoice updated');
      setIsEditMode(false);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating invoice:', error);
      Alert.alert('Error', 'Failed to update invoice');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setClientName(initialInvoice.clientName);
    setClientEmail(initialInvoice.clientEmail || '');
    setClientPhone(initialInvoice.clientPhone || '');
    setClientAddress(initialInvoice.clientAddress || '');
    setDueDate(initialInvoice.dueDate);
    setTerms(initialInvoice.terms || '');
    setNotes(initialInvoice.notes || '');
    setLineItems(initialInvoice.lineItems);
    setIsEditMode(false);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updatedItems = [...lineItems];
    if (field === 'amount') {
      updatedItems[index] = {
        ...updatedItems[index],
        amount: parseFloat(value) || 0,
      };
    } else if (field === 'description') {
      updatedItems[index] = {
        ...updatedItems[index],
        description: value,
      };
    }
    setLineItems(updatedItems);
  };

  const updateStatus = async (newStatus: 'draft' | 'sent' | 'paid' | 'overdue') => {
    try {
      setIsUpdating(true);
      const invoiceRef = doc(db, 'invoices', initialInvoice.id);
      
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'sent' && !initialInvoice.sentDate) {
        updateData.sentDate = new Date().toISOString();
      }
      if (newStatus === 'paid' && !initialInvoice.paidDate) {
        updateData.paidDate = new Date().toISOString();
      }
      
      await updateDoc(invoiceRef, updateData);
      
      Alert.alert('Success', `Invoice marked as ${newStatus}`);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update invoice status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice?',
      `Delete invoice ${initialInvoice.invoiceNumber}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const invoiceRef = doc(db, 'invoices', initialInvoice.id);
              await deleteDoc(invoiceRef);
              Alert.alert('Success', 'Invoice deleted');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting invoice:', error);
              Alert.alert('Error', 'Failed to delete invoice');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const generatePDF = async () => {
    const invoiceForRender = buildCurrentInvoice();
    const htmlContent =
      !isEditMode && initialInvoice.renderedHtml
        ? initialInvoice.renderedHtml
        : buildConcretePumpInvoiceHtml(
            invoiceForRender,
            invoiceForRender.issuerName,
            invoiceForRender.issuerEmail
          );

    return await Print.printToFileAsync({ html: htmlContent });
  };

  const handleViewPDF = async () => {
    try {
      const pdfUri = await generatePDF();
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice ${initialInvoice.invoiceNumber}`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleSend = async () => {
    try {
      const pdfUri = await generatePDF();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Send Invoice ${initialInvoice.invoiceNumber}`,
        });
        await updateStatus('sent');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      Alert.alert('Error', 'Failed to send invoice');
    }
  };

  const { subtotal, total } = calculateTotals(lineItems);

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={gradients.primary}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🧾 {initialInvoice.invoiceNumber}</Text>
        <Chip 
          mode="flat" 
          style={[styles.statusChip, { backgroundColor: getStatusColor(initialInvoice.status) + '30' }]}
          textStyle={{ color: getStatusColor(initialInvoice.status), fontWeight: 'bold' }}
        >
          {initialInvoice.status.toUpperCase()}
        </Chip>
      </LinearGradient>

      <View style={styles.content}>
        {!isEditMode && (
          <>
            <Text variant="titleMedium" style={styles.previewTitle}>Stored Invoice Copy</Text>
            <Text style={styles.previewSubtitle}>
              This is the saved invoice layout used for the client copy.
            </Text>
            <InvoicePaperPreview
              invoice={initialInvoice}
              fallbackIssuerName={user?.displayName || 'Concrete Pumping'}
              fallbackIssuerEmail={user?.email || ''}
            />
          </>
        )}

        {/* Client Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {isEditMode ? '✏️ Edit Client Info' : 'Bill To'}
            </Text>
            <Divider style={styles.divider} />

            {isEditMode ? (
              <>
                <TextInput
                  label="Client Name"
                  value={clientName}
                  onChangeText={setClientName}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Address"
                  value={clientAddress}
                  onChangeText={setClientAddress}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Email"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="email-address"
                />
                <TextInput
                  label="Phone"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </>
            ) : (
              <>
                <Text style={styles.clientName}>{clientName}</Text>
                {clientAddress && (
                  <Text style={styles.clientDetail}>{clientAddress}</Text>
                )}
                {clientEmail && (
                  <Text style={styles.clientDetail}>📧 {clientEmail}</Text>
                )}
                {clientPhone && (
                  <Text style={styles.clientDetail}>📞 {clientPhone}</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Invoice Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {isEditMode ? '✏️ Edit Details' : 'Invoice Details'}
            </Text>
            <Divider style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Issued:</Text>
              <Text style={styles.value}>{format(new Date(initialInvoice.date), 'MMM d, yyyy')}</Text>
            </View>

            {isEditMode ? (
              <TextInput
                label="Due Date (YYYY-MM-DD)"
                value={dueDate}
                onChangeText={setDueDate}
                mode="outlined"
                style={styles.input}
              />
            ) : (
              <View style={styles.row}>
                <Text style={styles.label}>Due:</Text>
                <Text style={styles.value}>{format(new Date(dueDate), 'MMM d, yyyy')}</Text>
              </View>
            )}

            {isEditMode ? (
              <TextInput
                label="Terms"
                value={terms}
                onChangeText={setTerms}
                mode="outlined"
                style={styles.input}
                multiline
              />
            ) : (
              terms && (
                <View style={styles.row}>
                  <Text style={styles.label}>Terms:</Text>
                  <Text style={styles.value}>{terms}</Text>
                </View>
              )
            )}

            <View style={styles.row}>
              <Text style={styles.label}>Jobs:</Text>
              <Text style={styles.value}>{initialInvoice.jobIds.length}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Line Items */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {isEditMode ? '✏️ Edit Line Items' : 'Line Items'}
            </Text>
            <Divider style={styles.divider} />

            {lineItems.map((item, index) => (
              <View key={item.id} style={styles.lineItem}>
                {isEditMode ? (
                  <>
                    <TextInput
                      label="Description"
                      value={item.description}
                      onChangeText={(value) => updateLineItem(index, 'description', value)}
                      mode="outlined"
                      style={[styles.input, styles.itemInput]}
                    />
                    <TextInput
                      label="Amount"
                      value={item.amount.toString()}
                      onChangeText={(value) => updateLineItem(index, 'amount', value)}
                      mode="outlined"
                      style={[styles.input, styles.itemInput]}
                      keyboardType="decimal-pad"
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.itemDescription}>{item.description}</Text>
                    <Text style={styles.itemAmount}>${item.amount.toFixed(2)}</Text>
                  </>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Totals */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>Subtotal:</Text>
              <Text style={styles.value}>${subtotal.toFixed(2)}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Notes */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {isEditMode ? '✏️ Edit Notes' : 'Notes'}
            </Text>
            <Divider style={styles.divider} />

            {isEditMode ? (
              <TextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={4}
              />
            ) : (
              notes && <Text style={styles.notesText}>{notes}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Status Update */}
        {!isEditMode && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Update Status</Text>
              <Divider style={styles.divider} />

              <SegmentedButtons
                value={initialInvoice.status}
                onValueChange={(value: any) => updateStatus(value)}
                buttons={[
                  {
                    value: 'draft',
                    label: 'Draft',
                    icon: 'file-document-outline',
                    disabled: isUpdating,
                  },
                  {
                    value: 'sent',
                    label: 'Sent',
                    icon: 'send',
                    disabled: isUpdating,
                  },
                  {
                    value: 'paid',
                    label: 'Paid',
                    icon: 'check-circle',
                    disabled: isUpdating,
                  },
                  {
                    value: 'overdue',
                    label: 'Overdue',
                    icon: 'alert-circle',
                    disabled: isUpdating,
                  },
                ]}
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
                onPress={handleSaveEdit}
                loading={isUpdating}
                disabled={isUpdating}
                style={styles.button}
                icon="content-save"
                buttonColor={Colors.success}
              >
                Save Changes
              </Button>

              <Button
                mode="outlined"
                onPress={handleCancelEdit}
                style={styles.button}
                icon="close"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {initialInvoice.status === 'draft' && (
                <Button
                  mode="contained"
                  onPress={() => setIsEditMode(true)}
                  style={styles.button}
                  icon="pencil"
                  buttonColor={Colors.primary}
                >
                  Edit Draft
                </Button>
              )}

              <Button
                mode="contained"
                onPress={handleViewPDF}
                style={styles.button}
                icon="file-pdf-box"
                buttonColor={Colors.secondary}
              >
                View/Share Exact PDF
              </Button>

              <Button
                mode="contained"
                onPress={handleSend}
                style={styles.button}
                icon="send"
                buttonColor={Colors.success}
              >
                Send Invoice
              </Button>
            </>
          )}

          <Button
            mode="contained"
            onPress={handleDelete}
            loading={isDeleting}
            disabled={isDeleting || isEditMode}
            style={styles.button}
            icon="delete"
            buttonColor={Colors.error}
          >
            Delete Invoice
          </Button>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textInverse,
    flex: 1,
  },
  statusChip: {
    height: 32,
    padding:10
  },
  content: {
    padding: Spacing.md,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
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
  input: {
    marginBottom: Spacing.sm,
  },
  itemInput: {
    marginBottom: Spacing.xs,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  clientDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  lineItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
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
}));