import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { contactsApi } from '../api/contactsApi';
import Header from '../components/Header';

export default function WhatsappBlastScreen({ onNavigate }) {
  const [targetAudience, setTargetAudience] = useState('leads_all');
  const [templateMessage, setTemplateMessage] = useState(
    'Hello {name}! We have an exclusive opportunity for you at AOTMS. Reply YES to know more.'
  );
  const [campaignTitle, setCampaignTitle] = useState('Mobile WhatsApp Broadcast');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const audiences = [
    { id: 'leads_all', label: 'All CRM Leads', icon: 'people' },
    { id: 'leads_fresh', label: 'Fresh Leads Only', icon: 'sparkles' },
    { id: 'leads_interested', label: 'Interested Prospects', icon: 'heart' },
    { id: 'contacts', label: 'Saved Contacts', icon: 'book' },
  ];

  const presets = [
    'Hello {name}! We noticed your interest in our courses. Can we schedule a quick call today?',
    'Greetings from AOTMS! Special 20% scholarship discount available this week. Reply to book your seat!',
    'Hi {name}, our senior counselor is available to answer your queries. Please let us know a convenient time.',
  ];

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await contactsApi.getBroadcasts();
      setHistory(Array.isArray(data) ? data : data.broadcasts || []);
    } catch (err) {
      console.warn('[Blast] History fetch error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendBlast = async () => {
    if (!templateMessage.trim()) {
      Alert.alert('Required', 'Please enter a message for the blast.');
      return;
    }

    Alert.alert(
      'Confirm WhatsApp Blast',
      `Are you sure you want to trigger this bulk campaign to "${audiences.find((a) => a.id === targetAudience)?.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Blast',
          style: 'default',
          onPress: async () => {
            try {
              setSending(true);
              const payload = {
                title: campaignTitle.trim(),
                target: targetAudience,
                message: templateMessage.trim(),
              };
              const res = await contactsApi.whatsappBlast(payload);
              Alert.alert(
                'Blast Triggered',
                res.message || 'WhatsApp blast broadcast queued successfully!'
              );
              fetchHistory();
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Failed to dispatch blast.';
              Alert.alert('Blast Error', msg);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="WhatsApp Blast"
        subtitle="Mass broadcast marketing"
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Campaign Settings Card */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={styles.waBadge}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.waBadgeText}>OFFICIAL BROADCASTER</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CAMPAIGN TITLE</Text>
            <TextInput
              style={styles.input}
              value={campaignTitle}
              onChangeText={setCampaignTitle}
              placeholder="e.g. Autumn Intake Promo"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Target Audience */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SELECT TARGET AUDIENCE</Text>
            <View style={styles.audienceGrid}>
              {audiences.map((aud) => {
                const isSelected = targetAudience === aud.id;
                return (
                  <TouchableOpacity
                    key={aud.id}
                    style={[styles.audienceTile, isSelected && styles.audienceTileSelected]}
                    onPress={() => setTargetAudience(aud.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={aud.icon}
                      size={18}
                      color={isSelected ? colors.whatsapp : colors.textMuted}
                    />
                    <Text style={[styles.audienceText, isSelected && styles.audienceTextSelected]}>
                      {aud.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Message Content */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MESSAGE TEMPLATE</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={templateMessage}
              onChangeText={setTemplateMessage}
              multiline
              numberOfLines={4}
              placeholder="Type WhatsApp broadcast content..."
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.hintText}>
              Available merge tags: <Text style={{ color: colors.primary }}>{'{name}'}</Text>, <Text style={{ color: colors.primary }}>{'{phone}'}</Text>
            </Text>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>QUICK PRESETS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {presets.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetChip}
                  onPress={() => setTemplateMessage(p)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetText} numberOfLines={1}>Template #{idx + 1}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.blastBtn, sending && styles.disabledBtn]}
            onPress={handleSendBlast}
            disabled={sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                <Text style={styles.blastBtnText}>Dispatch Broadcast</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Blast History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeader}>RECENT BROADCAST RUNS</Text>
          {loadingHistory ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyText}>No previous broadcast logs</Text>
            </View>
          ) : (
            history.map((h, index) => (
              <View key={h._id || index} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {h.title || h.name || 'Broadcast Campaign'}
                  </Text>
                  <Text style={styles.historyStatus}>{h.status || 'Sent'}</Text>
                </View>
                <Text style={styles.historyDate}>
                  {h.createdAt ? new Date(h.createdAt).toLocaleString() : 'Recent'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 16,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  waBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.whatsappDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  waBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  hintText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  audienceTileSelected: {
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    borderColor: colors.whatsapp,
  },
  audienceText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  audienceTextSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  blastBtn: {
    backgroundColor: colors.whatsapp,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  blastBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  historySection: {
    gap: 10,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  historyStatus: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  historyDate: {
    color: colors.textMuted,
    fontSize: 11,
  },
});
