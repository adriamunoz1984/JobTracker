import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinderJobDraft, FINDER_REQUEST_POLICY } from '../types/pumpFinder';
import { useAppTheme, makeStyles } from '../theme';
import ThemedHero from '../components/ThemedHero';

const pricingLabels = {
  standard: 'Standard pricing',
  hourly: 'Hourly / standby',
  'prevailing-wage': 'Prevailing wage / public works',
};

export default function ReviewFinderJobScreen({ navigation, route }: any) {
  const { colors: Colors } = useAppTheme();
  const styles = useStyles();
  const jobDraft: FinderJobDraft | undefined = route?.params?.jobDraft;

  if (!jobDraft) {
    return (
      <View style={styles.empty}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No job draft found</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Back to Job Form</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePost = () => {
    Alert.alert(
      'Job draft is ready',
      'The posting UI and rules are in place. Live marketplace posting will be connected after the Finder Firestore security rules are finalized so jobs are not exposed insecurely.',
      [
        { text: 'Keep Editing', style: 'cancel', onPress: () => navigation.goBack() },
        { text: 'OK' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ThemedHero
        icon="checkmark-circle-outline"
        title="Review Job"
        subtitle="Make sure pumpers have everything they need before the job goes live."
      />

      <ReviewCard title="Job">
        <ReviewRow label="Customer" value={jobDraft.customerName} />
        <ReviewRow label="Start" value={jobDraft.startTime} />
        <ReviewRow label="Address" value={jobDraft.address} />
        <ReviewRow label="Estimated yards" value={jobDraft.yards ? String(jobDraft.yards) : 'Not entered'} />
        <ReviewRow label="Pump type" value={jobDraft.pumpType || 'Any / not specified'} />
        <ReviewRow label="Concrete PSI" value={jobDraft.concretePsi ? `${jobDraft.concretePsi} PSI` : 'Not specified'} />
        <ReviewRow label="Pricing mode" value={pricingLabels[jobDraft.pricingMode]} />
      </ReviewCard>

      <ReviewCard title="Jobsite requirements">
        <ReviewRow
          label="Extra hose"
          value={
            jobDraft.extraHoseRequired
              ? `Required — about ${jobDraft.totalHoseFeet || '?'} ft total`
              : 'No extra hose requirement'
          }
        />
        <ReviewRow
          label="PPE"
          value={
            jobDraft.ppeRequired
              ? jobDraft.requiredPpe.length
                ? jobDraft.requiredPpe.join(', ')
                : 'Required — specific items not selected'
              : 'No special PPE requirement'
          }
        />
      </ReviewCard>

      {jobDraft.notes ? (
        <ReviewCard title="Special requests / jobsite details">
          <Text style={styles.notes}>{jobDraft.notes}</Text>
        </ReviewCard>
      ) : null}

      <View style={styles.infoCard}>
        <Ionicons name="git-pull-request-outline" size={23} color={Colors.primary} />
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Pumpers request — poster awards</Text>
          <Text style={styles.infoText}>
            This job will not go to the fastest tap. Pumpers request the job and the poster chooses who receives it.
            Pumpers cannot transfer an awarded job on their own.
          </Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={23} color={Colors.primary} />
        <View style={styles.infoTextWrap}>
          <Text style={styles.infoTitle}>Marketplace safeguards</Text>
          <Text style={styles.infoText}>
            V1 policy: up to {FINDER_REQUEST_POLICY.maxPendingRequestsPerPumper} pending requests per pumper,
            overlapping awarded jobs are blocked, and replacement recommendations still require poster approval.
          </Text>
        </View>
      </View>

      <View style={styles.warningCard}>
        <Ionicons name="information-circle-outline" size={23} color={Colors.warning} />
        <View style={styles.infoTextWrap}>
          <Text style={styles.warningTitle}>Cancellation</Text>
          <Text style={styles.warningText}>
            Standard Pump Finder cancellation and no-show rules will apply once the live posting backend is enabled.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.editButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
        <Ionicons name="create-outline" size={20} color={Colors.primary} />
        <Text style={styles.editButtonText}>Edit Job</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.primaryButton} onPress={handlePost} activeOpacity={0.8}>
        <Text style={styles.primaryButtonText}>Post Job</Text>
        <Ionicons name="send" size={19} color={Colors.onPrimary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.divider} />
      {children}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 36 },
  hero: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginTop: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 5, maxWidth: 350, lineHeight: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, borderLeftWidth: 4, borderLeftColor: Colors.primary, paddingLeft: 10 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, gap: 12 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, width: 108 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 13, color: Colors.text, lineHeight: 18 },
  notes: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  infoCard: { flexDirection: 'row', backgroundColor: Colors.primaryBg, borderRadius: 12, padding: 14, marginBottom: 12 },
  warningCard: { flexDirection: 'row', backgroundColor: Colors.warningBg, borderRadius: 12, padding: 14, marginBottom: 16 },
  infoTextWrap: { flex: 1, marginLeft: 10 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: Colors.text },
  infoText: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  warningTitle: { fontSize: 14, fontWeight: '800', color: Colors.warning },
  warningText: { fontSize: 12, color: Colors.warning, marginTop: 3, lineHeight: 18 },
  editButton: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, backgroundColor: Colors.surface },
  editButtonText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  primaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: Colors.onPrimary, fontSize: 17, fontWeight: '800' },
  empty: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 10, marginBottom: 20 },
}));
