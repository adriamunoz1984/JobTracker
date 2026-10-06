import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Button, Card, Chip, Divider, Text } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useAppTheme, makeStyles } from '../theme';
import {
  acceptEmployeeInvite,
  declineEmployeeInvite,
  EmployeeInvite,
  getInviteBusinessName,
} from '../utils/employeeInvites';
import {
  FinderNotificationEvent,
  subscribeFinderNotificationEvents,
} from '../services/pumpFinderNotifications';
import {
  getSeenNotificationIds,
  markNotificationIdsSeen,
  notificationStorageIds,
} from '../services/notificationReadState';

const db = getFirestore();

interface Assignment {
  id: string;
  date?: string;
  companyName?: string;
  address?: string;
  city?: string;
  status?: string;
}

export default function NotificationsScreen() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, updateProfile } = useAuth();
  const [invites, setInvites] = useState<EmployeeInvite[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [finderNotifications, setFinderNotifications] = useState<FinderNotificationEvent[]>([]);
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(new Set());
  const [sessionNewIds, setSessionNewIds] = useState<Set<string>>(
    new Set(route.params?.highlightNotificationIds || [])
  );
  const [seenStateLoaded, setSeenStateLoaded] = useState(false);
  const [isWorking, setIsWorking] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setInvites([]);
      return;
    }

    const invitesRef = collection(db, 'employeeInvites');
    const q = user.role === 'owner'
      ? query(invitesRef, where('ownerId', '==', user.uid))
      : query(invitesRef, where('employeeEmail', '==', user.email.toLowerCase()));

    return onSnapshot(
      q,
      snapshot => {
        setInvites(
          snapshot.docs.map(snapshotDoc => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as EmployeeInvite))
        );
      },
      error => console.error('Error loading invitation notifications:', error)
    );
  }, [user?.uid, user?.email, user?.role]);

  useEffect(() => {
    if (!user?.uid || user.role !== 'employee') {
      setAssignments([]);
      return;
    }

    const jobsRef = collection(db, 'users', user.uid, 'ownerJobs');
    return onSnapshot(
      jobsRef,
      snapshot => {
        setAssignments(
          snapshot.docs
            .map(snapshotDoc => ({
              id: snapshotDoc.id,
              ...snapshotDoc.data(),
            } as Assignment))
            .filter(job => job.status === 'pending' || job.status === 'accepted')
        );
      },
      error => console.error('Error loading assignment notifications:', error)
    );
  }, [user?.uid, user?.role]);

  useEffect(() => {
    if (!user?.uid) {
      setFinderNotifications([]);
      return;
    }

    try {
      return subscribeFinderNotificationEvents(
        setFinderNotifications,
        error => {
          console.error('Error loading Pump Finder notifications:', error);
          setFinderNotifications([]);
        }
      );
    } catch (error) {
      console.error('Error starting Pump Finder notifications:', error);
      setFinderNotifications([]);
    }
  }, [user?.uid]);

  const pendingInvites = useMemo(
    () => invites.filter(invite => invite.status === 'pending'),
    [invites]
  );
  const acceptedInvites = useMemo(
    () => invites
      .filter(invite => invite.status === 'accepted')
      .sort((a, b) => (b.acceptedAt || b.createdAt || '').localeCompare(a.acceptedAt || a.createdAt || '')),
    [invites]
  );
  const pendingAssignments = useMemo(
    () => assignments.filter(job => job.status === 'pending'),
    [assignments]
  );
  const acceptedAssignments = useMemo(
    () => assignments.filter(job => job.status === 'accepted'),
    [assignments]
  );

  useEffect(() => {
    if (!user?.uid) {
      setSeenNotificationIds(new Set());
      setSeenStateLoaded(false);
      return;
    }

    let active = true;
    setSeenStateLoaded(false);

    getSeenNotificationIds(user.uid).then(ids => {
      if (!active) return;
      setSeenNotificationIds(ids);
      setSeenStateLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [user?.uid, route.params?.openedAt]);

  const activeNotificationIds = useMemo(
    () =>
      notificationStorageIds({
        finderEventIds: finderNotifications.map(event => event.id),
        pendingJobIds: pendingAssignments.map(job => job.id),
        pendingInviteIds: pendingInvites.map(invite => invite.id),
      }),
    [finderNotifications, pendingAssignments, pendingInvites]
  );

  useEffect(() => {
    if (!user?.uid || !seenStateLoaded) return;

    const unreadNow = activeNotificationIds.filter(
      id => !seenNotificationIds.has(id)
    );
    const newThisVisit = unreadNow;

    if (newThisVisit.length > 0) {
      setSessionNewIds(current => {
        const next = new Set(current);
        newThisVisit.forEach(id => next.add(id));
        return next;
      });

      const optimistic = new Set(seenNotificationIds);
      newThisVisit.forEach(id => optimistic.add(id));
      setSeenNotificationIds(optimistic);

      markNotificationIdsSeen(user.uid, newThisVisit).catch(error =>
        console.warn('Could not mark notification center items as read:', error)
      );
    }
  }, [
    user?.uid,
    seenStateLoaded,
    activeNotificationIds,
    seenNotificationIds,
  ]);

  const isNewThisVisit = (id: string) => sessionNewIds.has(id);

  const markItemReadInView = (id: string) => {
    setSessionNewIds(current => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const handleAcceptInvite = async (invite: EmployeeInvite) => {
    markItemReadInView(`invite:${invite.id}`);
    if (!user) return;

    try {
      setIsWorking(invite.id);
      const result = await acceptEmployeeInvite(invite, user, updateProfile);
      Alert.alert(
        'You’re Connected',
        `You’re now connected to ${result.businessName}. New job assignments from them will appear here in Notifications.`,
        [
          {
            text: 'View Assignments',
            onPress: () => navigation.navigate('PendingJobs'),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Error accepting invitation from notifications:', error);
      Alert.alert('Couldn’t Accept Invite', 'Please try again.');
    } finally {
      setIsWorking(null);
    }
  };

  const handleDeclineInvite = (invite: EmployeeInvite) => {
    markItemReadInView(`invite:${invite.id}`);
    Alert.alert(
      'Decline Invitation?',
      `Decline the invitation from ${getInviteBusinessName(invite)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsWorking(invite.id);
              await declineEmployeeInvite(invite);
            } catch (error) {
              console.error('Error declining invitation from notifications:', error);
              Alert.alert('Couldn’t Decline Invite', 'Please try again.');
            } finally {
              setIsWorking(null);
            }
          },
        },
      ]
    );
  };

  const formatAssignmentDate = (date?: string) => {
    if (!date) return 'Date not set';
    try {
      return format(parseISO(date), 'EEE, MMM d, yyyy');
    } catch {
      return date;
    }
  };

  const hasEmployeeNotifications =
    finderNotifications.length > 0 ||
    pendingInvites.length > 0 ||
    acceptedInvites.length > 0 ||
    pendingAssignments.length > 0 ||
    acceptedAssignments.length > 0;

  const hasOwnerNotifications =
    finderNotifications.length > 0 || acceptedInvites.length > 0;

  const openFinderNotification = (event: FinderNotificationEvent) => {
    markItemReadInView(`finder:${event.id}`);
    navigation.navigate(event.actionRoute, event.actionParams);
  };

  const finderActionLabel = (event: FinderNotificationEvent) => {
    if (event.kind === 'available-job') return 'View Available Jobs';
    if (event.kind === 'interested-pumper') return 'View Interested Pumpers';
    if (event.kind === 'job-awarded') return 'Review & Confirm';
    return 'View Confirmed Job';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Pump Finder activity, invitations, job assignments, and account connections will appear here.
      </Text>

      {finderNotifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pump Finder</Text>
          {finderNotifications.map(event => {
            const storageId = `finder:${event.id}`;
            const isNew = isNewThisVisit(storageId);

            return (
              <Card
                key={event.id}
                style={[styles.card, isNew && styles.unreadCard]}
              >
                <Card.Content>
                  <View style={styles.cardHeading}>
                    <Text style={styles.cardTitle}>{event.title}</Text>
                    <Chip
                      compact
                      style={isNew ? styles.newChip : styles.finderChip}
                    >
                      {isNew ? 'New • Finder' : 'Finder'}
                    </Chip>
                  </View>
                  <Text style={styles.bodyText}>{event.message}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button
                    mode={event.kind === 'job-awarded' ? 'contained' : 'outlined'}
                    onPress={() => openFinderNotification(event)}
                  >
                    {finderActionLabel(event)}
                  </Button>
                </Card.Actions>
              </Card>
            );
          })}
        </View>
      )}

      {user?.role === 'employee' && pendingInvites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Invitations</Text>
          {pendingInvites.map(invite => {
            const isNew = isNewThisVisit(`invite:${invite.id}`);
            return (
            <Card
              key={invite.id}
              style={[styles.card, isNew && styles.unreadCard]}
            >
              <Card.Content>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{getInviteBusinessName(invite)}</Text>
                  <Chip compact style={isNew ? styles.newChip : styles.readChip}>
                    {isNew ? 'New' : 'Pending'}
                  </Chip>
                </View>
                <Text style={styles.bodyText}>
                  {invite.ownerName} invited you to join their team.
                </Text>
                <Text style={styles.metaText}>{invite.ownerEmail}</Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  onPress={() => handleDeclineInvite(invite)}
                  textColor={Colors.error}
                  disabled={isWorking === invite.id}
                >
                  Decline
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleAcceptInvite(invite)}
                  loading={isWorking === invite.id}
                  disabled={isWorking === invite.id}
                >
                  Accept
                </Button>
              </Card.Actions>
            </Card>
            );
          })}
        </View>
      )}

      {user?.role === 'employee' && pendingAssignments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New Job Assignments</Text>
          {pendingAssignments.map(job => {
            const isNew = isNewThisVisit(`job:${job.id}`);
            return (
            <Card
              key={job.id}
              style={[styles.card, isNew && styles.unreadCard]}
            >
              <Card.Content>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{job.companyName || 'Assigned Job'}</Text>
                  <Chip compact style={isNew ? styles.newChip : styles.readChip}>
                    {isNew ? 'New' : 'Pending'}
                  </Chip>
                </View>
                <Text style={styles.bodyText}>{formatAssignmentDate(job.date)}</Text>
                {(job.address || job.city) && (
                  <Text style={styles.metaText}>
                    {[job.address, job.city].filter(Boolean).join(', ')}
                  </Text>
                )}
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => {
                    markItemReadInView(`job:${job.id}`);
                    navigation.navigate('PendingJobs');
                  }}
                >
                  View Assignment
                </Button>
              </Card.Actions>
            </Card>
            );
          })}
        </View>
      )}

      {user?.role === 'employee' && acceptedAssignments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accepted Jobs</Text>
          {acceptedAssignments.map(job => (
            <Card key={job.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{job.companyName || 'Assigned Job'}</Text>
                  <Chip compact style={styles.acceptedChip}>Accepted</Chip>
                </View>
                <Text style={styles.bodyText}>{formatAssignmentDate(job.date)}</Text>
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => navigation.navigate('PendingJobs')}>
                  View Jobs
                </Button>
              </Card.Actions>
            </Card>
          ))}
        </View>
      )}

      {user?.role === 'employee' && acceptedInvites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connections</Text>
          {acceptedInvites.slice(0, 5).map(invite => (
            <Card key={invite.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{getInviteBusinessName(invite)}</Text>
                  <Chip compact style={styles.acceptedChip}>Connected</Chip>
                </View>
                <Text style={styles.bodyText}>
                  You’re connected to {invite.ownerName}’s team.
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {user?.role === 'owner' && acceptedInvites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Updates</Text>
          {acceptedInvites.slice(0, 10).map(invite => (
            <Card key={invite.id} style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeading}>
                  <Text style={styles.cardTitle}>{invite.employeeName || invite.employeeEmail}</Text>
                  <Chip compact style={styles.acceptedChip}>Joined</Chip>
                </View>
                <Text style={styles.bodyText}>
                  This employee accepted your team invitation.
                </Text>
                {invite.acceptedAt && (
                  <Text style={styles.metaText}>
                    {formatAssignmentDate(invite.acceptedAt)}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))}
          <Button mode="outlined" onPress={() => navigation.navigate('EmployeeManagement')}>
            Manage Employees
          </Button>
        </View>
      )}

      {((user?.role === 'employee' && !hasEmployeeNotifications) ||
        (user?.role === 'owner' && !hasOwnerNotifications)) && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyTitle}>You’re all caught up</Text>
            <Text style={styles.bodyText}>
              New Pump Finder activity, invitations, job assignments, and account updates will show here.
            </Text>
          </Card.Content>
        </Card>
      )}

      <Divider style={styles.divider} />
      <Text style={styles.footerText}>
        Pump Finder alerts are live in-app during development. Push notifications can be layered on after the marketplace flow is stable.
      </Text>
    </ScrollView>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  intro: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  card: {
    marginBottom: 12,
    backgroundColor: Colors.surface,
  },
  unreadCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  cardHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bodyText: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 6,
  },
  newChip: {
    backgroundColor: Colors.warningBg,
  },
  acceptedChip: {
    backgroundColor: Colors.successBg,
  },
  finderChip: {
    backgroundColor: Colors.primaryBg,
  },
  readChip: {
    backgroundColor: Colors.surfaceDark,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: Colors.border,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));
