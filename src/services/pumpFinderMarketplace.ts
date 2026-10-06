import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  FinderJobDraft,
  FinderJobRequest,
  FinderPrivateJobDetails,
  FinderPublicJob,
  FinderRequestStatus,
} from '../types/pumpFinder';

function cleanOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Creates a Pump Finder marketplace job as two documents in one atomic batch:
 *
 * finderJobs/{jobId}
 *   Browseable/matchable job data only. Never stores the exact address,
 *   customer name, access codes, or other private contact/access information.
 *
 * finderJobPrivate/{jobId}
 *   Poster-only/private details. Finder rules also allow the selected pumper
 *   to read this document only after that pumper confirms the award.
 */
export async function createFinderJob(draft: FinderJobDraft) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to post a Pump Finder job.');
  }

  if (!draft.generalArea.trim() || !draft.exactAddress.trim() || !draft.customerName.trim()) {
    throw new Error('Customer, general area, and exact address are required.');
  }

  const publicJobRef = doc(collection(db, 'finderJobs'));
  const privateJobRef = doc(db, 'finderJobPrivate', publicJobRef.id);
  const batch = writeBatch(db);

  const publicNotes = cleanOptionalString(draft.notes);
  const privateNotes = cleanOptionalString(draft.privateNotes);

  batch.set(publicJobRef, {
    posterId: currentUser.uid,
    jobDate: draft.jobDate,
    startTime: draft.startTime,
    generalArea: draft.generalArea.trim(),
    ...(draft.yards !== undefined ? { yards: draft.yards } : {}),
    ...(cleanOptionalString(draft.pumpType) ? { pumpType: draft.pumpType!.trim() } : {}),
    ...(draft.concretePsi !== undefined ? { concretePsi: draft.concretePsi } : {}),
    pricingMode: draft.pricingMode,
    extraHoseRequired: draft.extraHoseRequired,
    ...(draft.totalHoseFeet !== undefined ? { totalHoseFeet: draft.totalHoseFeet } : {}),
    ppeRequired: draft.ppeRequired,
    requiredPpe: draft.requiredPpe,
    ...(publicNotes ? { notes: publicNotes } : {}),
    status: 'unassigned',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(privateJobRef, {
    jobId: publicJobRef.id,
    posterId: currentUser.uid,
    customerName: draft.customerName.trim(),
    exactAddress: draft.exactAddress.trim(),
    ...(privateNotes ? { privateNotes } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  return publicJobRef.id;
}

export function subscribeAvailableFinderJobs(
  onJobs: (jobs: FinderPublicJob[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to browse Pump Finder jobs.');
  }

  const availableJobsQuery = query(
    collection(db, 'finderJobs'),
    where('status', '==', 'unassigned')
  );

  return onSnapshot(
    availableJobsQuery,
    snapshot => {
      const jobs = snapshot.docs
        .map(snapshotDoc => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<FinderPublicJob, 'id'>),
        }))
        .filter(job => job.posterId !== currentUser.uid)
        .sort((a, b) => {
          const dateCompare = a.jobDate.localeCompare(b.jobDate);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

      onJobs(jobs);
    },
    error => {
      onError?.(error);
    }
  );
}

export function subscribeMyPostedFinderJobs(
  onJobs: (jobs: FinderPublicJob[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to view your posted Pump Finder jobs.');
  }

  const myJobsQuery = query(
    collection(db, 'finderJobs'),
    where('posterId', '==', currentUser.uid)
  );

  return onSnapshot(
    myJobsQuery,
    snapshot => {
      const jobs = snapshot.docs
        .map(snapshotDoc => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<FinderPublicJob, 'id'>),
        }))
        .sort((a, b) => {
          const dateCompare = b.jobDate.localeCompare(a.jobDate);
          if (dateCompare !== 0) return dateCompare;
          return b.startTime.localeCompare(a.startTime);
        });

      onJobs(jobs);
    },
    error => onError?.(error)
  );
}

export function subscribeFinderJob(
  jobId: string,
  onJob: (job: FinderPublicJob | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'finderJobs', jobId),
    snapshot => {
      onJob(
        snapshot.exists()
          ? {
              id: snapshot.id,
              ...(snapshot.data() as Omit<FinderPublicJob, 'id'>),
            }
          : null
      );
    },
    error => onError?.(error)
  );
}

export function subscribeFinderJobRequests(
  jobId: string,
  onRequests: (requests: FinderJobRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'finderJobs', jobId, 'requests'),
    snapshot => {
      const requests = snapshot.docs.map(snapshotDoc => ({
        id: snapshotDoc.id,
        ...(snapshotDoc.data() as Omit<FinderJobRequest, 'id'>),
      }));
      onRequests(requests);
    },
    error => onError?.(error)
  );
}

