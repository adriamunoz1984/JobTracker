import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Chip } from 'react-native-paper';
import { format } from 'date-fns';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

export default function JobCard({ job, onPress }: JobCardProps) {
  const {
    date,
    companyName,
    address,
    city,
    yards,
    isPaid,
    paymentMethod,
    amount,
  } = job;

  const formattedDate = format(new Date(date), 'MMM dd, yyyy');
  const formattedAmount = amount !== undefined 
    ? amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })
    : '$0.00';

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={[styles.card, isPaid ? styles.paidCard : styles.unpaidCard]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>{formattedDate}</Title>
            <Chip
              mode="outlined"
              textStyle={{ fontWeight: 'bold' }}
              style={isPaid ? styles.paidChip : styles.unpaidChip}
            >
              {isPaid ? 'PAID' : 'UNPAID'}
            </Chip>
          </View>

          <Paragraph>{companyName || 'Unnamed Job'}</Paragraph>
          <View style={styles.detailsRow}>
          <Paragraph>{`${address}, ${city}`}</Paragraph>
          <Paragraph>{`${yards} yards`}</Paragraph>
          </View>
          <View style={styles.detailsRow}>
            <Paragraph>{paymentMethod}</Paragraph>
            <Paragraph style={styles.amount}>{formattedAmount}</Paragraph>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 3,
    borderLeftWidth: 5,
  },
  paidCard: {
    borderLeftColor: '#4CAF50', // Green
  },
  unpaidCard: {
    borderLeftColor: '#F44336', // Red
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paidChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  unpaidChip: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amount: {
    fontWeight: 'bold',
  },
});