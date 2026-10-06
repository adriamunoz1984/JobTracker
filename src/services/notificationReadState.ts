import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_SEEN_NOTIFICATION_IDS = 500;

function storageKey(uid: string) {
  return `notification_seen_${uid}`;
}

export async function getSeenNotificationIds(uid: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(uid));
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(Boolean) : []);
  } catch (error) {
    console.warn('Could not load notification read state:', error);
    return new Set();
  }
}

export async function markNotificationIdsSeen(
  uid: string,
  ids: string[]
): Promise<Set<string>> {
  if (!ids.length) {
    return getSeenNotificationIds(uid);
  }

  const current = await getSeenNotificationIds(uid);
  ids.forEach(id => current.add(id));

  // Keep local storage bounded. IDs are insertion ordered in Set.
  const trimmed = Array.from(current).slice(-MAX_SEEN_NOTIFICATION_IDS);
  const next = new Set(trimmed);

  try {
    await AsyncStorage.setItem(storageKey(uid), JSON.stringify(trimmed));
  } catch (error) {
    console.warn('Could not save notification read state:', error);
  }

  return next;
}

export function notificationStorageIds({
  finderEventIds = [],
  pendingJobIds = [],
  pendingInviteIds = [],
}: {
  finderEventIds?: string[];
  pendingJobIds?: string[];
  pendingInviteIds?: string[];
}) {
  return [
    ...finderEventIds.map(id => `finder:${id}`),
    ...pendingJobIds.map(id => `job:${id}`),
    ...pendingInviteIds.map(id => `invite:${id}`),
  ];
}
