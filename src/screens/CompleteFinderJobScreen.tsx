import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  completeFinderJob,
  getFinderPrivateDetails,
  subscribeFinderJob,
} from '../services/pumpFinderMarketplace';
import {
  FinderCloseoutPaymentMethod,
  FinderPrivateJobDetails,
  FinderPublicJob,
} from '../types/pumpFinder';
import { makeStyles, useAppTheme } from '../theme';
import ThemedHero from '../components/ThemedHero';

const PAYMENT_METHODS: FinderCloseoutPaymentMethod[] = [
  'Cash',
  'Check',
  'Zelle',
  'Square',
  'Card',
  'Charge',
];

export default function CompleteFinderJobScreen({ navigation, route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const jobId: string | undefined = route?.params?.jobId;

  const [job, setJob] = useState<FinderPublicJob | null>(null);
  const [privateDetails, setPrivateDetails] =
    useState<FinderPrivateJobDetails | null>(null);
  const [actualYards, setActualYards] = useState('');
  const [actualHours, setActualHours] = useState('');
  const [actualHoseFeet, setActualHoseFeet] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<FinderCloseoutPaymentMethod>('Cash');
  const [isPaid, setIsPaid] = useState(false);
  const [isPaidToMe, setIsPaidToMe] = useState(false);
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!jobId) {
      setLoadError('No Pump Finder job was selected.');
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeFinderJob(
      jobId,
      async nextJob => {
        setJob(nextJob);

        if (nextJob) {
          if (!actualYards && nextJob.yards) {
            setActualYards(String(nextJob.yards));
          }
          if (!actualHoseFeet && nextJob.totalHoseFeet !== undefined) {
            setActualHoseFeet(String(nextJob.totalHoseFeet));
          }

          try {
            const details = await getFinderPrivateDetails(jobId);
            setPrivateDetails(details);
          } catch (error: any) {
            console.warn('Could not load private Finder closeout details:', error);
          }
        }

        setLoadError('');
        setLoading(false);
      },
      error => {
        setLoadError(error.message || 'Could not load this Pump Finder job.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  const canComplete = useMemo(
    () => job?.status === 'pumping' || job?.status === 'in-progress',
    [job?.status]
  );

  const handleComplete = async () => {
    if (!jobId || saving) return;

    const yards = Number(actualYards);
    const hours = actualHours.trim() ? Number(actualHours) : undefined;
    const hoseFeet = actualHoseFeet.trim() ? Number(actualHoseFeet) : undefined;
    const price = Number(finalPrice);

    if (!Number.isFinite(yards) || yards <= 0) {
      Alert.alert('Check yards', 'Enter the actual yards pumped.');
      return;
    }

    if (hours !== undefined && (!Number.isFinite(hours) || hours <= 0)) {
      Alert.alert('Check hours', 'Enter valid hours or leave the field blank.');
      return;
    }

    if (hoseFeet !== undefined && (!Number.isFinite(hoseFeet) || hoseFeet < 0)) {
      Alert.alert('Check hose', 'Enter valid hose feet or leave the field blank.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Check final price', 'Enter the final amount for this pumping job.');
      return;
    }

    if (paymentMethod === 'Check' && !checkNumber.trim()) {
      Alert.alert('Check number needed', 'Enter the check number.');
      return;
    }

    try {
      setSaving(true);

      await completeFinderJob(jobId, {
        actualYards: yards,
        actualHours: hours,
        actualHoseFeet: hoseFeet,
        finalPrice: price,
        paymentMethod,
        isPaid,
        isPaidToMe: isPaid ? isPaidToMe : false,
        checkNumber: paymentMethod === 'Check' ? checkNumber.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Finder job completed',
        'The closeout is saved and this job was added to JobTracker automatically.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('ActiveJobs'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Could not complete job',
        error?.message || 'Pump Finder could not save this job closeout.'
      );
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
      <ThemedHero
        icon="checkmark-done-outline"
        title="Complete Finder Job"
        subtitle="Close out the actual pump work. Pump Finder will save the record into JobTracker too."
      />

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateText}>Loading job…</Text>
        </View>
      ) : loadError || !job ? (
        <View style={styles.stateCard}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
          <Text style={styles.stateTitle}>Couldn’t load job</Text>
          <Text style={styles.stateText}>
            {loadError || 'This Pump Finder job could not be found.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Job</Text>
            <SummaryRow label="Area" value={job.generalArea} />
            <SummaryRow label="Date" value={job.jobDate} />
            <SummaryRow label="Start" value={job.startTime} />
            {privateDetails ? (
              <>
                <SummaryRow label="Customer" value={privateDetails.customerName} />
                <SummaryRow label="Address" value={privateDetails.exactAddress} />
              </>
            ) : null}
          </View>

          {!canComplete ? (
            <View style={styles.noticeCard}>
              <Ionicons name="information-circle-outline" size={21} color={Colors.primary} />
              <Text style={styles.noticeText}>
                This job needs to be marked Pumping before it can be completed.
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actual job details</Text>

            <Field
              label="Actual yards pumped"
              value={actualYards}
              onChangeText={setActualYards}
              keyboardType="decimal-pad"
              placeholder="12"
              suffix="yd"
            />

            <Field
              label="Actual hours"
              value={actualHours}
              onChangeText={setActualHours}
              keyboardType="decimal-pad"
              placeholder="Optional"
              suffix="hr"
            />

            <Field
              label="Actual hose used"
              value={actualHoseFeet}
              onChangeText={setActualHoseFeet}
              keyboardType="number-pad"
              placeholder="Optional"
              suffix="ft"
            />

            <Field
              label="Final pumping price"
              value={finalPrice}
              onChangeText={setFinalPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
              prefix="$"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>

            <View style={styles.chipWrap}>
              {PAYMENT_METHODS.map(method => {
                const selected = method === paymentMethod;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setPaymentMethod(method)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {paymentMethod === 'Check' ? (
              <Field
                label="Check number"
                value={checkNumber}
                onChangeText={setCheckNumber}
                keyboardType="number-pad"
                placeholder="Check #"
              />
            ) : null}

            <TouchableOpacity
              style={[styles.toggleRow, isPaid && styles.toggleRowSelected]}
              onPress={() => {
                const next = !isPaid;
                setIsPaid(next);
                if (!next) setIsPaidToMe(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPaid ? 'checkmark-circle' : 'ellipse-outline'}
                size={21}
                color={isPaid ? Colors.primary : Colors.textSecondary}
              />
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleTitle}>Job has been paid</Text>
                <Text style={styles.toggleText}>
                  Turn this on only if payment for the pumping job has actually been received.
                </Text>
              </View>
            </TouchableOpacity>

            {isPaid ? (
              <TouchableOpacity
                style={[styles.toggleRow, isPaidToMe && styles.toggleRowSelected]}
                onPress={() => setIsPaidToMe(current => !current)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPaidToMe ? 'checkmark-circle' : 'ellipse-outline'}
                  size={21}
                  color={isPaidToMe ? Colors.primary : Colors.textSecondary}
                />
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>I received this payment directly</Text>
                  <Text style={styles.toggleText}>
                    This keeps JobTracker’s employee/direct-payment reporting consistent.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Closeout notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional: extra hose, delay, washout, payment note, or anything worth keeping with the job."
              placeholderTextColor={Colors.textLight}
              multiline
              textAlignVertical="top"
              style={styles.notesInput}
            />
          </View>

          <View style={styles.jobTrackerCard}>
            <Ionicons name="albums-outline" size={22} color={Colors.primary} />
            <View style={styles.noticeTextWrap}>
              <Text style={styles.jobTrackerTitle}>Automatic JobTracker handoff</Text>
              <Text style={styles.jobTrackerText}>
                Completing this Finder job creates one matching JobTracker record using the customer, address, actual yards, final price, and payment details. Retrying the closeout will update the same imported record instead of creating another one.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.completeButton,
              (!canComplete || saving) && styles.disabledButton,
            ]}
            onPress={handleComplete}
            disabled={!canComplete || saving}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-done" size={21} color={Colors.onPrimary} />
            <Text style={styles.completeButtonText}>
              {saving ? 'Completing…' : 'Complete Job'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  stateCard: {
    minHeight: 190,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  stateTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  stateText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  summaryLabel: {
    width: 95,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValue: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  noticeTextWrap: { flex: 1 },
  noticeText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  field: { marginBottom: 12 },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrap: { position: 'relative', justifyContent: 'center' },
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
  inputWithPrefix: { paddingLeft: 28 },
  inputWithSuffix: { paddingRight: 55 },
  prefix: {
    position: 'absolute',
    left: 13,
    zIndex: 2,
    color: Colors.textSecondary,
    fontWeight: '800',
  },
  suffix: {
    position: 'absolute',
    right: 13,
    zIndex: 2,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextSelected: { color: Colors.onPrimary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 11,
    padding: 12,
    marginTop: 8,
  },
  toggleRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  toggleTextWrap: { flex: 1 },
  toggleTitle: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 2,
  },
  notesInput: {
    minHeight: 105,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderDark,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  jobTrackerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  jobTrackerTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  jobTrackerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  completeButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: { opacity: 0.55 },
}));
