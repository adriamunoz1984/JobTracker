import { chooseMapApp } from '../utils/openMap';
// src/screens/InvoiceScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Job, InvoiceLineItem } from '../types';
import { format, addDays, parseISO } from 'date-fns';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { nameExportedPdf } from '../utils/exportFileName';
import { makeStyles } from '../theme';
import { buildConcretePumpInvoiceHtml } from '../utils/invoiceTemplate';

export default function InvoiceScreen() {
  const styles = useStyles();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { jobs = [] } = (route.params as { jobs: Job[] }) || {};

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [rmc, setRmc] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [arriveTime, setArriveTime] = useState('');
  const [startTime, setStartTime] = useState('');
  const [finishTime, setFinishTime] = useState('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [terms, setTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (jobs.length === 0) return;

    const firstJob = jobs[0];
    setClientName(firstJob.billingName || firstJob.companyName || firstJob.clientName || '');
    setClientEmail(firstJob.billingEmail || '');
    setClientPhone(firstJob.billingPhone || '');
    setJobAddress([firstJob.address, firstJob.city].filter(Boolean).join(', '));

    const billingAddress = [
      firstJob.billingAddress,
      firstJob.billingCity,
      firstJob.billingState,
      firstJob.billingZip,
    ].filter(Boolean).join(', ');
    setClientAddress(billingAddress);
    setIssueDate(firstJob.date || format(new Date(), 'yyyy-MM-dd'));

    const items: InvoiceLineItem[] = [];

    jobs.forEach((job, jobIndex) => {
      const charges = (job as any).extraCharges as {
        hourly?: { enabled: boolean; hours: number; rate: number };
        hose?: { feet: number; rate: number };
        fuel?: number;
        custom?: { id: string; description: string; amount: number }[];
      } | undefined;
      let setup = Number(job.setupCharge || 0);
      let yardRate = Number(job.amountPerYard || 0);
      const yards = Number(job.yards || 0);
      const suffix = jobs.length > 1
        ? ' - ' + format(parseISO(job.date), 'MMM d') + ' - ' + job.address
        : '';
      const extras = charges
        ? (charges.hourly?.enabled ? Number(charges.hourly.hours || 0) * Number(charges.hourly.rate || 0) : 0)
          + Number(charges.hose?.feet || 0) * Number(charges.hose?.rate || 0)
          + Number(charges.fuel || 0)
          + (charges.custom || []).reduce((sum, c) => sum + Number(c.amount || 0), 0)
        : 0;
      const amount = Number(job.amount || 0);
      const expected = setup + yards * yardRate + extras;
      // Never double bill saved legacy overrides. Treat an unmatched total as a flat amount.
      const flat = job.isFlatRate || (charges && Math.abs(expected - amount) > 0.02)
        || (!charges && setup + yards * yardRate > amount + 0.02);
      if (flat) {
        items.push({
          id: 'flat-' + jobIndex,
          description: 'Pumping Charges' + suffix,
          quantity: 1, rate: amount, amount,
        });
        return;
      }
      if (setup > 0) {
        items.push({
          id: 'setup-' + jobIndex,
          description: 'Minimum Set-Up' + suffix,
          quantity: 1, rate: setup, amount: setup,
        });
      }
      const yardAmount = yardRate * yards;
      if (yardAmount > 0) {
        items.push({
          id: 'pumping-' + jobIndex,
          description: 'Pumping Charges' + suffix,
          quantity: yards, rate: yardRate, amount: yardAmount,
        });
      }
      if (charges?.hourly?.enabled && Number(charges.hourly.hours) > 0 && Number(charges.hourly.rate) > 0) {
        const qty = Number(charges.hourly.hours), rate = Number(charges.hourly.rate);
        items.push({ id: 'hourly-' + jobIndex, description: 'Operator Hours' + suffix,
          quantity: qty, rate, amount: qty * rate });
      }
      if (charges?.hose && Number(charges.hose.feet) > 0 && Number(charges.hose.rate) > 0) {
        const qty = Number(charges.hose.feet), rate = Number(charges.hose.rate);
        items.push({ id: 'hose-' + jobIndex, description: 'Extra Hose (ft)' + suffix,
          quantity: qty, rate, amount: qty * rate });
      }
      if (charges && Number(charges.fuel) > 0) {
        const fuel = Number(charges.fuel);
        items.push({ id: 'fuel-' + jobIndex, description: 'Fuel Surcharge' + suffix,
          quantity: 1, rate: fuel, amount: fuel });
      }
      (charges?.custom || []).forEach((charge, i) => {
        const cost = Number(charge.amount || 0);
        if (cost > 0) items.push({
          id: 'custom-' + jobIndex + '-' + i, description: (charge.description || 'Additional Charge') + suffix,
          quantity: 1, rate: cost, amount: cost,
        });
      });
      const remaining = amount - expected;
      if (remaining > 0.02) {
        items.push({ id: 'additional-' + jobIndex, description: 'Additional Pumping Charges' + suffix,
          quantity: 1, rate: remaining, amount: remaining });
      }
      if (!charges && setup === 0 && yardAmount === 0 && remaining <= 0.02 && amount > 0) {
        items.push({ id: 'legacy-' + jobIndex, description: 'Pumping Charges' + suffix,
          quantity: 1, rate: amount, amount });
      }
    });

    if (jobs.length === 1) {
      [
        'Relocation',
        'Operator O.T. Hours',
      ].forEach((description, index) => {
        items.push({
          id: 'template-' + index,
          description,
          quantity: 0,
          rate: 0,
          amount: 0,
        });
      });

      items.push({
        id: 'total-yards',
        description: 'Total Yards',
        quantity: Number(firstJob.yards || 0),
        rate: 0,
        amount: 0,
      });
    }

    setLineItems(items);
  }, [jobs]);

  const calculateSubtotal = () =>
    lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const calculateTax = () => {
    const rate = parseFloat(taxRate) || 0;
    return (calculateSubtotal() * rate) / 100;
  };

  const calculateTotal = () => calculateSubtotal() + calculateTax();

  const updateLineItem = (
    index: number,
    field: 'description' | 'quantity' | 'rate',
    value: string
  ) => {
    setLineItems(current => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;

      if (field === 'description') {
        return { ...item, description: value };
      }

      const numericValue = parseFloat(value) || 0;
      const next = { ...item, [field]: numericValue };
      next.amount = Number(next.quantity || 0) * Number(next.rate || 0);
      return next;
    }));
  };

  const addLineItem = () => {
    setLineItems(current => [
      ...current,
      {
        id: 'custom-' + Date.now(),
        description: 'Custom Charge',
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(current => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    if (!user?.uid) {
      throw new Error('You must be signed in to create an invoice.');
    }

    const year = new Date().getFullYear();
    const counterRef = doc(db, 'users', user.uid, 'invoiceCounters', year.toString());

    // Existing installs used one global counter. When this user's private
    // counter is created for the first time, seed it from their own saved
    // invoices so an upgrade cannot reuse one of their old invoice numbers.
    let existingMax = 0;
    const existingCounter = await getDoc(counterRef);

    if (!existingCounter.exists()) {
      const invoicesSnapshot = await getDocs(
        query(collection(db, 'invoices'), where('createdBy', '==', user.uid))
      );

      const prefix = 'INV-' + year + '-';
      invoicesSnapshot.forEach((invoiceDoc) => {
        const invoiceNumber = String(invoiceDoc.data().invoiceNumber || '');
        if (!invoiceNumber.startsWith(prefix)) return;

        const parsed = Number(invoiceNumber.slice(prefix.length));
        if (Number.isInteger(parsed) && parsed > existingMax) {
          existingMax = parsed;
        }
      });
    }

    const count = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.exists()
        ? Number(counterDoc.data().count || 0)
        : existingMax;
      const nextCount = Math.max(currentCount, existingMax) + 1;

      transaction.set(
        counterRef,
        {
          count: nextCount,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return nextCount;
    });

    return 'INV-' + year + '-' + String(count).padStart(4, '0');
  };

  const generatePDF = async (invoice: any) => {
    const htmlContent =
      invoice.renderedHtml ||
      buildConcretePumpInvoiceHtml(
        invoice,
        user?.displayName || 'Concrete Pumping',
        user?.email || ''
      );

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return nameExportedPdf(uri, `Invoice-${invoice.invoiceNumber || 'Draft'}`);
  };

  const handleGenerateInvoice = async () => {
    if (!clientName.trim()) {
      Alert.alert('Error', 'Please enter a client name');
      return;
    }

    try {
      setIsGenerating(true);
      const invoiceNumber = await generateInvoiceNumber();

      const jobReferences = jobs
        .filter(job => job.jobNumber || job.poNumber)
        .map(job => ({
          jobId: job.id,
          date: job.date,
          address: [job.address, job.city].filter(Boolean).join(', '),
          ...(job.jobNumber ? { jobNumber: job.jobNumber } : {}),
          ...(job.poNumber ? { poNumber: job.poNumber } : {}),
        }));

      const invoice: any = {
        invoiceNumber,
        date: issueDate,
        dueDate,
        clientName,
        jobIds: jobs.map(j => j.id),
        lineItems,
        subtotal: calculateSubtotal(),
        total: calculateTotal(),
        status: 'draft',
        createdBy: user!.uid,
        createdAt: new Date().toISOString(),
        issuerName: user?.displayName || 'Concrete Pumping',
        issuerEmail: user?.email || '',
        jobAddress,
        rmc,
        dueTime,
        arriveTime,
        startTime,
        finishTime,
      };

      if (jobReferences.length > 0) {
        invoice.jobReferences = jobReferences;
      }

      if (clientEmail.trim()) invoice.clientEmail = clientEmail.trim();
      if (clientAddress.trim()) invoice.clientAddress = clientAddress.trim();
      if (clientPhone.trim()) invoice.clientPhone = clientPhone.trim();
      if (notes.trim()) invoice.notes = notes.trim();
      if (terms.trim()) invoice.terms = terms.trim();

      const taxValue = calculateTax();
      if (taxValue > 0) {
        invoice.tax = taxValue;
        invoice.taxRate = parseFloat(taxRate);
      }

      // Freeze the exact presentation used for this invoice. Reopening it later
      // uses this snapshot so the stored copy matches what was generated for the client.
      invoice.renderedHtml = buildConcretePumpInvoiceHtml(
        invoice,
        invoice.issuerName,
        invoice.issuerEmail
      );

      const docRef = await addDoc(collection(db, 'invoices'), invoice);
      const pdfUri = await generatePDF({ ...invoice, id: docRef.id });

      Alert.alert(
        'Invoice Created',
        'Invoice ' + invoiceNumber + ' has been saved as a draft. Share it now? After sending, mark it Sent from invoice details.',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
          {
            text: 'Send Now',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(pdfUri, {
                  mimeType: 'application/pdf',
                  dialogTitle: 'Invoice ' + invoiceNumber,
                  UTI: 'com.adobe.pdf',
                });

                // The share menu also returns when cancelled. Keep the saved
                // draft until the user explicitly marks it Sent in invoice details.
              }
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating invoice:', error);
      Alert.alert('Error', 'Failed to create invoice. ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>Create Pump Invoice</Text>
          <Text style={styles.subtitle}>
            Default concrete-pumping template based on the familiar paper invoice layout.
          </Text>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Customer & Job</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Customer / Company *"
                value={clientName}
                onChangeText={setClientName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Job Address"
                value={jobAddress}
                onChangeText={setJobAddress}
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.row}>
                <TextInput
                  label="Phone"
                  value={clientPhone}
                  onChangeText={setClientPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  label="Email"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, styles.halfInput]}
                />
              </View>
              <TextInput
                label="Billing Address"
                value={clientAddress}
                onChangeText={setClientAddress}
                mode="outlined"
                multiline
                style={styles.input}
              />

              {jobs.some(job => job.jobNumber || job.poNumber) && (
                <View style={styles.referencePreview}>
                  <Text style={styles.referenceTitle}>Job / PO References</Text>
                  {jobs
                    .filter(job => job.jobNumber || job.poNumber)
                    .map(job => (
                      <View key={job.id} style={styles.referenceRow}>
                        <Text onPress={() => chooseMapApp(job.address, job.city)} style={styles.referenceJob}>
                          {format(parseISO(job.date), 'MMM d')} · 📍 {job.address}
                        </Text>
                        <Text style={styles.referenceValue}>
                          {[
                            job.jobNumber ? 'Job #: ' + job.jobNumber : '',
                            job.poNumber ? 'PO #: ' + job.poNumber : '',
                          ].filter(Boolean).join('   ')}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Invoice & Job Times</Text>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <TextInput
                  label="Invoice Date"
                  value={issueDate}
                  onChangeText={setIssueDate}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  label="Due Date"
                  value={dueDate}
                  onChangeText={setDueDate}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                />
              </View>
              <TextInput
                label="RMC"
                value={rmc}
                onChangeText={setRmc}
                mode="outlined"
                placeholder="Ready-mix company"
                style={styles.input}
              />
              <View style={styles.timeGrid}>
                <TextInput label="Due" value={dueTime} onChangeText={setDueTime} mode="outlined" style={styles.timeInput} />
                <TextInput label="Arrive" value={arriveTime} onChangeText={setArriveTime} mode="outlined" style={styles.timeInput} />
                <TextInput label="Start" value={startTime} onChangeText={setStartTime} mode="outlined" style={styles.timeInput} />
                <TextInput label="Finish" value={finishTime} onChangeText={setFinishTime} mode="outlined" style={styles.timeInput} />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <Text variant="titleMedium" style={styles.sectionTitle}>Pumping Charges</Text>
                <Button mode="text" icon="plus" onPress={addLineItem}>Add Charge</Button>
              </View>
              <Divider style={styles.divider} />

              {lineItems.map((item, index) => (
                <View key={item.id} style={styles.editableLineItem}>
                  <View style={styles.chargeTopRow}>
                    <TextInput
                      label="Qty."
                      value={String(item.quantity)}
                      onChangeText={(value) => updateLineItem(index, 'quantity', value)}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      dense
                      style={styles.qtyInput}
                    />
                    <TextInput
                      label="Description"
                      value={item.description}
                      onChangeText={(value) => updateLineItem(index, 'description', value)}
                      mode="outlined"
                      dense
                      style={styles.descriptionInput}
                    />
                  </View>
                  <View style={styles.chargeBottomRow}>
                    <TextInput
                      label="Unit Price"
                      value={String(item.rate)}
                      onChangeText={(value) => updateLineItem(index, 'rate', value)}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      dense
                      style={styles.rateInput}
                    />
                    <View style={styles.amountBox}>
                      <Text style={styles.amountLabel}>Amount</Text>
                      <Text style={styles.lineItemAmount}>{'$' + item.amount.toFixed(2)}</Text>
                    </View>
                    <IconButton
                      icon="delete-outline"
                      size={22}
                      onPress={() => removeLineItem(index)}
                      accessibilityLabel="Remove charge"
                    />
                  </View>
                </View>
              ))}

              {lineItems.length === 0 && (
                <Text style={styles.noItemsText}>No charges yet. Tap Add Charge to add one.</Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Terms & Notes</Text>
              <Divider style={styles.divider} />
              <TextInput
                label="Payment Terms"
                value={terms}
                onChangeText={setTerms}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Tax Rate (%)"
                value={taxRate}
                onChangeText={setTaxRate}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <TextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{'$' + calculateSubtotal().toFixed(2)}</Text>
              </View>
              {parseFloat(taxRate) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
                  <Text style={styles.totalValue}>{'$' + calculateTax().toFixed(2)}</Text>
                </View>
              )}
              <Divider style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>{'$' + calculateTotal().toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleGenerateInvoice}
              loading={isGenerating}
              disabled={isGenerating || lineItems.length === 0}
              style={styles.generateButton}
              icon="file-document"
            >
              Generate Invoice
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  title: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: Colors.text,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeInput: {
    minWidth: '47%',
    flexGrow: 1,
    marginBottom: 8,
  },
  referencePreview: {
    marginTop: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    backgroundColor: Colors.surfaceDark,
  },
  referenceTitle: {
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  referenceRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  referenceJob: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  referenceValue: {
    color: Colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  editableLineItem: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    marginTop: 2,
  },
  chargeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chargeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  qtyInput: {
    width: 82,
  },
  descriptionInput: {
    flex: 1,
  },
  rateInput: {
    width: 115,
    flexGrow: 1,
  },
  amountBox: {
    flex: 1,
    minWidth: 95,
    alignItems: 'flex-end',
  },
  amountLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  lineItemAmount: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  noItemsText: {
    color: Colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  totalValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  actions: {
    marginTop: 8,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: Colors.textLight,
  },
}));
