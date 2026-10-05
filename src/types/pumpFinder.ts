export const FINDER_PPE_OPTIONS = [
  'Hard hat',
  'High-visibility vest',
  'Safety glasses',
  'Work gloves',
  'Steel-toe boots',
  'Hearing protection',
] as const;

export type FinderPpeItem = (typeof FINDER_PPE_OPTIONS)[number];

export type FinderPricingMode = 'standard' | 'hourly' | 'prevailing-wage';

export type FinderJobStatus =
  | 'unassigned'
  | 'award-pending'
  | 'assigned'
  | 'in-progress'
  | 'completed'
  | 'canceled';

export type FinderRequestStatus =
  | 'pending'
  | 'awarded'
  | 'confirmed'
  | 'declined'
  | 'withdrawn';

export interface PumpFinderBusinessProfile {
  pumpType?: string;
  serviceArea?: string;
  hoseIncludedFt?: number;
  extraHoseRatePerFt?: number;
  standardPsiMax?: number;
  highPsiSurcharge?: number;
  ppeAvailable?: FinderPpeItem[];
}

export interface FinderJobDraft {
  customerName: string;
  jobDate: string;
  startTime: string;

  // Location is deliberately split for marketplace privacy.
  // generalArea can live on the public/matchable job record.
  // exactAddress belongs in protected/private job details and is only revealed
  // to the awarded pumper after confirmation.
  generalArea: string;
  exactAddress: string;
  yards?: number;
  pumpType?: string;
  concretePsi?: number;
  pricingMode: FinderPricingMode;
  extraHoseRequired: boolean;
  totalHoseFeet?: number;
  ppeRequired: boolean;
  requiredPpe: FinderPpeItem[];
  // Public notes are visible to pumpers before a job is awarded. Never put
  // an exact address, gate/access code, phone number, or private contact info here.
  notes?: string;

  // Private access notes stay with the protected job details and unlock only
  // after the selected pumper confirms the award.
  privateNotes?: string;
}

export interface FinderPublicJob {
  id: string;
  posterId: string;
  jobDate: string;
  startTime: string;
  generalArea: string;
  yards?: number;
  pumpType?: string;
  concretePsi?: number;
  pricingMode: FinderPricingMode;
  extraHoseRequired: boolean;
  totalHoseFeet?: number;
  ppeRequired: boolean;
  requiredPpe: FinderPpeItem[];
  notes?: string;
  status: FinderJobStatus;
  awardedPumperId?: string;
}

export interface FinderPrivateJobDetails {
  jobId: string;
  posterId: string;
  customerName: string;
  exactAddress: string;
  privateNotes?: string;
}

export interface FinderJobRequest {
  id: string;
  jobId: string;
  pumperId: string;
  status: FinderRequestStatus;
  createdAt: string;
  pumperName?: string;
  businessName?: string;
  pumpType?: string;
  serviceArea?: string;
}

export const FINDER_LOCATION_POLICY = {
  publicBeforeConfirmation: 'general-area-only' as const,
  revealExactAddress: 'after-award-and-confirmation' as const,
};

export const FINDER_REQUEST_POLICY = {
  requestMode: 'poster-awards' as const,
  preventOverlappingAwards: true,
  allowPumperReassignment: false,
  allowPumperRecommendations: true,
};
