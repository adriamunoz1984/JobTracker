// src/components/EmployeeInviteChecker.tsx
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import {
  acceptEmployeeInvite,
  declineEmployeeInvite,
  EmployeeInvite,
  getInviteBusinessName,
} from '../utils/employeeInvites';

const db = getFirestore();

export default function EmployeeInviteChecker() {
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<EmployeeInvite[]>([]);
  const [currentInvite, setCurrentInvite] = useState<EmployeeInvite | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.email || user?.role !== 'employee') {
      setPendingInvites([]);
      setCurrentInvite(null);
      setShowDialog(false);
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
        const invites = snapshot.docs
          .map(snapshotDoc => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data(),
          } as EmployeeInvite))
          .filter(invite => invite.status === 'pending');

        setPendingInvites(invites);
        console.log(`📨 Found ${invites.length} pending invitations`);
      },
      error => console.error('Error loading employee invitations:', error)
    );
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (showDialog || currentInvite) return;

    const nextInvite = pendingInvites.find(invite => !dismissedInviteIds.has(invite.id));
    if (nextInvite) {
      setCurrentInvite(nextInvite);
      setShowDialog(true);
    }
  }, [pendingInvites, dismissedInviteIds, currentInvite, showDialog]);

  useEffect(() => {
    if (!currentInvite || !showDialog) return;

    const invite = currentInvite;
    const businessName = getInviteBusinessName(invite);

    Alert.alert(
      'Team Invitation',
      `${businessName} has invited you to join their team. You can accept now or choose Later and handle it from Notifications.`,
      [
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => handleDeclineInvite(invite),
        },
        {
          text: 'Later',
          style: 'cancel',
          onPress: () => handleLater(invite),
        },
        {
          text: 'Accept',
          onPress: () => handleAcceptInvite(invite),
        },
      ],
      { cancelable: false }
    );
  }, [currentInvite, showDialog]);

  const closeCurrentInvite = () => {
    setShowDialog(false);
    setCurrentInvite(null);
  };

  const handleLater = (invite: EmployeeInvite) => {
    setDismissedInviteIds(previous => {
      const next = new Set(previous);
      next.add(invite.id);
      return next;
    });
    closeCurrentInvite();
  };

  const handleAcceptInvite = async (invite: EmployeeInvite) => {
    if (!user) return;

    try {
      const result = await acceptEmployeeInvite(invite, user, updateProfile);
      closeCurrentInvite();

      Alert.alert(
        'You’re Connected',
        `You’re now connected to ${result.businessName}. New job assignments and team updates will appear under Notifications.`,
        [
          {
            text: 'View Notifications',
            onPress: () => navigation.navigate('Notifications'),
          },
          { text: 'OK' },
        ]
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      closeCurrentInvite();
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvite = async (invite: EmployeeInvite) => {
    try {
      await declineEmployeeInvite(invite);
      closeCurrentInvite();
    } catch (error) {
      console.error('Error declining invitation:', error);
      closeCurrentInvite();
      Alert.alert('Error', 'Failed to decline invitation. Please try again.');
    }
  };

  return null;
}
