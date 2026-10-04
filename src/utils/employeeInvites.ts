import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from '../types';

const db = getFirestore();

export interface EmployeeInvite {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerBusinessName?: string;
  employeeEmail: string;
  employeeName?: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
}

export const getInviteBusinessName = (invite: EmployeeInvite) =>
  invite.ownerBusinessName || invite.ownerName || 'your employer';

export async function acceptEmployeeInvite(
  invite: EmployeeInvite,
  user: User,
  updateProfile: (data: Partial<User>) => Promise<void>
) {
  if (!user.uid || !user.email) {
    throw new Error('A signed-in employee account is required to accept an invitation.');
  }

  const normalizedEmail = user.email.toLowerCase();
  const ownerEmployeesRef = collection(db, 'users', invite.ownerId, 'employees');
  const existingEmployeeQuery = query(
    ownerEmployeesRef,
    where('email', '==', normalizedEmail)
  );
  const existingEmployeeSnapshot = await getDocs(existingEmployeeQuery);

  const invitePlaceholder = existingEmployeeSnapshot.docs.find(snapshot => {
    const data = snapshot.data() as any;
    return snapshot.id !== user.uid && data.inviteId === invite.id;
  });
  const invitePlaceholderData = invitePlaceholder?.data() as any | undefined;

  const activeEmployeeRef = doc(db, 'users', invite.ownerId, 'employees', user.uid);
  const activeEmployeeSnapshot = await getDoc(activeEmployeeRef);
  const activeEmployeeData = activeEmployeeSnapshot.exists()
    ? activeEmployeeSnapshot.data() as any
    : undefined;

  if (
    activeEmployeeData &&
    (
      activeEmployeeData.status !== 'active' ||
      (activeEmployeeData.ownerId && activeEmployeeData.ownerId !== invite.ownerId)
    )
  ) {
    throw new Error('An unexpected employee relationship already exists for this owner.');
  }

  const commissionRate =
    activeEmployeeData?.commissionRate ??
    invitePlaceholderData?.commissionRate ??
    user.commissionRate ??
    50;
  const keepsCash =
    activeEmployeeData?.keepsCash ??
    invitePlaceholderData?.keepsCash ??
    false;
  const keepsCheck =
    activeEmployeeData?.keepsCheck ??
    invitePlaceholderData?.keepsCheck ??
    false;

  const acceptedAt = new Date().toISOString();
  const inviteRef = doc(db, 'employeeInvites', invite.id);
  const batch = writeBatch(db);

  batch.update(inviteRef, {
    status: 'accepted',
    acceptedAt,
    acceptedByUid: user.uid,
    acceptedByEmail: normalizedEmail,
  });

  if (!activeEmployeeSnapshot.exists()) {
    batch.set(activeEmployeeRef, {
      uid: user.uid,
      email: normalizedEmail,
      name: invitePlaceholderData?.name || user.displayName || 'Employee',
      displayName: user.displayName || 'Employee',
      status: 'active',
      commissionRate,
      keepsCash,
      keepsCheck,
      ownerId: invite.ownerId,
      inviteId: invite.id,
      acceptedAt,
    });
  }

  if (invitePlaceholder) {
    batch.delete(invitePlaceholder.ref);
  }

  await batch.commit();

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

  return {
    businessName: getInviteBusinessName(invite),
    commissionRate,
    keepsCash,
    keepsCheck,
  };
}

export async function declineEmployeeInvite(invite: EmployeeInvite) {
  await deleteDoc(doc(db, 'employeeInvites', invite.id));
}
