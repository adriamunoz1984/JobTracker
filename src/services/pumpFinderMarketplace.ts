import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { FinderJobDraft } from '../types/pumpFinder';

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
