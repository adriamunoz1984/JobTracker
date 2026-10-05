import {
  collection,
  doc,
  getDoc,
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
  FinderPublicJob,
  FinderRequestStatus,
} from '../types/pumpFinder';

function cleanOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Creates the first Pump Finder marketplace record as two documents in one batch:
 *
 * finderJobs/{jobId}
 *   Browseable/matchable job data only. Never stores the exact address,
 *   customer name, access codes, or other private contact/access information.
 *
 * finderJobPrivate/{jobId}
 *   Poster-only/private details. Later, Firestore rules will also allow the
 *   awarded pumper to read this document only after that pumper confirms.
 *
 * The production JobTracker rules still deny these collections. This service is
 * intentionally staged on the Pump Finder development branch until the Finder
 * rules are tested and deliberately deployed.
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
        // Posters should not see their own jobs in the pumper availability feed.
        .filter(job => job.posterId !== currentUser.uid)
        // Local calendar dates sort correctly in yyyy-MM-dd form.
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

export async function requestFinderJob(jobId: string) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to request a Pump Finder job.');
  }

  const jobRef = doc(db, 'finderJobs', jobId);
  const requestRef = doc(db, 'finderJobs', jobId, 'requests', currentUser.uid);

  const [jobSnapshot, requestSnapshot] = await Promise.all([
    getDoc(jobRef),
    getDoc(requestRef),
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

  await setDoc(requestRef, {
    jobId,
    pumperId: currentUser.uid,
    status: 'pending',
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
