import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import {
  FinderPublicPumperProfile,
  PumpFinderBusinessProfile,
} from '../types/pumpFinder';

function publicProfilePayload({
  uid,
  displayName,
  businessName,
  pumpFinderProfile,
}: {
  uid: string;
  displayName: string;
  businessName?: string;
  pumpFinderProfile: PumpFinderBusinessProfile;
}) {
  return {
    pumperId: uid,
    displayName: displayName.trim(),
    businessName: businessName?.trim() || '',
    pumpType: pumpFinderProfile.pumpType?.trim() || '',
    serviceArea: pumpFinderProfile.serviceArea?.trim() || '',
    hoseIncludedFt: pumpFinderProfile.hoseIncludedFt ?? 0,
    extraHoseRatePerFt: pumpFinderProfile.extraHoseRatePerFt ?? 0,
    standardPsiMax: pumpFinderProfile.standardPsiMax ?? 0,
    highPsiSurcharge: pumpFinderProfile.highPsiSurcharge ?? null,
    ppeAvailable: pumpFinderProfile.ppeAvailable || [],
    updatedAt: serverTimestamp(),
  };
}

export async function savePublicFinderProfile({
  displayName,
  businessName,
  pumpFinderProfile,
}: {
  displayName: string;
  businessName?: string;
  pumpFinderProfile: PumpFinderBusinessProfile;
}) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error('You must be signed in to save a Pump Finder profile.');
  }

  if (!displayName.trim()) {
    throw new Error('A public pumper name is required.');
  }

  await setDoc(
    doc(db, 'finderPumperProfiles', currentUser.uid),
    publicProfilePayload({
      uid: currentUser.uid,
      displayName,
      businessName,
      pumpFinderProfile,
    })
  );
}

export function subscribePublicFinderProfile(
  pumperId: string,
  onProfile: (profile: FinderPublicPumperProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, 'finderPumperProfiles', pumperId),
    snapshot => {
      onProfile(
        snapshot.exists()
          ? (snapshot.data() as FinderPublicPumperProfile)
          : null
      );
    },
    error => onError?.(error)
  );
}

export { publicProfilePayload };
