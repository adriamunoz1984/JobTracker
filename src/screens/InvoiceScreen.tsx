// src/screens/InvoiceScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  TextInput, 
  Divider,
  IconButton,
  Chip,
  SegmentedButtons
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Job, Invoice, InvoiceLineItem } from '../types';
import { format, addDays } from 'date-fns';
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config'
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function InvoiceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { jobs } = route.params as { jobs: Job[] };

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [terms, setTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Pre-fill client info from first job
    if (jobs.length > 0) {
      const firstJob = jobs[0];
      setClientName(firstJob.companyName || '');
      setClientAddress(`${firstJob.address}, ${firstJob.city}`);
    }

    // Create line items from jobs
    const items: InvoiceLineItem[] = jobs.map((job, index) => ({
      id: `item-${index}`,
      description: `${format(new Date(job.date), 'MMM d, yyyy')} - ${job.address}, ${job.city} (${job.yards} yards)`,
      quantity: 1,
      rate: job.amount,
      amount: job.amount,
    }));
    setLineItems(items);
  }, [jobs]);

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = () => {
    const rate = parseFloat(taxRate) || 0;
    return (calculateSubtotal() * rate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const counterRef = doc(db, 'invoiceCounters', year.toString());
    
    const counterDoc = await getDoc(counterRef);
    let count = 1;
    
    if (counterDoc.exists()) {
      count = (counterDoc.data().count || 0) + 1;
    }
    
    await setDoc(counterRef, { count });
    
    return `INV-${year}-${String(count).padStart(4, '0')}`;
  };

  const generatePDF = async (invoice: Invoice) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2196F3;
          }
          .company-info {
            flex: 1;
          }
          .invoice-info {
            text-align: right;
          }
          .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
          }
          .bill-to {
            margin: 30px 0;
            padding: 20px;
            background-color: #f5f5f5;
            border-radius: 8px;
          }
          .bill-to h3 {
            margin: 0 0 10px 0;
            color: #333;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th {
            background-color: #2196F3;
            color: white;
            padding: 12px;
            text-align: left;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
          }
          .totals {
            margin-top: 30px;
            text-align: right;
          }
          .totals table {
            margin-left: auto;
            width: 300px;
          }
          .totals td {
            border: none;
            padding: 8px;
          }
          .total-row {
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
          }
          .notes {
            margin-top: 40px;
            padding: 20px;
            background-color: #f9f9f9;
            border-left: 4px solid #2196F3;
          }
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1 style="margin: 0; color: #2196F3;">🚚 ${user?.displayName || 'Your Company'}</h1>
            <p style="margin: 5px 0;">${user?.email || ''}</p>
          </div>
          <div class="invoice-info">
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <p><strong>Date:</strong> ${format(new Date(invoice.date), 'MMM d, yyyy')}</p>
            <p><strong>Due:</strong> ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
          </div>
        </div>

        <div class="bill-to">
          <h3>Bill To:</h3>
          <p style="margin: 5px 0;"><strong>${invoice.clientName}</strong></p>
          ${invoice.clientAddress ? `<p style="margin: 5px 0;">${invoice.clientAddress}</p>` : ''}
          ${invoice.clientEmail ? `<p style="margin: 5px 0;">📧 ${invoice.clientEmail}</p>` : ''}
          ${invoice.clientPhone ? `<p style="margin: 5px 0;">📞 ${invoice.clientPhone}</p>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lineItems.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">$${item.rate.toFixed(2)}</td>
                <td style="text-align: right;">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">$${invoice.subtotal.toFixed(2)}</td>
            </tr>
            ${invoice.tax ? `
              <tr>
                <td>Tax (${invoice.taxRate}%):</td>
                <td style="text-align: right;">$${invoice.tax.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr class="total-row">
              <td>Total:</td>
              <td style="text-align: right;">$${invoice.total.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${invoice.terms ? `
          <div class="notes">
            <h4 style="margin: 0 0 10px 0;">Payment Terms:</h4>
            <p style="margin: 0;">${invoice.terms}</p>
          </div>
        ` : ''}

        ${invoice.notes ? `
          <div class="notes" style="margin-top: 20px;">
            <h4 style="margin: 0 0 10px 0;">Notes:</h4>
            <p style="margin: 0;">${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}</p>
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ 
      html: htmlContent,
    });

    return uri;
  };

  const handleGenerateInvoice = async () => {
  if (!clientName.trim()) {
    Alert.alert('Error', 'Please enter a client name');
    return;
  }

  try {
    setIsGenerating(true);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create invoice object - ONLY include defined values
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
    };

    // Only add optional fields if they have values
    if (clientEmail?.trim()) invoice.clientEmail = clientEmail.trim();
    if (clientAddress?.trim()) invoice.clientAddress = clientAddress.trim();
    if (clientPhone?.trim()) invoice.clientPhone = clientPhone.trim();
    if (notes?.trim()) invoice.notes = notes.trim();
    if (terms?.trim()) invoice.terms = terms.trim();
    
    const taxValue = calculateTax();
    if (taxValue > 0) {
      invoice.tax = taxValue;
      invoice.taxRate = parseFloat(taxRate);
    }

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'invoices'), invoice);
    console.log('✅ Invoice saved:', invoiceNumber);

    // Generate PDF for sharing
    const pdfUri = await generatePDF({ ...invoice, id: docRef.id });

    // Simple prompt: Send now or later
    Alert.alert(
      '✅ Invoice Created',
      `Invoice ${invoiceNumber} has been saved. Send it now?`,
      [
        { 
          text: 'Later', 
          style: 'cancel',
          onPress: () => navigation.goBack() 
        },
        {
          text: 'Send Now',
          onPress: async () => {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(pdfUri, {
                mimeType: 'application/pdf',
                dialogTitle: `Invoice ${invoiceNumber}`,
                UTI: 'com.adobe.pdf',
              });
            }
            navigation.goBack();
          }
        }
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
      <ScrollView>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>🧾 Create Invoice</Text>

          {/* Client Info */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Client Information</Text>
              <Divider style={styles.divider} />

              <TextInput
                label="Client Name *"
                value={clientName}
                onChangeText={setClientName}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Email"
                value={clientEmail}
                onChangeText={setClientEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Phone"
                value={clientPhone}
                onChangeText={setClientPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />

              <TextInput
                label="Address"
                value={clientAddress}
                onChangeText={setClientAddress}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
              />
            </Card.Content>
          </Card>

          {/* Invoice Details */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Invoice Details</Text>
              <Divider style={styles.divider} />

              <View style={styles.row}>
                <TextInput
                  label="Issue Date"
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
                label="Payment Terms"
                value={terms}
                onChangeText={setTerms}
                mode="outlined"
                style={styles.input}
                placeholder="Net 30"
              />

              <TextInput
                label="Tax Rate (%)"
                value={taxRate}
                onChangeText={setTaxRate}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </Card.Content>
          </Card>

          {/* Line Items */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Line Items ({lineItems.length})
              </Text>
              <Divider style={styles.divider} />

              {lineItems.map((item, index) => (
                <View key={item.id} style={styles.lineItem}>
                  <Text style={styles.lineItemDescription}>{item.description}</Text>
                  <Text style={styles.lineItemAmount}>${item.amount.toFixed(2)}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Totals */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalValue}>${calculateSubtotal().toFixed(2)}</Text>
              </View>

              {parseFloat(taxRate) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax ({taxRate}%):</Text>
                  <Text style={styles.totalValue}>${calculateTax().toFixed(2)}</Text>
                </View>
              )}

              <Divider style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalValue}>${calculateTotal().toFixed(2)}</Text>
              </View>
            </Card.Content>
          </Card>

          {/* Notes */}
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Notes (Optional)</Text>
              <Divider style={styles.divider} />

              <TextInput
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Additional notes or instructions..."
                style={styles.input}
              />
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleGenerateInvoice}
              loading={isGenerating}
              disabled={isGenerating}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  lineItemDescription: {
    flex: 1,
    fontSize: 14,
  },
  lineItemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  actions: {
    marginTop: 16,
    marginBottom: 32,
  },
  generateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: '#999',
  },
});