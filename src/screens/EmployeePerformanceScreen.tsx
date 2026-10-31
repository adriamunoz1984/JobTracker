import React, { useState } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Card, Text, Divider, Button, SegmentedButtons } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useRoute } from '@react-navigation/native';
import { eachWeekOfInterval, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO, isWithinInterval, addYears, addMonths, addWeeks } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useJobs } from '../context/JobsContext';
import { useAuth } from '../context/AuthContext';
import { useAppTheme, withOpacity } from '../theme';
import { getJobPumperGrossPay, isEmployeeJob } from '../utils/jobMath';
import { nameExportedPdf } from '../utils/exportFileName';

const width = Dimensions.get('window').width - 65;
const money = (n: number) => '$' + n.toFixed(2);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default function EmployeePerformanceScreen() {
  const route = useRoute<any>();
  const { employeeId, employeeName, year } = route.params as { employeeId: string; employeeName: string; year: number };
  const { jobs } = useJobs();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const [mode, setMode] = useState<'year' | 'month' | 'week'>('year');
  const [cursor, setCursor] = useState(new Date(year, 0, 1));
  const [exporting, setExporting] = useState(false);
  const isOwner = user?.role === 'owner';
  const start = mode === 'year' ? startOfYear(cursor) : mode === 'month' ? startOfMonth(cursor) : startOfWeek(cursor);
  const end = mode === 'year' ? endOfYear(cursor) : mode === 'month' ? endOfMonth(cursor) : endOfWeek(cursor);
  const label = mode === 'year' ? format(start, 'yyyy') : mode === 'month' ? format(start, 'MMMM yyyy') : format(start, 'MMM d') + ' – ' + format(end, 'MMM d, yyyy');
  const employeeJobs = jobs.filter(job => {
    if (!isEmployeeJob(job) || job.jobType === 'personal') return false;
    const key = job.employeeId || job.assignedTo || job.employeeName || 'Unknown';
    return key === employeeId && isWithinInterval(parseISO(job.date), { start, end });
  });
  const revenue = sum(employeeJobs.map(job => Number(job.amount || 0)));
  const commission = sum(employeeJobs.map(getJobPumperGrossPay));
  const yards = sum(employeeJobs.map(job => Number(job.yards || 0)));
  const direct = sum(employeeJobs.filter(job => job.isPaidToMe).map(job => Number(job.amount || 0)));
  const owed = commission - direct;
  const weeklyStarts = eachWeekOfInterval({ start, end });
  const monthlyStarts = eachMonthOfInterval({ start, end });
  const buckets = (dates: Date[], kind: 'week' | 'month', metric: 'earnings' | 'revenue' | 'jobs') => dates.map(date => {
    const intervalEnd = kind === 'week' ? endOfWeek(date) : endOfMonth(date);
    const filtered = employeeJobs.filter(job => isWithinInterval(parseISO(job.date), { start: date, end: intervalEnd }));
    return metric === 'jobs' ? filtered.length : metric === 'earnings'
      ? sum(filtered.map(getJobPumperGrossPay)) : sum(filtered.map(job => Number(job.amount || 0)));
  });
  const weeklyEarnings = buckets(weeklyStarts, 'week', 'earnings');
  const weeklyVolume = buckets(weeklyStarts, 'week', 'jobs');
  const monthlyRevenue = buckets(monthlyStarts, 'month', 'revenue');
  const highestWeek = weeklyEarnings.length ? Math.max(...weeklyEarnings) : 0;
  const bestMonth = monthlyRevenue.length ? Math.max(...monthlyRevenue) : 0;
  const move = (direction: number) => setCursor(d => mode === 'year' ? addYears(d, direction) : mode === 'month' ? addMonths(d, direction) : addWeeks(d, direction));
  const chartConfig = {
    backgroundGradientFrom: colors.surface, backgroundGradientTo: colors.surface,
    color: (opacity = 1) => withOpacity(colors.primary, opacity),
    labelColor: (opacity = 1) => withOpacity(colors.text, opacity), decimalPlaces: 0,
    propsForDots: { r: '2' },
  };
  const chart = (title: string, values: number[], names: string[]) => (
    <Card style={{ marginBottom: 14 }}><Card.Content>
      <Text variant="titleMedium">{title}</Text>
      <Divider style={{ marginVertical: 10 }} />
      {values.some(v => v > 0) ? (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <LineChart data={{ labels: names, datasets: [{ data: values }] }}
            width={Math.max(width, values.length * 29)} height={200} chartConfig={chartConfig}
            withShadow={false} fromZero style={{ borderRadius: 8 }} />
        </ScrollView>
      ) : <Text style={{ color: colors.text }}>No recorded activity for this period.</Text>}
    </Card.Content></Card>
  );
  const detail = (title: string, value: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
      <Text style={{ color: colors.text, flexShrink: 1 }}>{title}</Text>
      <Text style={{ color: colors.text, fontWeight: 'bold', marginLeft: 8 }}>{value}</Text>
    </View>
  );
  const exportReport = async () => {
    setExporting(true);
    try {
      const lines = [
        ['Jobs recorded', String(employeeJobs.length)], ['Yards pumped', String(yards)],
        ['Revenue generated', money(revenue)], ['Commission earned', money(commission)],
        ['Direct payments received', money(direct)], ['Still owed', money(owed)],
        ['Average commission per job', money(employeeJobs.length ? commission / employeeJobs.length : 0)],
        ['Average yards per job', (employeeJobs.length ? yards / employeeJobs.length : 0).toFixed(1)],
        ['Highest weekly earnings', money(highestWeek)], ['Highest monthly revenue', money(bestMonth)],
      ];
      const graphTable = (title: string, dates: Date[], values: number[]) =>
        '<h2>' + title + '</h2><table><tr><th>Period</th><th>Value</th></tr>' +
        dates.map((d, i) => '<tr><td>' + esc(format(d, 'MMM d, yyyy')) + '</td><td>' + values[i].toFixed(2) + '</td></tr>').join('') + '</table>';
      const html = '<html><head><style>body{font-family:Arial;color:#222;padding:28px}h1{color:#234}table{width:100%;border-collapse:collapse;margin:12px 0 28px}td,th{padding:7px;border-bottom:1px solid #ddd;text-align:left}th{background:#eee}.note{color:#666;font-size:12px}</style></head><body>' +
        '<h1>Employee Earnings &amp; Activity Report</h1><h2>' + esc(employeeName) + '</h2><p>Period: ' + esc(label) + '</p>' +
        '<p class="note">For personal records only. Not an official pay stub or payroll statement. Independent jobs are excluded.</p>' +
        '<table>' + lines.map(([k, v]) => '<tr><td>' + esc(k) + '</td><td>' + esc(v) + '</td></tr>').join('') + '</table>' +
        graphTable('Weekly earnings', weeklyStarts, weeklyEarnings) +
        graphTable('Weekly jobs', weeklyStarts, weeklyVolume) +
        graphTable('Monthly revenue', monthlyStarts, monthlyRevenue) +
        '</body></html>';
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(await nameExportedPdf(uri, 'JT-Employee-' + employeeName.replace(/[^a-z0-9-]/gi, '-') + '-' + format(start, 'yyyy-MM-dd')));
      }
    } catch (error) {
      console.error('Employee report PDF error', error);
      Alert.alert('Export failed', 'Could not create the employee report.');
    } finally { setExporting(false); }
  };
  if (!isOwner) return <View style={{ padding: 20 }}><Text>This report is available to owners only.</Text></View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 14 }}>
      <Card style={{ marginBottom: 14 }}><Card.Content>
        <Text variant="headlineSmall">{employeeName}</Text>
        <Text style={{ color: colors.text }}>Employee earnings & activity</Text>
        <SegmentedButtons value={mode} onValueChange={v => setMode(v as typeof mode)}
          buttons={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} style={{ marginTop: 12 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Button onPress={() => move(-1)}>‹</Button><Text style={{ color: colors.text, fontWeight: 'bold' }}>{label}</Text><Button onPress={() => move(1)}>›</Button>
        </View>
      </Card.Content></Card>
      <Card style={{ marginBottom: 14 }}><Card.Content>
        {detail('Jobs', String(employeeJobs.length))}
        {detail('Yards pumped', yards.toFixed(1))}
        {detail('Revenue generated', money(revenue))}
        {detail('Commission earned', money(commission))}
        {detail('Direct payments', money(direct))}
        {detail('Still owed', money(owed))}
        <Divider style={{ marginVertical: 8 }} />
        {detail('Avg earnings / job', money(employeeJobs.length ? commission / employeeJobs.length : 0))}
        {detail('Avg yards / job', (employeeJobs.length ? yards / employeeJobs.length : 0).toFixed(1))}
        {detail('Highest weekly earnings', money(highestWeek))}
        {detail('Highest monthly revenue', money(bestMonth))}
      </Card.Content></Card>
      {chart('Weekly earnings ($)', weeklyEarnings, weeklyStarts.map((d, i) => i % 4 === 0 ? format(d, 'MMM d') : ''))}
      {chart('Weekly jobs', weeklyVolume, weeklyStarts.map((d, i) => i % 4 === 0 ? format(d, 'MMM d') : ''))}
      {chart('Monthly revenue ($)', monthlyRevenue, monthlyStarts.map(d => format(d, 'MMM')))}
      <Button mode="contained" icon="file-pdf-box" onPress={exportReport} loading={exporting} disabled={exporting} style={{ marginBottom: 25 }}>Export employee report (PDF)</Button>
    </ScrollView>
  );
}
