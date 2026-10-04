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

      // Preserve any commission/payment settings the owner already set on the invite record.
      const ownerEmployeesRef = collection(db, 'users', invite.ownerId, 'employees');
      const existingEmployeeQuery = query(
        ownerEmployeesRef,
        where('email', '==', user!.email!.toLowerCase())
      );
      const existingEmployeeSnapshot = await getDocs(existingEmployeeQuery);
      const existingEmployeeData = existingEmployeeSnapshot.docs[0]?.data() as any | undefined;

      const commissionRate = existingEmployeeData?.commissionRate ?? user?.commissionRate ?? 50;
      const keepsCash = existingEmployeeData?.keepsCash ?? false;
      const keepsCheck = existingEmployeeData?.keepsCheck ?? false;

      // Atomically mark the invitation accepted and create the active
      // owner/employee relationship that future Firestore rules can verify.
      const acceptedAt = new Date().toISOString();
      const inviteRef = doc(db, 'employeeInvites', invite.id);
      const activeEmployeeRef = doc(db, 'users', invite.ownerId, 'employees', user!.uid);
      const batch = writeBatch(db);

      batch.update(inviteRef, {
        status: 'accepted',
        acceptedAt,
        acceptedByUid: user!.uid,
        acceptedByEmail: user!.email?.toLowerCase() || null,
      });

      batch.set(activeEmployeeRef, {
        uid: user!.uid,
        email: user!.email?.toLowerCase() || '',
        name: existingEmployeeData?.name || user!.displayName || 'Employee',
        displayName: user!.displayName || 'Employee',
        status: 'active',
        commissionRate,
        keepsCash,
        keepsCheck,
        ownerId: invite.ownerId,
        inviteId: invite.id,
        acceptedAt,
      }, { merge: true });

      // Delete the temporary invited row in the same atomic write. Previously
      // this cleanup ran afterward as a separate delete, which correctly
      // failed under the release security rules because only the owner could
      // delete employee records.
      existingEmployeeSnapshot.docs
        .filter(snapshot => snapshot.id !== user!.uid)
        .forEach(snapshot => batch.delete(snapshot.ref));

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