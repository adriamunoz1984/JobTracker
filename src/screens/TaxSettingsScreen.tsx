// src/screens/TaxSettingsScreen.tsx
// Private estimated-income-tax settings. These values are user-selected estimates,
// not payroll withholding or tax-filing calculations.
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Switch, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Spacing } from '../theme/colors';
import { useAppTheme, makeStyles } from '../theme';

export default function TaxSettingsScreen() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();

  const [estimatedTaxRate, setEstimatedTaxRate] = useState(
    user?.estimatedTaxRate?.toString() || ''
  );
  const [includeCash, setIncludeCash] = useState(
    user?.includeCashInTaxEstimate !== false
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEstimatedTaxRate(user.estimatedTaxRate?.toString() || '');
    setIncludeCash(user.includeCashInTaxEstimate !== false);
  }, [user]);

  const handleSave = async () => {
    const rate = estimatedTaxRate.trim() === '' ? 0 : Number(estimatedTaxRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      Alert.alert('Check tax rate', 'Estimated tax rate must be between 0 and 100.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        estimatedTaxRate: rate,
        includeCashInTaxEstimate: includeCash,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to update tax estimate settings.');
    } finally {
      setSaving(false);
    }
  };

  const roleExplanation =
    user?.role === 'owner'
      ? 'Your estimate uses 100% of jobs you pump yourself plus the company share left after pumper commission on employee jobs.'
      : 'Your estimate uses your full share of personal jobs and your commission share of employer-assigned jobs.';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Estimated tax reserve</Text>
      <View style={styles.card}>
        <View style={styles.rateRow}>
          <TextInput
            label="Estimated tax rate"
            value={estimatedTaxRate}
            onChangeText={setEstimatedTaxRate}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.rateInput}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
            placeholder="Example: 25"
          />
          <Text style={styles.percent}>%</Text>
        </View>
        <Text style={styles.helper}>{roleExplanation}</Text>
      </View>

      <Text style={styles.sectionTitle}>Cash jobs</Text>
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Include cash jobs in my tax estimate</Text>
            <Text style={styles.helper}>
              Turn this off if you do not want cash jobs counted in the app's estimate.
            </Text>
          </View>
          <Switch value={includeCash} onValueChange={setIncludeCash} color={Colors.primary} />
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Estimate only</Text>
        <Text style={styles.noticeText}>
          Pump Finder is calculating a reserve using the percentage you choose. It is not calculating your actual tax return, deductions, payroll withholding, or tax liability.
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        icon="check"
        buttonColor={Colors.primary}
        textColor={Colors.onPrimary}
        contentStyle={{ minHeight: 52 }}
        labelStyle={{ fontSize: 17 }}
      >
        Save tax settings
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
  rateRow: { flexDirection: 'row', alignItems: 'center' },
  rateInput: { flex: 1, backgroundColor: Colors.surface },
  percent: { fontSize: 20, color: Colors.textSecondary, marginLeft: Spacing.sm },
  helper: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchText: { flex: 1, marginRight: Spacing.md },
  switchLabel: { fontSize: 16, color: Colors.text, fontWeight: '600' },
  notice: {
    backgroundColor: Colors.infoBg,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  noticeText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
}));
