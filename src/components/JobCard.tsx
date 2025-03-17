import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text, Button, IconButton, Menu, Divider, Badge } from 'react-native-paper';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

// Define the Job interface
interface Job {
  id: string;
  companyName?: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  paymentMethod: 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge';
  amount: number;
  date: string;
  sequenceNumber?: number;
  notes?: string;
  billingDetails?: {
    invoiceNumber?: string;
    billingDate?: string;
    dueDate?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

interface JobCardProps {
  job: Job;
  onDelete?: (id: string) => void;
  onTogglePaid?: (id: string, isPaid: boolean) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onDelete, onTogglePaid }) => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);

  // Format the date for display
  const formattedDate = format(new Date(job.date), 'EEE, MMM d, yyyy');
  
  // Define colors based on payment status
  const statusColor = job.isPaid ? '#4CAF50' : '#F44336';
  
  // Payment method icons
  const getPaymentIcon = () => {
    switch (job.paymentMethod) {
      case 'Cash': return 'cash';
      case 'Check': return 'checkbox-marked-outline';
      case 'Zelle': return 'bank-transfer';
      case 'Square': return 'credit-card-outline';
      case 'Charge': return 'receipt';
      default: return 'cash';
    }
  };
  
  // Check if there's additional information that warrants showing details
  const hasAdditionalInfo = !!job.notes || job.paymentMethod === 'Charge' || !!job.billingDetails;

  // Handle card press - navigate to details only if there's additional info
  const handleCardPress = () => {
    if (hasAdditionalInfo) {
      navigation.navigate('JobDetail' as never, { jobId: job.id } as never);
    }
  };
  
  // Handle edit job
  const handleEdit = () => {
    setMenuVisible(false);
    navigation.navigate('AddJob' as never, { job: job } as never);
  };
  
  // Handle delete job
  const handleDelete = () => {
    setMenuVisible(false);
    if (onDelete) {
      onDelete(job.id);
    }
  };
  
  // Handle toggle paid status
  const handleTogglePaid = () => {
    setMenuVisible(false);
    if (onTogglePaid) {
      onTogglePaid(job.id, !job.isPaid);
    }
  };
  
  return (
    <Card 
      style={[
        styles.card, 
        { borderLeftColor: statusColor, borderLeftWidth: 4 },
        // Add conditional indentation for secondary jobs
        job.sequenceNumber > 1 ? styles.secondaryJobCard : null
      ]}
      elevation={2}
      onPress={handleCardPress}
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.dateContainer}>
            <Text style={styles.date}>{formattedDate}</Text>
            {job.sequenceNumber > 1 && (
              <Badge style={styles.sequenceBadge}>Job #{job.sequenceNumber}</Badge>
            )}
          </View>
          
          <View style={styles.amountContainer}>
            <Text style={styles.amount}>${job.amount}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{job.isPaid ? 'PAID' : 'UNPAID'}</Text>
            </View>
          </View>
          
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton 
                icon="dots-vertical" 
                size={20} 
                onPress={() => setMenuVisible(true)}
                style={styles.menuButton}
              />
            }
          >
            <Menu.Item onPress={handleEdit} title="Edit" icon="pencil" />
            <Menu.Item onPress={handleTogglePaid} title={job.isPaid ? "Mark as Unpaid" : "Mark as Paid"} icon={job.isPaid ? "close" : "check"} />
            <Divider />
            <Menu.Item onPress={handleDelete} title="Delete" icon="delete" />
          </Menu>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.companyRow}>
            {job.companyName ? (
              <Title style={styles.companyName}>{job.companyName}</Title>
            ) : (
              <Title style={[styles.companyName, styles.noCompany]}>No Company</Title>
            )}
            
            <View style={styles.paymentMethodContainer}>
              <IconButton icon={getPaymentIcon()} size={16} style={styles.paymentIcon} />
              <Text style={styles.paymentMethod}>{job.paymentMethod}</Text>
            </View>
          </View>
          
          <Paragraph style={styles.address}>
            {job.address}, {job.city}
          </Paragraph>
          
          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Yards:</Text>
              <Text style={styles.detailValue}>{job.yards}</Text>
            </View>
          </View>
          
          {hasAdditionalInfo && (
            <View style={styles.infoIndicator}>
              <IconButton icon="information" size={16} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                {job.notes ? "Has notes" : ""}
                {job.notes && job.paymentMethod === 'Charge' ? " • " : ""}
                {job.paymentMethod === 'Charge' ? "Has billing info" : ""}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
      
      <Card.Actions style={styles.cardActions}>
        <Button 
          mode="text" 
          compact 
          onPress={handleEdit}
          style={styles.actionButton}
        >
          Edit
        </Button>
        
        <Button 
          mode="text" 
          compact 
          onPress={handleTogglePaid}
          style={styles.actionButton}
          color={job.isPaid ? '#F44336' : '#4CAF50'}
        >
          {job.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  secondaryJobCard: {
    marginLeft: 35, // Indent secondary jobs
    borderLeftStyle: 'dashed', // Optional: make the left border dashed for visual difference
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  date: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  sequenceBadge: {
    marginLeft: 8,
    fontSize: 12,
    backgroundColor: '#E0E0E0',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentContainer: {
    marginTop: 4,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  companyName: {
    fontSize: 18,
    marginBottom: 0,
  },
  noCompany: {
    fontStyle: 'italic',
    color: '#888',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    margin: 0,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#666',
  },
  address: {
    fontSize: 14,
    marginBottom: 6,
    color: '#444',
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detail: {
    marginRight: 16,
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoIcon: {
    margin: 0,
    padding: 0,
  },
  infoText: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  actionButton: {
    marginLeft: 8,
  },
  menuButton: {
    margin: -8,
  },
});

export default JobCard;