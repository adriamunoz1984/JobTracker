import { Unsubscribe } from 'firebase/firestore';
import {
  subscribeAvailableFinderJobs,
  subscribeFinderJobRequests,
  subscribeMyAwardedFinderJobs,
  subscribeMyPostedFinderJobs,
} from './pumpFinderMarketplace';
import {
  FinderJobRequest,
  FinderPublicJob,
} from '../types/pumpFinder';

export type FinderNotificationKind =
  | 'available-job'
  | 'interested-pumper'
  | 'job-awarded'
  | 'job-confirmed';

export interface FinderNotificationEvent {
  id: string;
  kind: FinderNotificationKind;
  title: string;
  message: string;
  jobId: string;
  pumperId?: string;
  actionRoute: string;
  actionParams?: Record<string, any>;
}

export function subscribeFinderNotificationEvents(
  onEvents: (events: FinderNotificationEvent[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  let availableJobs: FinderPublicJob[] = [];
  let awardedJobs: FinderPublicJob[] = [];
  let postedJobs: FinderPublicJob[] = [];
  const requestsByJob = new Map<string, FinderJobRequest[]>();
  const requestUnsubscribers = new Map<string, Unsubscribe>();

  const emit = () => {
    const events: FinderNotificationEvent[] = [];

    availableJobs.forEach(job => {
      if (job.status !== 'unassigned') return;

      events.push({
        id: `available:${job.id}`,
        kind: 'available-job',
        title: 'Pump Finder job available',
        message: `${job.generalArea} • ${job.jobDate} at ${job.startTime}`,
        jobId: job.id,
        actionRoute: 'AvailableJobs',
      });
    });

    awardedJobs.forEach(job => {
      if (job.status !== 'award-pending') return;

      events.push({
        id: `awarded:${job.id}`,
        kind: 'job-awarded',
        title: 'You were awarded a job',
        message: `${job.generalArea} • ${job.jobDate} at ${job.startTime}. Confirm it to unlock the exact address.`,
        jobId: job.id,
        actionRoute: 'ConfirmJob',
        actionParams: { jobId: job.id },
      });
    });

    postedJobs.forEach(job => {
      const requests = requestsByJob.get(job.id) || [];

      if (job.status === 'unassigned') {
        requests
          .filter(request => request.status === 'pending')
          .forEach(request => {
            const pumper =
              request.businessName?.trim() ||
              request.pumperName?.trim() ||
              'A pumper';

            events.push({
              id: `interest:${job.id}:${request.pumperId}`,
              kind: 'interested-pumper',
              title: 'New interested pumper',
              message: `${pumper} is available for your ${job.generalArea} job.`,
              jobId: job.id,
              pumperId: request.pumperId,
              actionRoute: 'InterestedPumpers',
              actionParams: { jobId: job.id },
            });
          });
      }

      if (job.status === 'assigned') {
        const confirmed =
          requests.find(request => request.status === 'confirmed') ||
          requests.find(request => request.pumperId === job.awardedPumperId);

        const pumper =
          confirmed?.businessName?.trim() ||
          confirmed?.pumperName?.trim() ||
          'Your selected pumper';

        events.push({
          id: `confirmed:${job.id}`,
          kind: 'job-confirmed',
          title: 'Pumper confirmed your job',
          message: `${pumper} confirmed the ${job.generalArea} job.`,
          jobId: job.id,
          pumperId: confirmed?.pumperId || job.awardedPumperId,
          actionRoute: 'InterestedPumpers',
          actionParams: { jobId: job.id },
        });
      }
    });

    const kindRank: Record<FinderNotificationKind, number> = {
      'job-awarded': 0,
      'interested-pumper': 1,
      'job-confirmed': 2,
      'available-job': 3,
    };

    events.sort((a, b) => kindRank[a.kind] - kindRank[b.kind]);
    onEvents(events);
  };

  const syncRequestListeners = (jobs: FinderPublicJob[]) => {
    const activeIds = new Set(
      jobs
        .filter(job => !['completed', 'canceled'].includes(job.status))
        .map(job => job.id)
    );

    requestUnsubscribers.forEach((unsubscribe, jobId) => {
      if (!activeIds.has(jobId)) {
        unsubscribe();
        requestUnsubscribers.delete(jobId);
        requestsByJob.delete(jobId);
      }
    });

    jobs.forEach(job => {
      if (!activeIds.has(job.id) || requestUnsubscribers.has(job.id)) return;

      const unsubscribe = subscribeFinderJobRequests(
        job.id,
        requests => {
          requestsByJob.set(job.id, requests);
          emit();
        },
        error => onError?.(error)
      );

      requestUnsubscribers.set(job.id, unsubscribe);
    });
  };

  const unsubscribeAvailable = subscribeAvailableFinderJobs(
    jobs => {
      availableJobs = jobs;
      emit();
    },
    error => onError?.(error)
  );

  const unsubscribeAwarded = subscribeMyAwardedFinderJobs(
    jobs => {
      awardedJobs = jobs;
      emit();
    },
    error => onError?.(error)
  );

  const unsubscribePosted = subscribeMyPostedFinderJobs(
    jobs => {
      postedJobs = jobs;
      syncRequestListeners(jobs);
      emit();
    },
    error => onError?.(error)
  );

  return () => {
    unsubscribeAvailable();
    unsubscribeAwarded();
    unsubscribePosted();
    requestUnsubscribers.forEach(unsubscribe => unsubscribe());
    requestUnsubscribers.clear();
  };
}
