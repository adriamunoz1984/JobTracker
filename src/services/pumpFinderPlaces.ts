import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  FinderPumperPlace,
  FinderPumperPlaceDraft,
} from '../types/pumpFinder';

function cleanText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function createFinderPumperPlace(draft: FinderPumperPlaceDraft) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to add a pumper-friendly place.');
  }

  const name = draft.name.trim();
  const address = draft.address.trim();
  const generalArea = draft.generalArea.trim();

  if (!name || !address || !generalArea) {
    throw new Error('Place name, address, and general area are required.');
  }

  if (!Number.isFinite(draft.pumperRating) || draft.pumperRating < 1 || draft.pumperRating > 5) {
    throw new Error('Choose a pumper-friendly rating from 1 to 5.');
  }

  if (
    draft.dieselPrice !== undefined &&
    (!Number.isFinite(draft.dieselPrice) || draft.dieselPrice <= 0)
  ) {
    throw new Error('Enter a valid diesel price or leave it blank.');
  }

  const placeRef = doc(collection(db, 'finderPlaces'));
  const notes = cleanText(draft.notes);

  await setDoc(placeRef, {
    createdBy: currentUser.uid,
    name,
    category: draft.category,
    address,
    generalArea,
    features: draft.features,
    ...(notes ? { notes } : {}),
    pumperRating: draft.pumperRating,
    dieselPrice: draft.dieselPrice ?? null,
    dieselPriceUpdatedAt:
      draft.dieselPrice !== undefined ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return placeRef.id;
}

export function subscribeFinderPumperPlaces(
  onPlaces: (places: FinderPumperPlace[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'finderPlaces'),
    snapshot => {
      const places = snapshot.docs
        .map(snapshotDoc => ({
          id: snapshotDoc.id,
          ...(snapshotDoc.data() as Omit<FinderPumperPlace, 'id'>),
        }))
        .sort((a, b) => {
          const ratingCompare = (b.pumperRating || 0) - (a.pumperRating || 0);
          if (ratingCompare !== 0) return ratingCompare;
          return a.name.localeCompare(b.name);
        });

      onPlaces(places);
    },
    error => onError?.(error)
  );
}
