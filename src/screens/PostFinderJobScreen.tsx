import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PostFinderJobScreen({ navigation }: any) {
  const [customerName, setCustomerName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [address, setAddress] = useState('');
  const [yards, setYards] = useState('');
  const [pumpType, setPumpType] = useState('');
  const [notes, setNotes] = useState('');

  const continueToReview = () => {
    navigation.navigate('ReviewJob', {
      jobDraft: { customerName, startTime, address, yards, pumpType, notes },
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Ionicons name="construct-outline" size={32} color="#2196F3" />
          <Text style={styles.title}>Post a Pumping Job</Text>
          <Text style={styles.subtitle}>Enter the basic job details. You’ll review everything before it is posted.</Text>
        </View>

        <Field label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Customer or company name" />
        <Field label="Start time" value={startTime} onChangeText={setStartTime} placeholder="Example: 7:00 AM" />
        <Field label="Job address" value={address} onChangeText={setAddress} placeholder="Street address, city" />
        <Field label="Yards" value={yards} onChangeText={setYards} placeholder="Estimated concrete yards" keyboardType="decimal-pad" />
        <Field label="Pump type" value={pumpType} onChangeText={setPumpType} placeholder="Optional — trailer, boom, line pump, etc." />

        <Text style={styles.label}>Special notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Access, hose needs, mix details, gate codes, or anything the pumper should know"
          placeholderTextColor="#98A2B3"
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.notesInput]}
        />

        <View style={styles.policyCard}>
          <Ionicons name="information-circle-outline" size={22} color="#2196F3" />
          <View style={styles.policyTextWrap}>
            <Text style={styles.policyTitle}>Cancellation policy</Text>
            <Text style={styles.policyText}>Pump Finder’s standard cancellation rules will be shown on the review screen before posting.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reviewButton} onPress={continueToReview} activeOpacity={0.8}>
          <Text style={styles.reviewButtonText}>Review Job</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor="#98A2B3" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7f9' },
  content: { padding: 16, paddingBottom: 36 },
  intro: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1f2937', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#667085', textAlign: 'center', marginTop: 5, maxWidth: 340 },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#344054', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: '#101828' },
  notesInput: { minHeight: 110, marginBottom: 14 },
  policyCard: { flexDirection: 'row', backgroundColor: '#e8f2ff', borderRadius: 12, padding: 14, marginBottom: 18 },
  policyTextWrap: { flex: 1, marginLeft: 10 },
  policyTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  policyText: { fontSize: 13, color: '#475467', marginTop: 3, lineHeight: 18 },
  reviewButton: { backgroundColor: '#2196F3', borderRadius: 12, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reviewButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
