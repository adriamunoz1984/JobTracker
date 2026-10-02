// src/screens/PaymentSettingsScreen.tsx
// Employee pay settings (moved out of the old Profile screen). Private — never shown on
// the public Pumper Profile.
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Switch, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '../theme/colors';
import { useAppTheme, makeStyles } from '../theme';

export default function PaymentSettingsScreen() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();

  const [commissionRate, setCommissionRate] = useState(user?.commissionRate?.toString() || '50');
  const [keepsCash, setKeepsCash] = useState(user?.keepsCash !== false);
  const [keepsCheck, setKeepsCheck] = useState(user?.keepsCheck !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCommissionRate(user.commissionRate?.toString() || '50');
    setKeepsCash(user.keepsCash !== false);
    setKeepsCheck(user.keepsCheck !== false);
  }, [user]);

  const handleSave = async () => {
    const rate = parseInt(commissionRate, 10);
    if (isNaN(rate) || rate < 1 || rate > 100) {
      Alert.alert('Check commission', 'Commission rate must be between 1 and 100.');
      return;
    }
    try {
      setSaving(true);
      await updateProfile({ commissionRate: rate, keepsCash, keepsCheck });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to update payment settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>My commission</Text>
      <View style={styles.card}>
        <View style={styles.commissionRow}>
          <TextInput
            label="Commission %"
            value={commissionRate}
            onChangeText={setCommissionRate}
            mode="outlined"
            keyboardType="numeric"
            style={styles.commissionInput}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          <Text style={styles.percent}>%</Text>
        </View>
        <Text style={styles.helper}>Your share of each job's total.</Text>
      </View>

      <Text style={styles.sectionTitle}>Payment handling</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>I keep the cash payments</Text>
          <Switch value={keepsCash} onValueChange={setKeepsCash} color={Colors.primary} />
        </View>
        <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.switchLabel}>I keep the check payments</Text>
          <Switch value={keepsCheck} onValueChange={setKeepsCheck} color={Colors.primary} />
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        icon="check"
        buttonColor={Colors.primary}
        textColor={Colors.onPrimary}
        contentStyle={{ minHeight: 52 }}
        labelStyle={{ fontSize: 17 }}
      >
        Save payment settings
      </Button>
    </ScrollView>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  commissionRow: { flexDirection: 'row', alignItems: 'center' },
  commissionInput: { flex: 1, backgroundColor: Colors.surface },
  percent: { fontSize: 20, color: Colors.textSecondary, marginLeft: Spacing.sm },
  helper: { fontSize: 14, color: Colors.textSecondary, marginTop: Spacing.sm },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  switchLabel: { fontSize: 16, color: Colors.text, flex: 1, marginRight: Spacing.sm },
}));
