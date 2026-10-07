import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import {
  FINDER_PPE_OPTIONS,
  FinderPpeItem,
  PumpFinderBusinessProfile,
} from '../types/pumpFinder';
import { useAppTheme, makeStyles } from '../theme';
import ThemedHero from '../components/ThemedHero';
import { savePublicFinderProfile } from '../services/pumpFinderProfiles';

export default function FinderBusinessProfileScreen() {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { user, updateProfile } = useAuth();
  const saved = user?.pumpFinderProfile;

  // Public identity shown on your Pumper Profile
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
    const profile = user?.pumpFinderProfile;
    if (!profile) return;
    setPumpType(profile.pumpType || '');
    setServiceArea(profile.serviceArea || '');
    setHoseIncludedFt(profile.hoseIncludedFt?.toString() || '200');
    setExtraHoseRatePerFt(profile.extraHoseRatePerFt?.toString() || '1');
    setStandardPsiMax(profile.standardPsiMax?.toString() || '4000');
    setHighPsiSurcharge(profile.highPsiSurcharge?.toString() || '');
    setPpeAvailable(profile.ppeAvailable || []);
  }, [user?.pumpFinderProfile]);

  const togglePpe = (item: FinderPpeItem) => {
    setPpeAvailable((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
    );
  };

  const saveProfile = async () => {
    const hoseIncluded = Number(hoseIncludedFt);
    const hoseRate = Number(extraHoseRatePerFt);
    const psiMax = Number(standardPsiMax);
    const psiSurcharge = highPsiSurcharge.trim() ? Number(highPsiSurcharge) : undefined;

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
    if (psiSurcharge !== undefined && (!Number.isFinite(psiSurcharge) || psiSurcharge < 0)) {
      Alert.alert('Check PSI surcharge', 'Enter a valid high-PSI surcharge or leave it blank.');
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

    if (!displayName.trim()) {
      Alert.alert('Add your name', 'Enter the name posters should see.');
      return;
    }

    try {
      setSaving(true);
      const publicDisplayName = displayName.trim();
      const publicBusinessName = businessName.trim() || undefined;

      await updateProfile({
        displayName: publicDisplayName,
        businessName: publicBusinessName,
        pumpFinderProfile,
      });

      await savePublicFinderProfile({
        displayName: publicDisplayName,
        businessName: publicBusinessName,
        pumpFinderProfile,
      });

      Alert.alert(
        'Saved',
        'Your private account profile and public Pump Finder business profile were updated.'
      );
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ThemedHero
        icon="person-circle-outline"
        title="Edit Pumper Profile"
        subtitle="This is your public profile. Pump Finder posters see it when you request a job."
      />

      <Section title="About you">
        <Field label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="First and last name" autoCapitalize="words" />
        <Field label="Business name" value={businessName} onChangeText={setBusinessName} placeholder="Optional, like Munoz Pumping" autoCapitalize="words" />
        <Text style={styles.helperText}>
          Your phone and email are never shown here. They're shared only after a poster awards you a job.
        </Text>
      </Section>

      <Section title="Equipment & service area">
        <Field label="Pump type" value={pumpType} onChangeText={setPumpType} placeholder="Trailer, boom, line pump, etc." />
        <Field label="Service area" value={serviceArea} onChangeText={setServiceArea} placeholder="Cities or area you normally cover" />
      </Section>

      <Section title="Hose pricing">
        <Field label="Hose included in normal setup" value={hoseIncludedFt} onChangeText={setHoseIncludedFt} placeholder="200" keyboardType="number-pad" suffix="ft" />
        <Field label="Additional hose rate" value={extraHoseRatePerFt} onChangeText={setExtraHoseRatePerFt} placeholder="1.00" keyboardType="decimal-pad" prefix="$" suffix="/ ft" />
        <Text style={styles.helperText}>
          Example: if you include 200 ft and a job needs 275 ft, Pump Finder can estimate the extra 75 ft using your rate.
        </Text>
      </Section>

      <Section title="Concrete PSI">
        <Field label="Standard PSI up to" value={standardPsiMax} onChangeText={setStandardPsiMax} placeholder="4000" keyboardType="number-pad" suffix="PSI" />
        <Field label="High-PSI surcharge" value={highPsiSurcharge} onChangeText={setHighPsiSurcharge} placeholder="Optional" keyboardType="decimal-pad" prefix="$" />
        <Text style={styles.helperText}>
          This does not claim a pump certification. It simply tells posters when your own high-PSI pricing starts.
        </Text>
      </Section>

      <Section title="PPE available">
        <Text style={styles.helperText}>
          Mark what you can bring when a commercial or construction job requires it. This is shown as “PPE Available,” not “OSHA compliant.”
        </Text>
        <View style={styles.chipWrap}>
          {FINDER_PPE_OPTIONS.map((item) => {
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
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      <View style={styles.policyCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={Colors.primary} />
        <View style={styles.policyTextWrap}>
          <Text style={styles.policyTitle}>Marketplace control stays with the poster</Text>
          <Text style={styles.policyText}>
            Pumpers request jobs rather than instantly claiming them. Awarded jobs cannot be reassigned by the pumper without poster approval.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveProfile}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Ionicons name="save-outline" size={20} color={Colors.onPrimary} />
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
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

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 36 },
  hero: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 5, maxWidth: 360, lineHeight: 20 },
  section: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.primary, paddingLeft: 10 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderDark, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: Colors.text },
  inputWithPrefix: { paddingLeft: 28 },
  inputWithSuffix: { paddingRight: 56 },
  prefix: { position: 'absolute', left: 13, zIndex: 2, color: Colors.textSecondary, fontWeight: '700' },
  suffix: { position: 'absolute', right: 13, zIndex: 2, color: Colors.textSecondary, fontWeight: '600' },
  helperText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: Colors.borderDark, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: Colors.onPrimary },
  policyCard: { flexDirection: 'row', backgroundColor: Colors.primaryBg, borderRadius: 12, padding: 14, marginBottom: 16 },
  policyTextWrap: { flex: 1, marginLeft: 10 },
  policyTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  policyText: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  saveButton: { minHeight: 52, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '800' },
}));
