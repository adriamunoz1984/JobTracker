// src/components/NotificationBell.tsx
import React, { useEffect, useState } from 'react';
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

const db = getFirestore();

export default function NotificationBell() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [pendingJobCount, setPendingJobCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  useEffect(() => {
    if (!user?.uid || user.role !== 'employee') {
      setPendingJobCount(0);
      return;
    }

    const jobsRef = collection(db, 'users', user.uid, 'ownerJobs');
    return onSnapshot(
      jobsRef,
      snapshot => {
        const count = snapshot.docs.filter(
          snapshotDoc => snapshotDoc.data().status === 'pending'
        ).length;
        setPendingJobCount(count);
      },
      error => console.error('Error loading job notification count:', error)
    );
  }, [user?.uid, user?.role]);

  useEffect(() => {
    if (!user?.email || user.role !== 'employee') {
      setPendingInviteCount(0);
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
        const count = snapshot.docs.filter(
          snapshotDoc => snapshotDoc.data().status === 'pending'
        ).length;
        setPendingInviteCount(count);
      },
      error => console.error('Error loading invite notification count:', error)
    );
  }, [user?.email, user?.role]);

  if (!user) {
    return null;
  }

  const notificationCount = pendingJobCount + pendingInviteCount;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
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
