import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FINDER_PPE_OPTIONS,
  FinderJobDraft,
  FinderPpeItem,
  FinderPricingMode,
} from '../types/pumpFinder';
import { useAppTheme, makeStyles } from '../theme';

const pricingOptions: Array<{ value: FinderPricingMode; label: string; help: string }> = [
  { value: 'standard', label: 'Standard', help: 'Normal setup / yard pricing' },
  { value: 'hourly', label: 'Hourly / standby', help: 'For long waits or time-based work' },
  { value: 'prevailing-wage', label: 'Prevailing wage', help: 'Public works / contract job' },
];

export default function PostFinderJobScreen({ navigation }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const [customerName, setCustomerName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [address, setAddress] = useState('');
  const [yards, setYards] = useState('');
  const [pumpType, setPumpType] = useState('');
  const [concretePsi, setConcretePsi] = useState('');
  const [pricingMode, setPricingMode] = useState<FinderPricingMode>('standard');
  const [extraHoseRequired, setExtraHoseRequired] = useState(false);
  const [totalHoseFeet, setTotalHoseFeet] = useState('');
  const [ppeRequired, setPpeRequired] = useState(false);
  const [requiredPpe, setRequiredPpe] = useState<FinderPpeItem[]>([]);
  const [notes, setNotes] = useState('');

  const togglePpe = (item: FinderPpeItem) => {
    setRequiredPpe((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
    );
  };

  const continueToReview = () => {
    const yardsValue = Number(yards);
    const psiValue = concretePsi.trim() ? Number(concretePsi) : undefined;
    const hoseValue = extraHoseRequired ? Number(totalHoseFeet) : undefined;

    if (!customerName.trim() || !startTime.trim() || !address.trim() || !yards.trim()) {
      Alert.alert('Missing job details', 'Customer, start time, address, and estimated yards are required.');
      return;
    }

    if (!Number.isFinite(yardsValue) || yardsValue <= 0) {
      Alert.alert('Check yards', 'Enter a valid estimated number of concrete yards.');
      return;
    }

    if (psiValue !== undefined && (!Number.isFinite(psiValue) || psiValue <= 0)) {
      Alert.alert('Check PSI', 'Enter a valid concrete PSI or leave it blank.');
      return;
    }

    if (extraHoseRequired && (hoseValue === undefined || !Number.isFinite(hoseValue) || hoseValue <= 0)) {
      Alert.alert('Check hose length', 'Enter the estimated total hose length needed for this job.');
      return;
    }

    const jobDraft: FinderJobDraft = {
      customerName: customerName.trim(),
      startTime: startTime.trim(),
      address: address.trim(),
      yards: yardsValue,
      pumpType: pumpType.trim() || undefined,
      concretePsi: psiValue,
      pricingMode,
      extraHoseRequired,
      totalHoseFeet: hoseValue,
      ppeRequired,
      requiredPpe: ppeRequired ? requiredPpe : [],
      notes: notes.trim() || undefined,
    };

    navigation.navigate('ReviewJob', { jobDraft });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Ionicons name="construct-outline" size={32} color={Colors.primary} />
          <Text style={styles.title}>Post a Pumping Job</Text>
          <Text style={styles.subtitle}>
            Add the job details and requirements. You’ll review everything before it is posted.
          </Text>
        </View>

        <SectionTitle title="Job details" />
        <Field label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Customer or company name" />
        <Field label="Start time" value={startTime} onChangeText={setStartTime} placeholder="Example: 7:00 AM" />
        <Field label="Job address" value={address} onChangeText={setAddress} placeholder="Street address, city" />
        <Field label="Yards" value={yards} onChangeText={setYards} placeholder="Estimated concrete yards" keyboardType="decimal-pad" />
        <Field label="Pump type" value={pumpType} onChangeText={setPumpType} placeholder="Optional — trailer, boom, line pump, etc." />
        <Field label="Concrete PSI" value={concretePsi} onChangeText={setConcretePsi} placeholder="Optional — example: 4000" keyboardType="number-pad" />
        <Text style={styles.helperText}>
          Higher PSI can put more strain on some pumps. Entering it here lets pumpers apply their own high-PSI pricing rules.
        </Text>

        <SectionTitle title="Pricing / job type" />
        <View style={styles.optionGroup}>
          {pricingOptions.map((option) => {
            const selected = pricingMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.choiceCard, selected && styles.choiceCardSelected]}
                onPress={() => setPricingMode(option.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? Colors.primary : Colors.textLight}
                />
                <View style={styles.choiceText}>
                  <Text style={styles.choiceLabel}>{option.label}</Text>
                  <Text style={styles.choiceHelp}>{option.help}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionTitle title="Jobsite requirements" />
        <ToggleRow
          title="Extra hose required"
          subtitle="Turn this on when the hose run is longer than a normal setup."
          value={extraHoseRequired}
          onValueChange={setExtraHoseRequired}
        />
        {extraHoseRequired && (
          <View style={styles.revealCard}>
            <Field
              label="Estimated total hose needed"
              value={totalHoseFeet}
              onChangeText={setTotalHoseFeet}
              placeholder="Example: 275"
              keyboardType="number-pad"
              suffix="ft"
            />
            <Text style={styles.helperText}>
              Each pumper can set how many feet are included and their additional per-foot rate. The app can show the estimated surcharge before the job is awarded.
            </Text>
          </View>
        )}

        <ToggleRow
          title="PPE required"
          subtitle="Use this for sites that require specific safety gear."
          value={ppeRequired}
          onValueChange={setPpeRequired}
        />
        {ppeRequired && (
          <View style={styles.revealCard}>
            <Text style={styles.label}>Required PPE</Text>
            <Text style={styles.helperText}>Select everything the pumper needs to bring to this jobsite.</Text>
            <View style={styles.chipWrap}>
              {FINDER_PPE_OPTIONS.map((item) => {
                const selected = requiredPpe.includes(item);
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
          </View>
        )}

        <Text style={styles.label}>Special requests / jobsite details</Text>
        <Text style={styles.helperText}>
          Include anything the pumper should know before requesting the job — difficult access, steep driveway, special fittings, limited parking, gate codes, unusual mix details, or other site requirements.
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any details that do not fit the options above"
          placeholderTextColor={Colors.textLight}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.notesInput]}
        />

        <View style={styles.policyCard}>
          <Ionicons name="people-outline" size={22} color={Colors.primary} />
          <View style={styles.policyTextWrap}>
            <Text style={styles.policyTitle}>Pumpers request — you award</Text>
            <Text style={styles.policyText}>
              Posting does not give the job to the fastest pumper. Interested pumpers request it, then the poster chooses who gets it.
            </Text>
          </View>
        </View>

        <View style={styles.policyCard}>
          <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
          <View style={styles.policyTextWrap}>
            <Text style={styles.policyTitle}>Cancellation policy</Text>
            <Text style={styles.policyText}>
              Pump Finder’s standard cancellation rules will be shown on the review screen before posting.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reviewButton} onPress={continueToReview} activeOpacity={0.8}>
          <Text style={styles.reviewButtonText}>Review Job</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const styles = useStyles();
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({ label, suffix, ...props }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput {...props} placeholderTextColor={Colors.textLight} style={[styles.input, suffix && styles.inputWithSuffix]} />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: Colors.primaryLight }} thumbColor={value ? Colors.primary : Colors.surfaceDark} />
    </View>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 36 },
  intro: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text, marginTop: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 5, maxWidth: 350, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 10, marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  helperText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: -7, marginBottom: 14 },
  inputRow: { position: 'relative' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderDark, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: Colors.text },
  inputWithSuffix: { paddingRight: 48 },
  suffix: { position: 'absolute', right: 14, top: 14, color: Colors.textSecondary, fontWeight: '600' },
  notesInput: { minHeight: 110, marginBottom: 14 },
  optionGroup: { marginBottom: 12 },
  choiceCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderDark, borderRadius: 12, padding: 12, marginBottom: 9, flexDirection: 'row', alignItems: 'center' },
  choiceCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  choiceText: { marginLeft: 10, flex: 1 },
  choiceLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  choiceHelp: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  toggleRow: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 13, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  toggleText: { flex: 1, paddingRight: 12 },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  toggleSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  revealCard: { backgroundColor: Colors.surfaceDark, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 13, marginTop: -2, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: { borderWidth: 1, borderColor: Colors.borderDark, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: Colors.onPrimary },
  policyCard: { flexDirection: 'row', backgroundColor: Colors.primaryBg, borderRadius: 12, padding: 14, marginBottom: 12 },
  policyTextWrap: { flex: 1, marginLeft: 10 },
  policyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  policyText: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  reviewButton: { backgroundColor: Colors.primary, borderRadius: 12, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  reviewButtonText: { color: Colors.onPrimary, fontSize: 17, fontWeight: '700' },
}));
