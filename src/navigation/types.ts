import type { NavigationProp } from '@react-navigation/native';
import type { UserRole } from '../types';

export type RootStackParamList = {
  Register: { role: UserRole };
  Login: undefined;
  CompleteJob: { jobId: string };
};
export type JobTrackerNavigation = NavigationProp<RootStackParamList>;
