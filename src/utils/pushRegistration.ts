import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';

const DEVICE_KEY = 'jobtracker_push_device_id';
const db = getFirestore();

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'android-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function registerPhonePush(uid: string): Promise<void> {
  if (Platform.OS !== 'android') throw new Error('This version supports Android notifications only.');
  await Notifications.setNotificationChannelAsync('jobtracker', {
    name: 'JobTracker alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are disabled. Allow JobTracker notifications in Android Settings.');

  const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS project ID is missing.');
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const deviceId = await getDeviceId();
  await setDoc(doc(db, 'users', uid, 'pushTokens', deviceId), {
    token, platform: 'android', updatedAt: serverTimestamp(),
  });
}

export async function unregisterPhonePush(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(DEVICE_KEY);
  if (deviceId) await deleteDoc(doc(db, 'users', uid, 'pushTokens', deviceId));
}

// Keep Android notification alerts visible while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
