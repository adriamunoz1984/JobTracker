// src/components/EmployeeInviteChecker.tsx
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const db = getFirestore();

interface Invite {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerBusinessName?: string;
  employeeEmail: string;
  status: string;
  createdAt: string;
}

export default function EmployeeInviteChecker() {
  const { user, updateProfile } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!user?.email || user?.role !== 'employee') return;

    console.log('🔍 Employee invite checker started for:', user.email);

    const invitesRef = collection(db, 'employeeInvites');
    const q = query(
      invitesRef,
      where('employeeEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invite));

      console.log(`📨 Found ${invites.length} pending invitations`);
      setPendingInvites(invites);

      if (invites.length > 0 && !showDialog) {
        setCurrentInvite(invites[0]);
        setShowDialog(true);
      }
    });

    return () => unsubscribe();
  }, [user?.email, user?.role]);

  useEffect(() => {
    if (currentInvite && showDialog) {
      showInviteDialog(currentInvite);
    }
  }, [currentInvite, showDialog]);

  const showInviteDialog = (invite: Invite) => {
    const businessName = invite.ownerBusinessName || invite.ownerName;
    
    Alert.alert(
      'Job Invitation',
      `${businessName} has invited you to join their team!\n\nOwner: ${invite.ownerName}\nEmail: ${invite.ownerEmail}`,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: () => handleDeclineInvite(invite)
        },
        {
          text: 'Accept',
          onPress: () => handleAcceptInvite(invite)
        }
      ],
      { cancelable: false }
    );
  };

  const handleAcceptInvite = async (invite: Invite) => {
    try {
      console.log(`✅ Accepting invitation from ${invite.ownerName}`);

      // Remove from pending list
      const remaining = pendingInvites.filter(inv => inv.id !== invite.id);
      setPendingInvites(remaining);

      // Preserve the owner's settings from this specific invitation placeholder.
      // There can be stale rows from older test invitations with the same email,
      // so do not use the first email match blindly.
      const ownerEmployeesRef = collection(db, 'users', invite.ownerId, 'employees');
      const existingEmployeeQuery = query(
        ownerEmployeesRef,
        where('email', '==', user!.email!.toLowerCase())
      );
      const existingEmployeeSnapshot = await getDocs(existingEmployeeQuery);
      const invitePlaceholder = existingEmployeeSnapshot.docs.find(snapshot => {
        const data = snapshot.data() as any;
        return snapshot.id !== user!.uid && data.inviteId === invite.id;
      });
      const invitePlaceholderData = invitePlaceholder?.data() as any | undefined;

      const activeEmployeeRef = doc(db, 'users', invite.ownerId, 'employees', user!.uid);
      const activeEmployeeSnapshot = await getDoc(activeEmployeeRef);
      const activeEmployeeData = activeEmployeeSnapshot.exists()
        ? activeEmployeeSnapshot.data() as any
        : undefined;

      if (
        activeEmployeeData &&
        (activeEmployeeData.status !== 'active' || activeEmployeeData.ownerId !== invite.ownerId)
      ) {
        throw new Error('An unexpected employee relationship already exists for this owner.');
      }

      const commissionRate =
        activeEmployeeData?.commissionRate ??
        invitePlaceholderData?.commissionRate ??
        user?.commissionRate ??
        50;
      const keepsCash =
        activeEmployeeData?.keepsCash ??
        invitePlaceholderData?.keepsCash ??
        false;
      const keepsCheck =
        activeEmployeeData?.keepsCheck ??
        invitePlaceholderData?.keepsCheck ??
        false;

      // Atomically mark the invitation accepted and create the active
      // relationship only when it does not already exist. This makes accepting
      // a replacement/duplicate invite safe after a previous partial test.
      const acceptedAt = new Date().toISOString();
      const inviteRef = doc(db, 'employeeInvites', invite.id);
      const batch = writeBatch(db);

      batch.update(inviteRef, {
        status: 'accepted',
        acceptedAt,
        acceptedByUid: user!.uid,
        acceptedByEmail: user!.email?.toLowerCase() || null,
      });

      if (!activeEmployeeSnapshot.exists()) {
        batch.set(activeEmployeeRef, {
          uid: user!.uid,
          email: user!.email?.toLowerCase() || '',
          name: invitePlaceholderData?.name || user!.displayName || 'Employee',
          displayName: user!.displayName || 'Employee',
          status: 'active',
          commissionRate,
          keepsCash,
          keepsCheck,
          ownerId: invite.ownerId,
          inviteId: invite.id,
          acceptedAt,
        });
      }

      // Delete only the temporary row belonging to this invitation. Deleting
      // every row with the same email can touch stale invitations and cause
      // the entire Firestore batch to be rejected by the security rules.
      if (invitePlaceholder) {
        batch.delete(invitePlaceholder.ref);
      }

      await batch.commit();

      // Update the employee's own profile only after the owner relationship
      // has been committed successfully, so a failed acceptance cannot leave
      // the profile claiming an active connection that does not exist.
      await updateProfile({
        role: 'employee',
        ownerStatus: 'active',
        ownerId: invite.ownerId,
        ownerName: invite.ownerName,
        ownerEmail: invite.ownerEmail,
        commissionRate,
        keepsCash,
        keepsCheck,
      } as any);

      console.log(`✅ Successfully accepted invitation from ${invite.ownerName}`);

      // Show next invite or close dialog
      if (remaining.length > 0) {
        setCurrentInvite(remaining[0]);
      } else {
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvite = async (invite: Invite) => {
    try {
      console.log(`❌ Declining invitation from ${invite.ownerName}`);

      // Remove from pending list
      const remaining = pendingInvites.filter(inv => inv.id !== invite.id);
      setPendingInvites(remaining);

      // Delete the invite
      await deleteDoc(doc(db, 'employeeInvites', invite.id));

      console.log(`✅ Successfully declined invitation from ${invite.ownerName}`);

      // Show next invite or close dialog
      if (remaining.length > 0) {
        setCurrentInvite(remaining[0]);
      } else {
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation. Please try again.');
    }
  };

  return null;
}