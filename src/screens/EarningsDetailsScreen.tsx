import React from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Text, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { parseISO, isWithinInterval } from 'date-fns';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { calculateOwnerPay, calculateEmployeeEarnings, isEmployeeJob, getJobPumperName, getJobPumperGrossPay } from '../utils/jobMath';
import { useAppTheme } from '../theme';

type Params = { startDate: string; endDate: string; periodLabel: string; paidOnly?: boolean };
const money = (amount: number) => '$' + amount.toFixed(2);

export default function EarningsDetailsScreen() {
  const { params } = useRoute<any>();
  const { startDate, endDate, periodLabel, paidOnly = false } = params as Params;
  const navigation = useNavigation<any>();
  const { jobs } = useJobs();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const selected = jobs.filter(job => {
    const date = parseISO(job.date);
    return isWithinInterval(date, { start: parseISO(startDate), end: parseISO(endDate) })
      && (!paidOnly || job.isPaid);
  }).sort((a, b) => a.date.localeCompare(b.date));
  const owner = user?.role === 'owner';
  const ownerPay = calculateOwnerPay(selected);
  const employeePay = calculateEmployeeEarnings(selected, user?.commissionRate ?? 50);

  const row = (label: string, amount: number, bold = false) => (
    <View style={styles.row} key={label}>
      <Text style={[styles.label, { color: colors.text }, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.amount, { color: colors.text }, bold && styles.bold]}>{money(amount)}</Text>
    </View>
  );
  const jobRows = (group: typeof selected) => group.map(job => {
    const amount = Number(job.amount || 0);
    const contribution = owner
      ? (isEmployeeJob(job) ? amount - getJobPumperGrossPay(job) : amount)
      : (job.jobType === 'personal' ? amount : amount * Number(job.employeeCommissionRate ?? user?.commissionRate ?? 50) / 100);
    return (
      <TouchableOpacity key={job.id} style={styles.jobRow} onPress={() => navigation.navigate('JobDetail', { jobId: job.id, job })}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.bold, { color: colors.text }]} numberOfLines={1}>{job.clientName || job.address || 'Job'}</Text>
          <Text style={{ color: colors.text, opacity: 0.7 }}>{job.date} · {money(amount)} billed</Text>
        </View>
        <Text style={[styles.bold, { color: colors.text }]}>{money(contribution)} ›</Text>
      </TouchableOpacity>
    );
  });
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.subtitle, { color: colors.text }]}>{periodLabel}{paidOnly ? ' · Paid jobs only' : ''}</Text>
      {owner ? (
        <>
          <Card style={styles.card}><Card.Content>
            <Text variant="titleMedium">Owner earnings</Text>
            {row('Your jobs', ownerPay.ownerJobRevenue)}
            {row('Employee job revenue', ownerPay.employeeRevenue)}
            {row('Employee commissions', -ownerPay.grossPumperPay)}
            {row('Your share of employee jobs', ownerPay.ownerShareOfEmployeeJobs)}
            <Divider style={styles.divider} />
            {row('Total Earned', ownerPay.ownerAfterPumperPay, true)}
          </Card.Content></Card>
          <Card style={styles.card}><Card.Content>
            <Text variant="titleMedium">Employee payments</Text>
            {row('Employees earned', ownerPay.grossPumperPay)}
            {row('Direct payments', -ownerPay.directPaymentsToPumpers)}
            {row('Still owed', ownerPay.amountOwedToPumpers, true)}
            {ownerPay.byPumper.map(p => (
              <View key={p.key} style={styles.employeeBlock}>
                <Text style={[styles.bold, { color: colors.text }]}>{p.name}</Text>
                {row('Commission earned', p.grossPay)}
                {row('Direct payments', -p.directPayments)}
                {row('Still owed', p.amountOwed)}
              </View>
            ))}
          </Card.Content></Card>
          <Card style={styles.card}><Card.Content>
            <Text variant="titleMedium">Your jobs</Text>
            {jobRows(selected.filter(job => !isEmployeeJob(job)))}
            <Divider style={styles.divider} />
            <Text variant="titleMedium">Employee jobs (your share)</Text>
            {jobRows(selected.filter(isEmployeeJob))}
          </Card.Content></Card>
        </>
      ) : (
        <>
          <Card style={styles.card}><Card.Content>
            <Text variant="titleMedium">Your earnings</Text>
            {row('Company commissions', employeePay.companyCommission)}
            {row('Independent jobs', employeePay.independentEarnings)}
            <Divider style={styles.divider} />
            {row('Total Earned', employeePay.earned, true)}
            <Divider style={styles.divider} />
            {row('Direct payments received', employeePay.directPayments)}
            {row('Still owed by employer', employeePay.owed, true)}
          </Card.Content></Card>
          <Card style={styles.card}><Card.Content>
            <Text variant="titleMedium">Company jobs</Text>
            {jobRows(selected.filter(job => job.jobType !== 'personal'))}
            <Divider style={styles.divider} />
            <Text variant="titleMedium">Independent jobs</Text>
            {jobRows(selected.filter(job => job.jobType === 'personal'))}
          </Card.Content></Card>
        </>
      )}
      {!selected.length && <Text style={[styles.subtitle, { color: colors.text }]}>No jobs in this period.</Text>}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 12 },
  card: { marginBottom: 14 },
  divider: { marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  label: { flexShrink: 1, paddingRight: 8, fontSize: 14 },
  amount: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
  bold: { fontWeight: '700' },
  jobRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#999' },
  employeeBlock: { marginTop: 14 },
});
