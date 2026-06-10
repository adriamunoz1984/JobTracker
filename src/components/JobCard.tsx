import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text, Button, IconButton, Menu, Divider, Badge, Chip } from 'react-native-paper';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { useJobs } from '../context/JobsContext';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface Job {
  id: string;
  userId: string;
  companyName?: string;
  clientName: string;
  address: string;
  city: string;
  yards: number;
  isPaid: boolean;
  isPaidToMe?: boolean;
  paymentMethod: 'Cash' | 'Check' | 'Zelle' | 'Square' | 'Charge' | 'Card';
  amount: number;
  isFlatRate: boolean;
  date: string;
  sequenceNumber?: number;
  totalJobsOnDate?: number;
  notes?: string;
}

interface JobCardProps {
  job: Job;
  onDelete?: (id: string) => void;
  onTogglePaid?: (id: string, isPaid: boolean) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onDelete, onTogglePaid }) => {
  const navigation = useNavigation<any>();
  const { updateJob } = useJobs();
  const [expanded, setExpanded] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const formattedDate = format(new Date(job.date), 'EEE, MMM d, yyyy');
  
  const statusColor = job.isPaid ? Colors.success : Colors.error;
  const statusBgColor = job.isPaid ? Colors.successBg : Colors.errorBg;
  
  const getPaymentIcon = () => {
    switch (job.paymentMethod) {
      case 'Cash': return 'cash';
      case 'Check': return 'checkbook';
      case 'Zelle': return 'bank-transfer';
      case 'Square': return 'credit-card';
      case 'Charge': return 'receipt';
      default: return 'cash';
    }
  };

  const getPaymentColor = () => {
    switch (job.paymentMethod) {
      case 'Cash': return Colors.payment.cash;
      case 'Check': return Colors.payment.check;
      case 'Charge': return Colors.payment.charge;
      default: return Colors.textSecondary;
    }
  };
  
  const handleEdit = () => {
    setMenuVisible(false);
    navigation.navigate('AddJob' as never, { job: job } as never);
  };
  
  const handleDelete = () => {
    setMenuVisible(false);
    if (onDelete) {
      onDelete(job.id);
    }
  };
  
  const handleTogglePaid = async () => {
    setMenuVisible(false);
    if (onTogglePaid) {
      onTogglePaid(job.id, !job.isPaid);
    } else if (updateJob) {
      const updatedJob = { ...job, isPaid: !job.isPaid };
      await updateJob(updatedJob);
    }
  };

  const showSequenceBadge = job.totalJobsOnDate && job.totalJobsOnDate > 1;
  const shouldIndent = showSequenceBadge && job.sequenceNumber && job.sequenceNumber > 1;
  
  return (
    <Card 
      style={[
        styles.card,
        shouldIndent && styles.secondaryJobCard
      ]}
      elevation={2}
    >
      {/* Status Indicator Bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      
      <Card.Content style={styles.cardContent}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.leftHeader}>
            <Text style={styles.date}>{formattedDate}</Text>
            
            {/* Badges */}
            <View style={styles.badgeRow}>
              {showSequenceBadge && (
            <View style={styles.sequenceBadge}>
              <Text style={styles.sequenceBadgeText}>#{job.sequenceNumber}</Text>
            </View>
          )}
              
              {(job as any).isEmployeeJob && (job as any).employeeName && (
                <Chip 
                  icon="account-hard-hat" 
                  compact
                  style={styles.employeeBadge}
                  textStyle={styles.employeeBadgeText}
                >
                  {(job as any).employeeName}
                </Chip>
              )}
            </View>
          </View>
          
          <View style={styles.rightHeader}>
            {/* Amount */}
            <Text style={styles.amount}>${job.amount.toFixed(0)}</Text>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {job.isPaid ? '✓ Paid' : '✗ Unpaid'}
              </Text>
            </View>
            
            {/* Menu */}
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton 
                  icon="dots-vertical" 
                  size={20} 
                  onPress={() => setMenuVisible(true)}
                  iconColor={Colors.textSecondary}
                  style={styles.menuButton}
                />
              }
            >
              <Menu.Item 
                onPress={handleEdit} 
                title="Edit" 
                leadingIcon="pencil"
              />
              <Menu.Item 
                onPress={handleTogglePaid} 
                title={job.isPaid ? "Mark as Unpaid" : "Mark as Paid"} 
                leadingIcon={job.isPaid ? "close-circle" : "check-circle"}
              />
              <Divider />
              <Menu.Item 
                onPress={handleDelete} 
                title="Delete" 
                leadingIcon="delete"
                titleStyle={{ color: Colors.error }}
              />
            </Menu>
          </View>
        </View>
        
        {/* Content */}
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.contentContainer}>
          {/* Company Name */}
          {job.companyName ? (
            <Text style={styles.companyName}>{job.companyName}</Text>
          ) : (
            <Text style={[styles.companyName, styles.noCompany]}>No Company</Text>
          )}
          
          {/* Address */}
          <View style={styles.addressRow}>
            <IconButton icon="map-marker" size={16} style={styles.addressIcon} iconColor={Colors.textSecondary} />
            <Text style={styles.address}>{job.address}, {job.city}</Text>
          </View>
          
          {/* Details Row */}
          <View style={styles.detailsRow}>
            {/* Yards */}
            <View style={styles.detailItem}>
              <IconButton icon="truck-delivery" size={16} style={styles.detailIcon} iconColor={Colors.primary} />
              <Text style={styles.detailValue}>{job.yards} yds</Text>
            </View>
            
            {/* Payment Method */}
            <View style={styles.detailItem}>
              <IconButton 
                icon={getPaymentIcon()} 
                size={16} 
                style={styles.detailIcon} 
                iconColor={getPaymentColor()} 
              />
              <Text style={styles.detailValue}>{job.paymentMethod}</Text>
            </View>
            
            {/* Direct Payment Indicator */}
              {job.isPaidToMe && (
                <Chip 
                  icon="cash-fast" 
                  compact
                  style={styles.directPaymentChip}
                  textStyle={styles.directPaymentText}
                >
                  Direct Payment
                </Chip>
              )}
          </View>
          
          {/* Notes */}
          {expanded && job.notes && (
            <View style={styles.notesContainer}>
              <Divider style={styles.divider} />
              <Text style={styles.notesLabel}>📝 Notes:</Text>
              <Text style={styles.notes}>{job.notes}</Text>
            </View>
          )}
          
          {!expanded && job.notes && (
            <Text style={styles.notesIndicator}>💬 Tap to see notes...</Text>
          )}
        </TouchableOpacity>
      </Card.Content>
      
      {/* Action Buttons */}
      <Card.Actions style={styles.cardActions}>
        <Button 
          mode="text" 
          compact 
          onPress={handleEdit}
          textColor={Colors.primary}
        >
          Edit
        </Button>
        
        <Button 
          mode="text" 
          compact 
          onPress={handleTogglePaid}
          textColor={job.isPaid ? Colors.error : Colors.success}
          icon={job.isPaid ? 'close-circle' : 'check-circle'}
        >
          {job.isPaid ? 'Unpaid' : 'Paid'}
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.large,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  secondaryJobCard: {
    marginLeft: Spacing.xl + Spacing.sm,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardContent: {
    paddingTop: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  leftHeader: {
    flex: 1,
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
sequenceBadge: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: Colors.surfaceDark,
  borderWidth: 1,
  borderColor: Colors.border,
  justifyContent: 'center',
  alignItems: 'center',
},
sequenceBadgeText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: Colors.text,
  textAlign: 'center',
},
  employeeBadge: {
    height: 24,
    backgroundColor: Colors.infoBg,
  },
  employeeBadgeText: {
    fontSize: 11,
    color: Colors.info,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  menuButton: {
    margin: 0,
  },
  contentContainer: {
    marginTop: Spacing.xs,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  noCompany: {
    fontStyle: 'italic',
    color: Colors.textLight,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addressIcon: {
    margin: 0,
    marginRight: -8,
  },
  address: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    margin: 0,
    marginRight: -4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  paidToMeChip: {
    height: 28,
    backgroundColor: Colors.infoBg,
  },
  paidToMeText: {
    fontSize: 11,
    color: Colors.info,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: Spacing.sm,
  },
  divider: {
    marginVertical: Spacing.sm,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  notes: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  notesIndicator: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingTop: 0,
    paddingBottom: Spacing.sm,
  },
  directPaymentChip: {
  height: 28,
  backgroundColor: Colors.infoBg,
},
directPaymentText: {
  fontSize: 11,
  color: Colors.info,
  fontWeight: '600',
},
});

export default JobCard;