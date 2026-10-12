import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { leadsApi } from '../api/leadsApi';
import Header from '../components/Header';

export default function AddLeadScreen({ onNavigate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [courseInterest, setCourseInterest] = useState('');
  const [status, setStatus] = useState('Fresh');
  const [leadSource, setLeadSource] = useState('Mobile App');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const statuses = ['Fresh', 'Contacted', 'Interested', 'Won', 'Lost'];
  const sources = ['Mobile App', 'Website', 'WhatsApp', 'Social Media', 'Referral', 'Walk-in'];

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Lead name and phone number are required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase() || undefined,
        status,
        leadSource,
        courseInterest: courseInterest.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        notes: notes.trim() ? [{ text: notes.trim() }] : undefined,
      };

      await leadsApi.createLead(payload);
      Alert.alert('Success', 'Lead created successfully!', [
        { text: 'View Leads', onPress: () => onNavigate('all_leads') },
        {
          text: 'Add Another',
          onPress: () => {
            setName('');
            setPhone('');
            setEmail('');
            setCourseInterest('');
            setBudget('');
            setNotes('');
          },
        },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create lead.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Add New Lead"
        subtitle="Create CRM prospect"
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.formCard}>
          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PROSPECT NAME *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PHONE NUMBER *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS (OPTIONAL)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Course / Requirement */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>COURSE / SERVICE INTEREST</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="school-outline" size={18} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Telecom Training, BPO, Tech"
                placeholderTextColor={colors.textMuted}
                value={courseInterest}
                onChangeText={setCourseInterest}
              />
            </View>
          </View>

          {/* Status Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>INITIAL STATUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {statuses.map((st) => {
                const isSelected = status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setStatus(st)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Source Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>LEAD SOURCE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {sources.map((src) => {
                const isSelected = leadSource === src;
                return (
                  <TouchableOpacity
                    key={src}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setLeadSource(src)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{src}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Budget */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>BUDGET / EXPECTED VALUE (₹)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="cash-outline" size={18} color={colors.textMuted} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOTES & REQUIREMENTS</Text>
            <View style={[styles.inputWrapper, { alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={18} color={colors.textMuted} style={[styles.icon, { marginTop: 12 }]} />
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Additional notes about lead requirement..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Create Lead</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 12,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
