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
  | 'assigned'
  | 'in-progress'
  | 'completed'
  | 'canceled';

export type FinderRequestStatus = 'pending' | 'awarded' | 'declined' | 'withdrawn';

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
  startTime: string;
  address: string;
  yards?: number;
  pumpType?: string;
  concretePsi?: number;
  pricingMode: FinderPricingMode;
  extraHoseRequired: boolean;
  totalHoseFeet?: number;
  ppeRequired: boolean;
  requiredPpe: FinderPpeItem[];
  notes?: string;
}

export interface FinderJobRequest {
  id: string;
  jobId: string;
  pumperId: string;
  status: FinderRequestStatus;
  createdAt: string;
}

export const FINDER_REQUEST_POLICY = {
  requestMode: 'poster-awards' as const,
  maxPendingRequestsPerPumper: 3,
  preventOverlappingAwards: true,
  allowPumperReassignment: false,
  allowPumperRecommendations: true,
};