export async function requestFinderJob(jobId: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to request a Pump Finder job.');
  }

  const jobRef = doc(db, 'finderJobs', jobId);
  const requestRef = doc(db, 'finderJobs', jobId, 'requests', currentUser.uid);
  const profileRef = doc(db, 'users', currentUser.uid, 'profile', 'data');

  const [jobSnapshot, requestSnapshot, profileSnapshot] = await Promise.all([
    getDoc(jobRef),
    getDoc(requestRef),
    getDoc(profileRef),
  ]);

  if (!jobSnapshot.exists()) {
    throw new Error('This job is no longer available.');
  }

  const job = jobSnapshot.data() as any;

  if (job.posterId === currentUser.uid) {
    throw new Error('You cannot request your own posted job.');
  }

  if (job.status !== 'unassigned') {
    throw new Error('This job is no longer accepting requests.');
  }

  if (requestSnapshot.exists()) {
    const existingStatus = requestSnapshot.data().status as FinderRequestStatus;

    if (existingStatus === 'pending') {
      throw new Error('You already told the poster you are available for this job.');
    }

    if (existingStatus === 'awarded' || existingStatus === 'confirmed') {
      throw new Error('This job has already been awarded to you.');
    }

    throw new Error('You already responded to this job.');
  }

  const profile = profileSnapshot.exists() ? (profileSnapshot.data() as any) : {};
  const finderProfile = profile?.pumpFinderProfile || {};

  await setDoc(requestRef, {
    jobId,
    pumperId: currentUser.uid,
    status: 'pending',
    pumperName: profile?.displayName || currentUser.displayName || 'Pumper',
    businessName: profile?.businessName || '',
    pumpType: finderProfile?.pumpType || '',
    serviceArea: finderProfile?.serviceArea || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getMyFinderRequestStatuses(jobIds: string[]) {
  const currentUser = auth.currentUser;
  const result: Record<string, FinderRequestStatus> = {};

  if (!currentUser || jobIds.length === 0) {
    return result;
  }

  await Promise.all(
    jobIds.map(async jobId => {
      const requestSnapshot = await getDoc(
        doc(db, 'finderJobs', jobId, 'requests', currentUser.uid)
      );

      if (requestSnapshot.exists()) {
        result[jobId] = requestSnapshot.data().status as FinderRequestStatus;
      }
    })
  );

  return result;
}

export async function awardFinderPumper(jobId: string, pumperId: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to award a Pump Finder job.');
  }

  const jobRef = doc(db, 'finderJobs', jobId);
  const jobSnapshot = await getDoc(jobRef);

  if (!jobSnapshot.exists()) {
    throw new Error('This Pump Finder job no longer exists.');
  }

  const job = jobSnapshot.data() as any;

  if (job.posterId !== currentUser.uid) {
    throw new Error('Only the original poster can award this job.');
  }

  if (job.status !== 'unassigned') {
    throw new Error('This job has already moved past the request stage.');
  }

  const requestsSnapshot = await getDocs(
    collection(db, 'finderJobs', jobId, 'requests')
  );

  const selectedRequest = requestsSnapshot.docs.find(
    requestDoc => requestDoc.id === pumperId
  );

  if (!selectedRequest || selectedRequest.data().status !== 'pending') {
    throw new Error('That pumper is no longer waiting for an award.');
  }

  const batch = writeBatch(db);

  batch.update(jobRef, {
    status: 'award-pending',
    awardedPumperId: pumperId,
    awardedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  requestsSnapshot.docs.forEach(requestDoc => {
    if (requestDoc.data().status !== 'pending') return;

    batch.update(requestDoc.ref, {
      status: requestDoc.id === pumperId ? 'awarded' : 'declined',
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}


export function subscribeMyAwardedFinderJobs(
  onJobs: (jobs: FinderPublicJob[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to view awarded Pump Finder jobs.');
  }

  const awardedJobsQuery = query(
    collection(db, 'finderJobs'),
    where('awardedPumperId', '==', currentUser.uid)
  );

  return onSnapshot(
    awardedJobsQuery,
    snapshot => {
      const jobs = snapshot.docs
        .map(snapshotDoc => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<FinderPublicJob, 'id'>),
        }))
        .filter(job =>
          ['award-pending', 'assigned', 'in-progress'].includes(job.status)
        )
        .sort((a, b) => {
          const dateCompare = a.jobDate.localeCompare(b.jobDate);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

      onJobs(jobs);
    },
    error => onError?.(error)
  );
}

export async function confirmFinderAward(jobId: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to confirm a Pump Finder award.');
  }

  const jobRef = doc(db, 'finderJobs', jobId);
  const requestRef = doc(db, 'finderJobs', jobId, 'requests', currentUser.uid);

  const [jobSnapshot, requestSnapshot] = await Promise.all([
    getDoc(jobRef),
    getDoc(requestRef),
  ]);

  if (!jobSnapshot.exists()) {
    throw new Error('This Pump Finder job no longer exists.');
  }

  if (!requestSnapshot.exists()) {
    throw new Error('Your Pump Finder request could not be found.');
  }

  const job = jobSnapshot.data() as any;
  const requestData = requestSnapshot.data() as any;

  if (job.awardedPumperId !== currentUser.uid) {
    throw new Error('This job was not awarded to your account.');
  }

  if (job.status === 'assigned' && requestData.status === 'confirmed') {
    return;
  }

  if (job.status !== 'award-pending' || requestData.status !== 'awarded') {
    throw new Error('This award is no longer waiting for confirmation.');
  }

  const batch = writeBatch(db);

  batch.update(requestRef, {
    status: 'confirmed',
    updatedAt: serverTimestamp(),
  });

  batch.update(jobRef, {
    status: 'assigned',
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function getFinderPrivateDetails(
  jobId: string
): Promise<FinderPrivateJobDetails> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to view private job details.');
  }

  const privateSnapshot = await getDoc(
    doc(db, 'finderJobPrivate', jobId)
  );

  if (!privateSnapshot.exists()) {
    throw new Error('Private job details could not be found.');
  }

  return privateSnapshot.data() as FinderPrivateJobDetails;
}
