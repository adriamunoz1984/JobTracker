// src/screens/SettingsScreen.tsx
// PRIVATE settings and business tools. Short grouped rows; each opens its own page.
// (The public "My Pumper Profile" is ProfileScreen.)
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '../theme/colors';
import { useAppTheme, makeStyles, themes } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface RowProps {
  icon: IconName;
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
  last?: boolean;
}

function SettingsRow({ icon, label, detail, onPress, danger, loading, last }: RowProps) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const tint = danger ? Colors.error : Colors.primary;
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? Colors.errorBg : Colors.primaryBg }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, danger && { color: Colors.error }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        !danger && <Ionicons name="chevron-forward" size={22} color={Colors.textLight} />
      )}
    </TouchableOpacity>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const styles = useStyles();
  const { themeId, preference } = useAppTheme();
  const navigation = useNavigation<any>();
  const { user, updateProfile, logout } = useAuth();
  const [checkingInvites, setCheckingInvites] = useState(false);

  const isOwner = user?.role === 'owner';
  const isEmployee = user?.role === 'employee';

  const handleToggleRole = () => {
    const newRole = isOwner ? 'employee' : 'owner';
    Alert.alert(
      'Change role',
      `Switch to ${newRole} mode? This changes how your earnings are calculated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              await updateProfile({
                role: newRole,
                ...(newRole === 'employee'
                  ? {
                      commissionRate: user?.commissionRate || 50,
                      keepsCash: user?.keepsCash !== undefined ? user.keepsCash : false,
                      keepsCheck: user?.keepsCheck !== undefined ? user.keepsCheck : false,
                    }
                  : { commissionRate: 100, keepsCash: true, keepsCheck: true }),
              });
            } catch (e) {
              Alert.alert('Error', 'Failed to change role');
            }
          },
        },
      ]
    );
  };

  const handleCheckInvites = async () => {
    if (!user?.email) return;
    try {
      setCheckingInvites(true);
      const db = getFirestore();
      const q = query(
        collection(db, 'employeeInvites'),
        where('employeeEmail', '==', user.email.toLowerCase()),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        Alert.alert('No invitations', "You don't have any pending invitations right now.");
      } else {
        Alert.alert(
          'Invitations found',
          `You have ${snapshot.size} pending invitation(s). Log out and back in to view them.`,
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Log out now', onPress: () => logout() },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking invites:', error);
      Alert.alert('Error', 'Failed to check for invitations');
    } finally {
      setCheckingInvites(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            console.error('Logout error:', e);
          }
        },
      },
    ]);
  };

  const appearanceLabel = preference === 'system' ? 'Auto' : preference === 'dark' ? 'Dark' : 'Light';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Group title="Business tools">
        <SettingsRow icon="speedometer-outline" label="Dashboard" detail="Trends and performance" onPress={() => navigation.navigate('Dashboard')} />
        <SettingsRow icon="bar-chart-outline" label="Reports & analytics" detail="Summaries and PDF exports" onPress={() => navigation.navigate('Reports')} />
        <SettingsRow
          icon="business-outline"
          label="Clients"
          detail="Saved companies and addresses"
          onPress={() => navigation.navigate('ClientManagement')}
          last={!isOwner && !isEmployee}
        />
        {isOwner && (
          <SettingsRow icon="people-outline" label="Employees" detail="Invite and manage your crew" onPress={() => navigation.navigate('EmployeeManagement')} last />
        )}
        {isEmployee && user?.ownerStatus === 'active' && (
          <SettingsRow icon="briefcase-outline" label="Assigned jobs" detail="Jobs from your employer" onPress={() => navigation.navigate('PendingJobs')} />
        )}
        {isEmployee && (
          <SettingsRow
            icon="mail-unread-outline"
            label="Check for invitations"
            detail="From an employer"
            onPress={handleCheckInvites}
            loading={checkingInvites}
            last
          />
        )}
      </Group>

      <Group title="Pay">
        {isEmployee && (
          <SettingsRow
            icon="cash-outline"
            label="Payment settings"
            detail={`${user?.commissionRate || 50}% commission`}
            onPress={() => navigation.navigate('PaymentSettings')}
          />
        )}
        <SettingsRow
          icon="swap-horizontal-outline"
          label="Account role"
          detail={isOwner ? 'Owner — tap to switch to Employee' : 'Employee — tap to switch to Owner'}
          onPress={handleToggleRole}
          last
        />
      </Group>

      <Group title="Look">
        <SettingsRow
          icon="color-palette-outline"
          label="Theme and appearance"
          detail={`${themes[themeId].name} · ${appearanceLabel}`}
          onPress={() => navigation.navigate('AppearanceSettings')}
          last
        />
      </Group>

      <Group title="Account">
        <SettingsRow
          icon="person-circle-outline"
          label="My pumper profile"
          detail="Name, business, pump details"
          onPress={() => navigation.navigate('Profile')}
        />
        <SettingsRow icon="log-out-outline" label="Log out" detail={user?.email || undefined} onPress={handleLogout} danger last />
      </Group>
    </ScrollView>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  group: { marginBottom: Spacing.lg },
  groupTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, minHeight: 64 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: 17, fontWeight: '600', color: Colors.text },
  rowDetail: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
}));
