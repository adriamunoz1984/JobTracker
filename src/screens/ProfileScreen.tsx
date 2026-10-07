// src/screens/ProfileScreen.tsx
// One editable profile for the signed-in user. Pump Finder fields saved here are
// also mirrored into a sanitized public Finder profile; private account data stays private.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import {
  FINDER_PPE_OPTIONS,
  FinderPpeItem,
  PumpFinderBusinessProfile,
} from '../types/pumpFinder';
import { savePublicFinderProfile } from '../services/pumpFinderProfiles';
import { Spacing, BorderRadius } from '../theme/colors';
import { useAppTheme, makeStyles, withOpacity } from '../theme';

export default function ProfileScreen() {
  const { colors: Colors, gradients, headerTitleStyle, theme } = useAppTheme();
  const styles = useStyles();
  const { user, updateProfile } = useAuth();

  const saved = user?.pumpFinderProfile;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [pumpType, setPumpType] = useState(saved?.pumpType || '');
  const [serviceArea, setServiceArea] = useState(saved?.serviceArea || '');
  const [hoseIncludedFt, setHoseIncludedFt] = useState(saved?.hoseIncludedFt?.toString() || '200');
  const [extraHoseRatePerFt, setExtraHoseRatePerFt] = useState(saved?.extraHoseRatePerFt?.toString() || '1');
  const [standardPsiMax, setStandardPsiMax] = useState(saved?.standardPsiMax?.toString() || '4000');
  const [highPsiSurcharge, setHighPsiSurcharge] = useState(saved?.highPsiSurcharge?.toString() || '');
  const [ppeAvailable, setPpeAvailable] = useState<FinderPpeItem[]>(saved?.ppeAvailable || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setBusinessName(user?.businessName || '');

    const profile = user?.pumpFinderProfile;
    setPumpType(profile?.pumpType || '');
    setServiceArea(profile?.serviceArea || '');
    setHoseIncludedFt(profile?.hoseIncludedFt?.toString() || '200');
    setExtraHoseRatePerFt(profile?.extraHoseRatePerFt?.toString() || '1');
    setStandardPsiMax(profile?.standardPsiMax?.toString() || '4000');
    setHighPsiSurcharge(profile?.highPsiSurcharge?.toString() || '');
    setPpeAvailable(profile?.ppeAvailable || []);
  }, [
    user?.displayName,
    user?.businessName,
    user?.pumpFinderProfile,
  ]);

  const publicTitle = businessName.trim() || displayName.trim() || 'My Pumper Profile';
  const publicSubtitle =
    businessName.trim() && displayName.trim()
      ? displayName.trim()
      : 'Pump Finder public profile';

  const initials = useMemo(
    () =>
      (businessName.trim() || displayName.trim() || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0]!.toUpperCase())
        .join(''),
    [businessName, displayName]
  );

  const togglePpe = (item: FinderPpeItem) => {
    setPpeAvailable(current =>
      current.includes(item)
        ? current.filter(entry => entry !== item)
        : [...current, item]
    );
  };

  const saveProfile = async () => {
    const name = displayName.trim();
    const business = businessName.trim() || undefined;
    const hoseIncluded = Number(hoseIncludedFt);
    const hoseRate = Number(extraHoseRatePerFt);
    const psiMax = Number(standardPsiMax);
    const psiSurcharge = highPsiSurcharge.trim()
      ? Number(highPsiSurcharge)
      : undefined;

    if (!name) {
      Alert.alert('Add your name', 'Enter the name posters should see.');
      return;
    }

    if (!Number.isFinite(hoseIncluded) || hoseIncluded < 0) {
      Alert.alert('Check hose included', 'Enter a valid number of included hose feet.');
      return;
    }

    if (!Number.isFinite(hoseRate) || hoseRate < 0) {
      Alert.alert('Check hose rate', 'Enter a valid additional hose rate.');
      return;
    }

    if (!Number.isFinite(psiMax) || psiMax <= 0) {
      Alert.alert('Check PSI', 'Enter a valid standard PSI limit.');
      return;
    }

    if (
      psiSurcharge !== undefined &&
      (!Number.isFinite(psiSurcharge) || psiSurcharge < 0)
    ) {
      Alert.alert(
        'Check PSI surcharge',
        'Enter a valid high-PSI surcharge or leave it blank.'
      );
      return;
    }

    const pumpFinderProfile: PumpFinderBusinessProfile = {
      pumpType: pumpType.trim() || undefined,
      serviceArea: serviceArea.trim() || undefined,
      hoseIncludedFt: hoseIncluded,
      extraHoseRatePerFt: hoseRate,
      standardPsiMax: psiMax,
      highPsiSurcharge: psiSurcharge,
      ppeAvailable,
    };

    try {
      setSaving(true);

      await updateProfile({
        displayName: name,
        businessName: business,
        pumpFinderProfile,
      });

      await savePublicFinderProfile({
        displayName: name,
        businessName: business,
        pumpFinderProfile,
      });

      Alert.alert(
        'Profile Saved',
        'Your profile was updated. Pump Finder posters will see the public business details shown here.'
      );
    } catch (error) {
      console.error('Could not save pumper profile:', error);
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.avatar, { backgroundColor: withOpacity(Colors.onPrimary, 0.18) }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text
          style={[
            headerTitleStyle,
            { fontSize: theme.headerFont ? theme.headerFontSize + 4 : 22 },
            styles.heroTitle,
          ]}
          accessibilityRole="header"
        >
          {publicTitle}
        </Text>
        <Text style={styles.heroLine}>{publicSubtitle}</Text>
        <View style={[styles.pill, { backgroundColor: withOpacity(Colors.onPrimary, 0.18) }]}>
          <Ionicons name="eye-outline" size={14} color={Colors.onPrimary} />
          <Text style={styles.pillText}>Public Pump Finder preview</Text>
        </View>
      </LinearGradient>

      <View style={styles.privacyNote}>
        <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
        <Text style={styles.privacyText}>
          Your phone, email, pay settings, and other private account data are not part of this public Pump Finder profile.
        </Text>
      </View>

      <Section title="About you">
        <Field
          label="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="First and last name"
          autoCapitalize="words"
        />
        <Field
          label="Business name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Optional, like Munoz Pumping"
          autoCapitalize="words"
        />
      </Section>

      <Section title="Equipment & service area">
        <Field
          label="Pump type"
          value={pumpType}
          onChangeText={setPumpType}
          placeholder="Trailer, boom, line pump, etc."
        />
        <Field
          label="Service area"
          value={serviceArea}
          onChangeText={setServiceArea}
          placeholder="Cities or area you normally cover"
        />
      </Section>

      <Section title="Hose pricing">
        <Field
          label="Hose included in normal setup"
          value={hoseIncludedFt}
          onChangeText={setHoseIncludedFt}
          placeholder="200"
          keyboardType="number-pad"
          suffix="ft"
        />
        <Field
          label="Additional hose rate"
          value={extraHoseRatePerFt}
          onChangeText={setExtraHoseRatePerFt}
          placeholder="1.00"
          keyboardType="decimal-pad"
          prefix="$"
          suffix="/ ft"
        />
        <Text style={styles.helperText}>
          Example: if you include 200 ft and a job needs 275 ft, Pump Finder can use your extra-hose rate for the additional 75 ft.
        </Text>
      </Section>

      <Section title="Concrete PSI">
        <Field
          label="Standard PSI up to"
          value={standardPsiMax}
          onChangeText={setStandardPsiMax}
          placeholder="4000"
          keyboardType="number-pad"
          suffix="PSI"
        />
        <Field
          label="High-PSI surcharge"
          value={highPsiSurcharge}
          onChangeText={setHighPsiSurcharge}
          placeholder="Optional"
          keyboardType="decimal-pad"
          prefix="$"
        />
        <Text style={styles.helperText}>
          This is your pricing threshold, not a pump certification.
        </Text>
      </Section>

      <Section title="PPE available">
        <Text style={styles.helperText}>
          Mark what you normally have available for jobs that require PPE.
        </Text>
        <View style={styles.chipWrap}>
          {FINDER_PPE_OPTIONS.map(item => {
            const selected = ppeAvailable.includes(item);
            return (
              <TouchableOpacity
                key={item}
                onPress={() => togglePpe(item)}
                style={[styles.chip, selected && styles.chipSelected]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={selected ? Colors.onPrimary : Colors.textSecondary}
                />
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveProfile}
        disabled={saving}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <Ionicons name="save-outline" size={20} color={Colors.onPrimary} />
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving…' : 'Save Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, prefix, suffix, ...props }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...props}
          placeholderTextColor={Colors.textLight}
          style={[
            styles.input,
            prefix && styles.inputWithPrefix,
            suffix && styles.inputWithSuffix,
          ]}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(Colors => ({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  hero: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: Colors.onPrimary,
    fontSize: 26,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  heroLine: {
    color: Colors.onPrimary,
    fontSize: 15,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  pillText: {
    color: Colors.onPrimary,
    fontSize: 12,
    marginLeft: 6,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: Spacing.md,
  },
  privacyText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  inputWithPrefix: {
    paddingLeft: 28,
  },
  inputWithSuffix: {
    paddingRight: 56,
  },
  prefix: {
    position: 'absolute',
    left: 13,
    zIndex: 2,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  suffix: {
    position: 'absolute',
    right: 13,
    zIndex: 2,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.onPrimary,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: Colors.onPrimary,
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}));
