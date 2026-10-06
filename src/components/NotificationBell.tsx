// src/components/NotificationBell.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Badge, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import {
  collection,
  getFirestore,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useAppTheme, makeStyles } from '../theme';
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

export default function NotificationBell() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [pendingJobIds, setPendingJobIds] = useState<string[]>([]);
  const [pendingInviteIds, setPendingInviteIds] = useState<string[]>([]);
  const [finderEvents, setFinderEvents] = useState<FinderNotificationEvent[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid) {
      setSeenIds(new Set());
      return;
    }

    let active = true;
    getSeenNotificationIds(user.uid).then(ids => {
      if (active) setSeenIds(ids);
    });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || user.role !== 'employee') {
      setPendingJobIds([]);
      return;
    }

    const jobsRef = collection(db, 'users', user.uid, 'ownerJobs');
    return onSnapshot(
      jobsRef,
      snapshot => {
        setPendingJobIds(
          snapshot.docs
            .filter(snapshotDoc => snapshotDoc.data().status === 'pending')
            .map(snapshotDoc => snapshotDoc.id)
        );
      },
      error => console.error('Error loading job notification count:', error)
    );
  }, [user?.uid, user?.role]);

  useEffect(() => {
    if (!user?.email || user.role !== 'employee') {
      setPendingInviteIds([]);
      return;
    }

    const invitesRef = collection(db, 'employeeInvites');
    const q = query(
      invitesRef,
      where('employeeEmail', '==', user.email.toLowerCase())
    );

    return onSnapshot(
      q,
      snapshot => {
        setPendingInviteIds(
          snapshot.docs
            .filter(snapshotDoc => snapshotDoc.data().status === 'pending')
            .map(snapshotDoc => snapshotDoc.id)
        );
      },
      error => console.error('Error loading invite notification count:', error)
    );
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (!user?.uid) {
      setFinderEvents([]);
      return;
    }

    try {
      return subscribeFinderNotificationEvents(
        setFinderEvents,
        error => {
          console.error('Error loading Pump Finder notification count:', error);
          setFinderEvents([]);
        }
      );
    } catch (error) {
      console.error('Error starting Pump Finder notifications:', error);
      setFinderEvents([]);
    }
  }, [user?.uid]);

  const activeNotificationIds = useMemo(
    () =>
      notificationStorageIds({
        finderEventIds: finderEvents.map(event => event.id),
        pendingJobIds,
        pendingInviteIds,
      }),
    [finderEvents, pendingJobIds, pendingInviteIds]
  );

  const unreadIds = useMemo(
    () => activeNotificationIds.filter(id => !seenIds.has(id)),
    [activeNotificationIds, seenIds]
  );

  if (!user) {
    return null;
  }

  const handleOpenNotifications = async () => {
    const idsToHighlight = [...unreadIds];

    if (idsToHighlight.length > 0) {
      const optimistic = new Set(seenIds);
      idsToHighlight.forEach(id => optimistic.add(id));
      setSeenIds(optimistic);

      // Persist before opening so the bell badge clears immediately. The
      // Notifications screen receives the IDs that were new at tap time and
      // still highlights them during this first read.
      markNotificationIdsSeen(user.uid, idsToHighlight).catch(error =>
        console.warn('Could not mark notifications as read:', error)
      );
    }

    navigation.navigate('Notifications', {
      highlightNotificationIds: idsToHighlight,
      openedAt: Date.now(),
    });
  };

  const notificationCount = unreadIds.length;

  return (
    <TouchableOpacity
      onPress={handleOpenNotifications}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={
        notificationCount > 0
          ? `Notifications, ${notificationCount} new`
          : 'Notifications'
      }
    >
      <View>
        <IconButton
          icon={notificationCount > 0 ? 'bell' : 'bell-outline'}
          size={24}
          iconColor={Colors.onHeader}
          style={styles.iconButton}
        />
        {notificationCount > 0 && (
          <Badge style={styles.badge}>
            {notificationCount > 99 ? '99+' : notificationCount}
          </Badge>
        )}
      </View>
    </TouchableOpacity>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: {
    marginRight: 4,
  },
  iconButton: {
    margin: 0,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    color: Colors.onPrimary,
    fontSize: 10,
    minWidth: 18,
    height: 18,
  },
}));
