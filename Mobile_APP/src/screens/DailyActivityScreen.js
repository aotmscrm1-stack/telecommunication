import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { dailyActivityApi } from '../api/dailyActivityApi';
import Header from '../components/Header';

export default function DailyActivityScreen({ onNavigate }) {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [activeDate, setActiveDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'history'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [reportId, setReportId] = useState(null);
  const [reportStatus, setReportStatus] = useState('draft'); // draft | submitted | reviewed | needs_correction
  const [callsAttempted, setCallsAttempted] = useState('0');
  const [connectedCalls, setConnectedCalls] = useState('0');
  const [unansweredCalls, setUnansweredCalls] = useState('0');
  const [interestedLeads, setInterestedLeads] = useState('0');
  const [followUpsScheduled, setFollowUpsScheduled] = useState('0');
  const [conversions, setConversions] = useState('0');
  const [remarks, setRemarks] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchDailyReport = useCallback(async (date) => {
    try {
      setLoading(true);
      const res = await dailyActivityApi.getActivity(date);
      if (res && res.success && res.activity) {
        const act = res.activity;
        setReportId(act._id || act.id || null);
        setReportStatus(act.status || 'draft');
        const m = act.metrics || {};
        setCallsAttempted(String(m.callsAttempted ?? 0));
        setConnectedCalls(String(m.connectedCalls ?? 0));
        setUnansweredCalls(String(m.unansweredCalls ?? 0));
        setInterestedLeads(String(m.interestedLeads ?? 0));
        setFollowUpsScheduled(String(m.followUpsScheduled ?? 0));
        setConversions(String(m.conversions ?? 0));
        setRemarks(act.remarks || '');
        setNextSteps(act.nextSteps || '');
      } else {
        // Reset for new draft
        setReportId(null);
        setReportStatus('draft');
        setCallsAttempted('0');
        setConnectedCalls('0');
        setUnansweredCalls('0');
        setInterestedLeads('0');
        setFollowUpsScheduled('0');
        setConversions('0');
        setRemarks('');
        setNextSteps('');
      }
    } catch (err) {
      console.warn('[DailyActivity] Error fetching report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await dailyActivityApi.getHistory({ limit: 20 });
      if (res && res.success) {
        setHistoryList(res.activities || []);
      }
    } catch (err) {
      console.warn('[DailyActivity] History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyReport(activeDate);
  }, [activeDate, fetchDailyReport]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'report') {
      fetchDailyReport(activeDate);
    } else {
      fetchHistory();
    }
  };

  const validateForm = () => {
    const attempted = parseInt(callsAttempted, 10) || 0;
    const connected = parseInt(connectedCalls, 10) || 0;
    const interested = parseInt(interestedLeads, 10) || 0;

    if (connected > attempted) {
      Alert.alert('Validation Error', `Connected calls (${connected}) cannot exceed calls attempted (${attempted}).`);
      return false;
    }
    if (interested > connected) {
      Alert.alert('Validation Error', `Interested leads (${interested}) cannot exceed connected calls (${connected}).`);
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const payload = {
        activityDate: activeDate,
        department: user?.department || 'Telecalling',
        metrics: {
          callsAttempted: parseInt(callsAttempted, 10) || 0,
          connectedCalls: parseInt(connectedCalls, 10) || 0,
          unansweredCalls: parseInt(unansweredCalls, 10) || 0,
          interestedLeads: parseInt(interestedLeads, 10) || 0,
          followUpsScheduled: parseInt(followUpsScheduled, 10) || 0,
          conversions: parseInt(conversions, 10) || 0,
        },
        remarks: remarks.trim(),
        nextSteps: nextSteps.trim(),
      };

      const res = await dailyActivityApi.saveDraft(payload);
      if (res && res.success) {
        if (res.activity?._id) setReportId(res.activity._id);
        Alert.alert('Success', 'Daily activity draft saved successfully.');
      } else {
        Alert.alert('Notice', res?.message || 'Could not save draft.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save draft';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    Alert.alert(
      'Submit Daily Activity',
      `Are you sure you want to formally submit your activity report for ${activeDate}? Once submitted, you cannot edit unless reviewed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Now',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              // Save draft first to ensure doc ID exists
              const payload = {
                activityDate: activeDate,
                department: user?.department || 'Telecalling',
                metrics: {
                  callsAttempted: parseInt(callsAttempted, 10) || 0,
                  connectedCalls: parseInt(connectedCalls, 10) || 0,
                  unansweredCalls: parseInt(unansweredCalls, 10) || 0,
                  interestedLeads: parseInt(interestedLeads, 10) || 0,
                  followUpsScheduled: parseInt(followUpsScheduled, 10) || 0,
                  conversions: parseInt(conversions, 10) || 0,
                },
                remarks: remarks.trim(),
                nextSteps: nextSteps.trim(),
              };

              let currentId = reportId;
              if (!currentId) {
                const saveRes = await dailyActivityApi.saveDraft(payload);
                currentId = saveRes?.activity?._id;
                setReportId(currentId);
              }

              if (!currentId) {
                throw new Error('Unable to generate activity record.');
              }

              const submitRes = await dailyActivityApi.submitActivity(currentId, payload);
              if (submitRes && submitRes.success) {
                setReportStatus('submitted');
                Alert.alert('Report Submitted', 'Your daily activity has been formally submitted for manager review.');
              }
            } catch (err) {
              const msg = err.response?.data?.message || err.message || 'Submission failed';
              Alert.alert('Submission Error', msg);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const isLocked = reportStatus === 'submitted' || reportStatus === 'reviewed';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return { label: 'Submitted', bg: '#E0F2FE', text: '#0369A1' };
      case 'reviewed':
        return { label: 'Reviewed', bg: '#DCFCE7', text: '#15803D' };
      case 'needs_correction':
        return { label: 'Needs Correction', bg: '#FEE2E2', text: '#B91C1C' };
      case 'draft':
      default:
        return { label: 'Draft', bg: '#FEF3C7', text: '#B45309' };
    }
  };

  const statusBadge = getStatusBadge(reportStatus);

  return (
    <View style={styles.container}>
      <Header title="Daily Activity" subtitle={`Date: ${activeDate}`} />

      {/* Segmented Top Tabs */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'report' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('report')}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === 'report' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.segmentText, activeTab === 'report' && styles.segmentTextActive]}>
            Daily Report
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === 'history' ? '#FFFFFF' : '#64748B'}
          />
          <Text style={[styles.segmentText, activeTab === 'history' && styles.segmentTextActive]}>
            Activity History
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'report' ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#174EA6']} />}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#174EA6" />
                <Text style={styles.loadingText}>Loading report for {activeDate}...</Text>
              </View>
            ) : (
              <>
                {/* Status & Date Bar */}
                <View style={styles.statusCard}>
                  <View>
                    <Text style={styles.statusDateLabel}>Activity Date</Text>
                    <Text style={styles.statusDateValue}>{activeDate}</Text>
                  </View>
                  <View style={[styles.badgePill, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {isLocked && (
                  <View style={styles.lockedNotice}>
                    <Ionicons name="lock-closed" size={16} color="#0369A1" />
                    <Text style={styles.lockedNoticeText}>
                      This report has been {reportStatus} and is locked for editing.
                    </Text>
                  </View>
                )}

                {/* Metrics Input Grid */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionHeader}>
                    <Ionicons name="call-outline" size={16} color="#174EA6" /> Calling Metrics
                  </Text>

                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.fieldLabel}>Calls Attempted</Text>
                      <TextInput
                        style={[styles.input, isLocked && styles.disabledInput]}
                        value={callsAttempted}
                        onChangeText={setCallsAttempted}
                        keyboardType="numeric"
                        editable={!isLocked}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.fieldLabel}>Connected Calls</Text>
                      <TextInput
                        style={[styles.input, isLocked && styles.disabledInput]}
                        value={connectedCalls}
                        onChangeText={setConnectedCalls}
                        keyboardType="numeric"
                        editable={!isLocked}
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.fieldLabel}>Unanswered Calls</Text>
                      <TextInput
                        style={[styles.input, isLocked && styles.disabledInput]}
                        value={unansweredCalls}
                        onChangeText={setUnansweredCalls}
                        keyboardType="numeric"
                        editable={!isLocked}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.fieldLabel}>Interested Leads</Text>
                      <TextInput
                        style={[styles.input, isLocked && styles.disabledInput]}
                        value={interestedLeads}
                        onChangeText={setInterestedLeads}
                        keyboardType="numeric"
                        editable={!isLocked}
                        placeholder="0"
                      />
                    </View>
                  </View>

                  <View style={styles.gridRow}>
                    <View style={styles.gridItem}>
                      <Text style={styles.fieldLabel}>Follow-ups Scheduled</Text>
                      <TextInput
                        style={[styles.input, isLocked && styles.disabledInput]}
                        value={followUpsScheduled}
                        onChangeText={setFollowUpsScheduled}
                        keyboardType="numeric"
                        editable={!isLocked}
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.fieldLabel}>Conversions</Text>
                      <TextInput
                        style={[styles.input, isLocked && styles.disabledInput]}
                        value={conversions}
                        onChangeText={setConversions}
                        keyboardType="numeric"
                        editable={!isLocked}
                        placeholder="0"
                      />
                    </View>
                  </View>
                </View>

                {/* Remarks & Notes */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={16} color="#174EA6" /> Notes & Remarks
                  </Text>
                  <Text style={styles.fieldLabel}>Summary of Today's Work & Client Discussions</Text>
                  <TextInput
                    style={[styles.textArea, isLocked && styles.disabledInput]}
                    value={remarks}
                    onChangeText={setRemarks}
                    editable={!isLocked}
                    multiline
                    numberOfLines={4}
                    placeholder="Enter tasks done, lead objections, and follow-up highlights..."
                    placeholderTextColor="#94A3B8"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Next Steps / Tomorrow's Agenda</Text>
                  <TextInput
                    style={[styles.textArea, isLocked && styles.disabledInput]}
                    value={nextSteps}
                    onChangeText={setNextSteps}
                    editable={!isLocked}
                    multiline
                    numberOfLines={3}
                    placeholder="Planned callbacks, demo meetings, targeted leads..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Action Buttons */}
                {!isLocked && (
                  <View style={styles.actionBtnRow}>
                    <TouchableOpacity
                      style={styles.saveDraftBtn}
                      onPress={handleSaveDraft}
                      disabled={saving || submitting}
                      activeOpacity={0.8}
                    >
                      {saving ? (
                        <ActivityIndicator color="#174EA6" size="small" />
                      ) : (
                        <>
                          <Ionicons name="bookmark-outline" size={18} color="#174EA6" />
                          <Text style={styles.saveDraftText}>Save Draft</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={handleSubmit}
                      disabled={saving || submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                          <Text style={styles.submitBtnText}>Submit Report</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        /* History Feed */
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#174EA6']} />}
        >
          {historyLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#174EA6" />
              <Text style={styles.loadingText}>Fetching activity history...</Text>
            </View>
          ) : historyList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Activity Records Found</Text>
              <Text style={styles.emptySubtitle}>Submit your daily activity reports to build your history log.</Text>
            </View>
          ) : (
            historyList.map((item, idx) => {
              const b = getStatusBadge(item.status);
              const m = item.metrics || {};
              return (
                <View key={item._id || idx} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyDateWrapper}>
                      <Ionicons name="calendar-outline" size={16} color="#174EA6" />
                      <Text style={styles.historyDateText}>{item.activityDate}</Text>
                    </View>
                    <View style={[styles.badgePill, { backgroundColor: b.bg }]}>
                      <Text style={[styles.badgeText, { color: b.text }]}>{b.label}</Text>
                    </View>
                  </View>

                  <View style={styles.historyMetricsRow}>
                    <View style={styles.historyMetricItem}>
                      <Text style={styles.historyMetricVal}>{m.callsAttempted || 0}</Text>
                      <Text style={styles.historyMetricLbl}>Calls</Text>
                    </View>
                    <View style={styles.historyMetricItem}>
                      <Text style={[styles.historyMetricVal, { color: '#059669' }]}>{m.connectedCalls || 0}</Text>
                      <Text style={styles.historyMetricLbl}>Connected</Text>
                    </View>
                    <View style={styles.historyMetricItem}>
                      <Text style={[styles.historyMetricVal, { color: '#F28C28' }]}>{m.interestedLeads || 0}</Text>
                      <Text style={styles.historyMetricLbl}>Interested</Text>
                    </View>
                    <View style={styles.historyMetricItem}>
                      <Text style={[styles.historyMetricVal, { color: '#7C3AED' }]}>{m.conversions || 0}</Text>
                      <Text style={styles.historyMetricLbl}>Won</Text>
                    </View>
                  </View>

                  {item.remarks ? (
                    <Text style={styles.historyRemarks} numberOfLines={2}>
                      <Text style={{ fontWeight: '600', color: '#1F2937' }}>Remarks: </Text>
                      {item.remarks}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F4F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#174EA6',
    borderColor: '#174EA6',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 95, // Space to scroll cleanly above the bottom navigation bar
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  statusDateLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statusDateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#12305A',
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  lockedNoticeText: {
    fontSize: 12,
    color: '#1E40AF',
    flex: 1,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#12305A',
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  saveDraftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#174EA6',
    borderRadius: 10,
    paddingVertical: 13,
    gap: 6,
  },
  saveDraftText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#174EA6',
  },
  submitBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F28C28',
    borderRadius: 10,
    paddingVertical: 13,
    gap: 6,
    elevation: 2,
    shadowColor: '#F28C28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#12305A',
  },
  historyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  historyMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  historyMetricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#174EA6',
  },
  historyMetricLbl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  historyRemarks: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#12305A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
});
