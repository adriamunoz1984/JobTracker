// src/screens/PendingJobsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Text, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where,
  onSnapshot,
  doc,
  updateDoc,
  or
} from 'firebase/firestore';

const db = getFirestore();

interface PendingJob {
  id: string;
  date: string;
  companyName?: string;
  address: string;
  city: string;
  notes?: string;
  ownerId: string;
  assignedTo: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed';
  createdAt: string;
  acceptedAt?: string;
}

export default function PendingJobsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [acceptedJobs, setAcceptedJobs] = useState<PendingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || user.role !== 'employee') {
      setIsLoading(false);
      return;
    }

    // Listen for both pending AND accepted jobs
    const jobsRef = collection(db, 'users', user.uid, 'ownerJobs');
    const q = query(
      jobsRef,
      or(
        where('status', '==', 'pending'),
        where('status', '==', 'accepted')
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allJobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PendingJob));

      // Separate into pending and accepted
      const pending = allJobs.filter(job => job.status === 'pending');
      const accepted = allJobs.filter(job => job.status === 'accepted');

      setPendingJobs(pending);
      setAcceptedJobs(accepted);
      setIsLoading(false);
      
      console.log(`📋 Loaded ${pending.length} pending jobs and ${accepted.length} accepted jobs`);
    }, (error) => {
      console.error('Error loading jobs:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleAcceptJob = async (job: PendingJob) => {
    try {
      await updateDoc(doc(db, 'users', user!.uid, 'ownerJobs', job.id), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      });

      Alert.alert(
        'Job Accepted',
        'You can now complete the job details after finishing the work.',
        [
          {
            text: 'Complete Now',
            onPress: () => navigation.navigate('CompleteJob' as never, { jobId: job.id } as never)
          },
          {
            text: 'Later',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting job:', error);
      Alert.alert('Error', 'Failed to accept job');
    }
  };

  const handleCompleteJob = (job: PendingJob) => {
    navigation.navigate('CompleteJob' as never, { jobId: job.id } as never);
  };

  const handleDeclineJob = (job: PendingJob) => {
    Alert.alert(
      'Decline Job',
      'Are you sure you want to decline this job assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', user!.uid, 'ownerJobs', job.id), {
                status: 'declined',
                declinedAt: new Date().toISOString(),
              });
            } catch (error) {
              console.error('Error declining job:', error);
              Alert.alert('Error', 'Failed to decline job');
            }
          }
        }
      ]
    );
  };

  const renderJobCard = (job: PendingJob, isAccepted: boolean) => (
    <Card key={job.id} style={styles.jobCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.date}>{format(new Date(job.date), 'EEE, MMM d, yyyy')}</Text>
            <Chip 
              mode="outlined" 
              style={isAccepted ? styles.acceptedChip : styles.statusChip}
            >
              {isAccepted ? '✓ Accepted' : '⏳ Pending'}
            </Chip>
          </View>
        </View>

        {job.companyName && (
          <Title style={styles.companyName}>{job.companyName}</Title>
        )}

        <Paragraph style={styles.address}>
          {job.address}, {job.city}
        </Paragraph>

        {job.notes && (
          <>
            <Divider style={styles.divider} />
            <Text style={styles.notesLabel}>Notes:</Text>
            <Paragraph style={styles.notes}>{job.notes}</Paragraph>
          </>
        )}

        <Divider style={styles.divider} />

        {!isAccepted && (
          <Text style={styles.infoText}>
            ℹ️ After accepting, complete the job and add yards, amount, and payment details.
          </Text>
        )}

        {isAccepted && (
          <Text style={styles.infoText}>
            ✓ Job accepted. Complete the details when you finish the work.
          </Text>
        )}
      </Card.Content>

      <Card.Actions style={styles.actions}>
        {!isAccepted ? (
          <>
            <Button
              mode="outlined"
              onPress={() => handleDeclineJob(job)}
              textColor="#F44336"
            >
              Decline
            </Button>
            <Button
              mode="contained"
              onPress={() => handleAcceptJob(job)}
              style={styles.acceptButton}
            >
              Accept Job
            </Button>
          </>
        ) : (
          <Button
            mode="contained"
            onPress={() => handleCompleteJob(job)}
            style={styles.completeButton}
            icon="check-circle"
          >
            Complete Job Details
          </Button>
        )}
      </Card.Actions>
    </Card>
  );

  if (user?.role !== 'employee') {
    return (
      <View style={styles.container}>
        <Text>Only employees can view pending jobs.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>My Job Assignments</Title>
        <Paragraph style={styles.subtitle}>
          Jobs assigned to you by your employer
        </Paragraph>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading jobs...</Text>
        </View>
      ) : (
        <>
          {/* New Assignments Section */}
          {pendingJobs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📥 New Assignments ({pendingJobs.length})</Text>
              {pendingJobs.map(job => renderJobCard(job, false))}
            </View>
          )}

          {/* Accepted Jobs Section */}
          {acceptedJobs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✓ Accepted Jobs ({acceptedJobs.length})</Text>
              <Text style={styles.sectionSubtitle}>
                Complete these jobs when you finish the work
              </Text>
              {acceptedJobs.map(job => renderJobCard(job, true))}
            </View>
          )}

          {/* Empty State */}
          {pendingJobs.length === 0 && acceptedJobs.length === 0 && (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title>No Job Assignments</Title>
                <Paragraph>
                  You don't have any job assignments at this time.
                </Paragraph>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  jobCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  jobInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  statusChip: {
    backgroundColor: '#FFF3E0',
  },
  acceptedChip: {
    backgroundColor: '#E8F5E9',
  },
  companyName: {
    fontSize: 18,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#444',
  },
  divider: {
    marginVertical: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingTop: 0,
  },
  acceptButton: {
    marginLeft: 8,
    backgroundColor: '#4CAF50',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#2196F3',
  },
});