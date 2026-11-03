import React, { useEffect, useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { Text, Switch, Button, Divider } from 'react-native-paper';
import { doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../theme';
import { registerPhonePush, unregisterPhonePush } from '../utils/pushRegistration';

type Category = 'newJobs' | 'assignments' | 'jobUpdates' | 'messages' | 'reminders';
type Preferences = Record<Category, boolean>;
const DEFAULTS: Preferences = {
  newJobs: true, assignments: true, jobUpdates: true, messages: true, reminders: true,
};
const CATEGORIES: { key: Category; title: string; detail: string }[] = [
  { key: 'newJobs', title: 'New Jobs', detail: 'Notify owners when connected employees enter shared jobs.' },
  { key: 'assignments', title: 'Job Assignments', detail: 'Notify employees when work is assigned.' },
  { key: 'jobUpdates', title: 'Job Changes', detail: 'Updates, rescheduling, and cancellations.' },
  { key: 'messages', title: 'Messages', detail: 'New messages from pumpers or employers (coming later).' },
  { key: 'reminders', title: 'Reminders', detail: 'Upcoming jobs and unpaid invoice reminders (coming later).' },
];
export default function NotificationSettingsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [deviceWorking, setDeviceWorking] = useState(false);
  const [deviceMessage, setDeviceMessage] = useState('');

  const register = async () => {
    if (!user?.uid || deviceWorking) return;
    setDeviceWorking(true);
    try {
      await registerPhonePush(user.uid);
      setDeviceMessage('Notifications enabled on this phone.');
    } catch (error) {
      Alert.alert('Could not enable notifications', error instanceof Error ? error.message : String(error));
    } finally { setDeviceWorking(false); }
  };
  const unregister = async () => {
    if (!user?.uid || deviceWorking) return;
    setDeviceWorking(true);
    try {
      await unregisterPhonePush(user.uid);
      setDeviceMessage('JobTracker push notifications turned off on this phone.');
    } catch (error) {
      Alert.alert('Could not disable notifications', error instanceof Error ? error.message : String(error));
    } finally { setDeviceWorking(false); }
  };

  useEffect(() => {
    if (!user?.uid) return;
    return onSnapshot(doc(getFirestore(), 'users', user.uid, 'notificationSettings', 'preferences'),
      snap => setPrefs({ ...DEFAULTS, ...(snap.data() || {}) }),
      error => console.warn('Unable to load notification settings', error));
  }, [user?.uid]);

  const change = async (key: Category, enabled: boolean) => {
    if (!user?.uid || saving) return;
    const oldPrefs = prefs;
    const next = { ...prefs, [key]: enabled };
    setPrefs(next);
    setSaving(true);
    try {
      await setDoc(doc(getFirestore(), 'users', user.uid, 'notificationSettings', 'preferences'), next, { merge: true });
    } catch (error) {
      setPrefs(oldPrefs);
      Alert.alert('Settings not saved', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
      <Text variant="titleLarge" style={{ color: colors.text, marginBottom: 8 }}>Phone Notifications</Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
        Choose which alerts you want. Shared employee jobs can notify the connected owner.
        Your private independent jobs stay private.
      </Text>
      <Button mode="contained" disabled={deviceWorking} loading={deviceWorking}
        onPress={register} style={{ marginBottom: 12 }}>Enable Notifications on This Phone</Button>
      <Button mode="outlined" disabled={deviceWorking} onPress={unregister}
        style={{ marginBottom: 12 }}>Disable on This Phone</Button>
      {!!deviceMessage && <Text style={{ color: colors.text, marginBottom: 12 }}>{deviceMessage}</Text>}
      {CATEGORIES.map(item => (
        <View key={item.key} style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ color: colors.text }}>{item.title}</Text>
              <Text style={{ color: colors.textSecondary }}>{item.detail}</Text>
            </View>
            <Switch value={prefs[item.key]} onValueChange={value => change(item.key, value)} disabled={saving} />
          </View>
          <Divider style={{ marginTop: 12 }} />
        </View>
      ))}
      <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
        These switches save your preferences. Android push delivery still requires device permission,
        notification token registration, and the notification server to be deployed.
      </Text>
    </ScrollView>
  );
}
