import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { attendanceApi } from '../api/attendanceApi';
import Header from '../components/Header';

export default function AttendanceScreen({ onNavigate }) {
  const [currentStatus, setCurrentStatus] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchAttendance = useCallback(async () => {
    try {
      const [statusRes, recordsRes] = await Promise.allSettled([
        attendanceApi.getCurrentStatus(),
        attendanceApi.getRecords({ limit: 10 }),
      ]);

      if (statusRes.status === 'fulfilled') {
        setCurrentStatus(statusRes.value);
        if (statusRes.value?.checkInTime) {
          const start = new Date(statusRes.value.checkInTime).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
        }
      }

      if (recordsRes.status === 'fulfilled') {
        const data = recordsRes.value;
        setRecords(Array.isArray(data) ? data : data?.records || []);
      }
    } catch (err) {
      console.warn('[Attendance] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Live Timer Counter
  useEffect(() => {
    let timer;
    if (currentStatus?.active && !currentStatus?.isOnBreak) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [currentStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePunchToggle = async () => {
    try {
      setProcessing(true);
      if (currentStatus?.active) {
        // Punch Out
        await attendanceApi.stopAttendance({ notes: 'Mobile App Punch Out' });
        Alert.alert('Punched Out', 'Your attendance shift has been concluded.');
      } else {
        // Punch In
        await attendanceApi.startAttendance({ notes: 'Mobile App Punch In' });
        Alert.alert('Punched In', 'Your attendance shift is now active!');
      }
      fetchAttendance();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update attendance');
    } finally {
      setProcessing(false);
    }
  };

  const handleBreakToggle = async () => {
    try {
      setProcessing(true);
      if (currentStatus?.isOnBreak) {
        await attendanceApi.resumeBreak();
        Alert.alert('Resumed', 'Welcome back from break!');
      } else {
        await attendanceApi.startBreak({ reason: 'Regular Break' });
        Alert.alert('On Break', 'Break started.');
      }
      fetchAttendance();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to toggle break');
    } finally {
      setProcessing(false);
    }
  };

  const isCheckedIn = !!currentStatus?.active;
  const isOnBreak = !!currentStatus?.isOnBreak;

  return (
    <View style={styles.container}>
      <Header
        title="Attendance & Time"
        subtitle="Live shift punch clock"
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Punch Clock Card */}
        <View style={styles.clockCard}>
          <View style={styles.statusBadgeRow}>
            <View
              style={[
                styles.badge,
                isCheckedIn
                  ? isOnBreak
                    ? styles.badgeAmber
                    : styles.badgeGreen
                  : styles.badgeGray,
              ]}
            >
              <View
                style={[
                  styles.dot,
                  isCheckedIn
                    ? isOnBreak
                      ? styles.dotAmber
                      : styles.dotGreen
                    : styles.dotGray,
                ]}
              />
              <Text style={styles.badgeText}>
                {isCheckedIn
                  ? isOnBreak
                    ? 'CURRENTLY ON BREAK'
                    : 'ACTIVE SHIFT'
                  : 'SHIFT NOT STARTED'}
              </Text>
            </View>
          </View>

          {/* Digital Timer */}
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>WORKING DURATION</Text>
            <Text style={styles.timerDisplay}>
              {isCheckedIn ? formatTimer(elapsedSeconds) : '00:00:00'}
            </Text>
            <Text style={styles.timerSub}>
              {isCheckedIn && currentStatus?.checkInTime
                ? `Clocked In at ${new Date(currentStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Ready for today’s shift'}
            </Text>
          </View>

          {/* Punch Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.punchBtn,
                isCheckedIn ? styles.punchOutBtn : styles.punchInBtn,
                processing && styles.disabledBtn,
              ]}
              onPress={handlePunchToggle}
              disabled={processing}
              activeOpacity={0.8}
            >
              {processing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isCheckedIn ? 'log-out-outline' : 'log-in-outline'}
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={styles.punchBtnText}>
                    {isCheckedIn ? 'Clock Out' : 'Clock In Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isCheckedIn ? (
              <TouchableOpacity
                style={[styles.breakBtn, isOnBreak && styles.resumeBtn]}
                onPress={handleBreakToggle}
                disabled={processing}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isOnBreak ? 'play' : 'cafe'}
                  size={18}
                  color={isOnBreak ? '#FFFFFF' : colors.warning}
                />
                <Text
                  style={[styles.breakBtnText, isOnBreak && { color: '#FFFFFF' }]}
                >
                  {isOnBreak ? 'Resume' : 'Take Break'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Recent Attendance Logs */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>RECENT ATTENDANCE LOGS</Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : records.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No previous attendance records found</Text>
            </View>
          ) : (
            records.map((rec, idx) => (
              <View key={rec._id || idx} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <Text style={styles.recordDate}>
                    {rec.date || (rec.checkInTime ? new Date(rec.checkInTime).toLocaleDateString() : 'Date')}
                  </Text>
                  <View style={styles.recordStatusBadge}>
                    <Text style={styles.recordStatusText}>{rec.status || 'Present'}</Text>
                  </View>
                </View>

                <View style={styles.recordTimes}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>In Time</Text>
                    <Text style={styles.timeValue}>
                      {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                  </View>

                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>Out Time</Text>
                    <Text style={styles.timeValue}>
                      {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                  </View>

                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>Total Hours</Text>
                    <Text style={styles.timeValue}>
                      {rec.totalHours ? `${rec.totalHours} hrs` : '--'}
                    </Text>
                  </View>
                </View>
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
  clockCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadgeRow: {
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  badgeGray: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: colors.accent,
  },
  dotAmber: {
    backgroundColor: colors.warning,
  },
  dotGray: {
    backgroundColor: colors.textMuted,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  timerDisplay: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
    marginVertical: 6,
  },
  timerSub: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  punchInBtn: {
    backgroundColor: colors.accent,
  },
  punchOutBtn: {
    backgroundColor: colors.danger,
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  breakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    gap: 6,
  },
  resumeBtn: {
    backgroundColor: colors.warning,
  },
  breakBtnText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  historySection: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  recordCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordDate: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  recordStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordStatusText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  recordTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingTop: 10,
  },
  timeCol: {
    gap: 2,
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  timeValue: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
