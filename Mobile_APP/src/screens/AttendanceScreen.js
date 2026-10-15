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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
        attendanceApi.getRecords({ limit: 15 }),
      ]);

      if (statusRes.status === 'fulfilled') {
        const val = statusRes.value;
        setCurrentStatus(val);

        // Derive active session start time
        const session = val?.attendance;
        const startTime = session?.startTime || session?.checkInTime;

        if (val?.active && startTime) {
          const start = new Date(startTime).getTime();
          const now = Date.now();
          setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
        } else if (!val?.active) {
          setElapsedSeconds(0);
        }
      }

      if (recordsRes.status === 'fulfilled') {
        const data = recordsRes.value;
        const list = Array.isArray(data)
          ? data
          : data?.records || data?.attendance || [];
        setRecords(list);
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

  // Live Timer Counter for active shift
  useEffect(() => {
    let timer;
    const isWorking = currentStatus?.active && currentStatus?.status === 'ON_DUTY';
    if (isWorking) {
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

  /**
   * Acquire high-accuracy GPS coordinates for attendance
   */
  const acquireLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null; // Gracefully continue if permission denied
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy || 0,
        speed: loc.coords.speed || 0,
        heading: loc.coords.heading || 0,
      };
    } catch (locErr) {
      console.warn('[Location Error]:', locErr.message);
      return null;
    }
  };

  const handlePunchToggle = async () => {
    if (processing) return;

    try {
      setProcessing(true);
      const locData = await acquireLocation();

      if (currentStatus?.active) {
        // Punch Out
        const payload = {
          notes: 'Mobile App Clock Out',
          ...(locData || {}),
        };
        const res = await attendanceApi.stopAttendance(payload);
        Alert.alert(
          'Clocked Out',
          res.message || 'Your attendance shift has been concluded.'
        );
      } else {
        // Punch In
        const payload = {
          notes: 'Mobile App Clock In',
          ...(locData || {}),
        };
        const res = await attendanceApi.startAttendance(payload);
        Alert.alert(
          'Clocked In',
          res.message || 'Your attendance shift is now active!'
        );
      }
      fetchAttendance();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'NINE_HOURS_INCOMPLETE') {
        Alert.alert(
          'Shift Incomplete',
          `${data.message}\nRemaining: ${data.remainingHms || 'several hours'}.\n\nDo you want to force end attendance?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Force Clock Out',
              style: 'destructive',
              onPress: async () => {
                try {
                  setProcessing(true);
                  const locData = await acquireLocation();
                  await attendanceApi.stopAttendance({
                    force: true,
                    notes: 'Mobile App Force Clock Out',
                    ...(locData || {}),
                  });
                  Alert.alert('Clocked Out', 'Shift ended.');
                  fetchAttendance();
                } catch (forceErr) {
                  Alert.alert('Error', forceErr.response?.data?.message || 'Failed to stop attendance');
                } finally {
                  setProcessing(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data?.message || err.message || 'Failed to update attendance');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleBreakToggle = async () => {
    if (processing) return;

    try {
      setProcessing(true);
      if (currentStatus?.status === 'ON_BREAK') {
        const res = await attendanceApi.resumeBreak();
        Alert.alert('Resumed', res.message || 'Welcome back from break!');
      } else {
        const res = await attendanceApi.startBreak({ reason: 'Regular Break' });
        Alert.alert('On Break', res.message || 'Break started.');
      }
      fetchAttendance();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to toggle break');
    } finally {
      setProcessing(false);
    }
  };

  const isCheckedIn = !!currentStatus?.active;
  const isOnBreak = currentStatus?.status === 'ON_BREAK';
  const session = currentStatus?.attendance;
  const inTimeDisplay = session?.startTime || session?.checkInTime;

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
              {isCheckedIn && inTimeDisplay
                ? `Clocked In at ${new Date(inTimeDisplay).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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
            records.map((rec, idx) => {
              const inTime = rec.startTime || rec.checkInTime || rec.checkIn?.time;
              const outTime = rec.endTime || rec.checkOutTime || rec.checkOut?.time;
              const totalDuration = rec.formattedWorkDuration || rec.totalHours || (rec.totalWorkSeconds ? `${Math.floor(rec.totalWorkSeconds / 3600)}h ${Math.floor((rec.totalWorkSeconds % 3600) / 60)}m` : '--');

              return (
                <View key={rec._id || idx} style={styles.recordCard}>
                  <View style={styles.recordTop}>
                    <Text style={styles.recordDate}>
                      {rec.date || (inTime ? new Date(inTime).toLocaleDateString() : 'Today')}
                    </Text>
                    <View style={styles.recordStatusBadge}>
                      <Text style={styles.recordStatusText}>{rec.status || 'PRESENT'}</Text>
                    </View>
                  </View>

                  <View style={styles.recordTimes}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeLabel}>In Time</Text>
                      <Text style={styles.timeValue}>
                        {inTime ? new Date(inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                    </View>

                    <View style={styles.timeCol}>
                      <Text style={styles.timeLabel}>Out Time</Text>
                      <Text style={styles.timeValue}>
                        {outTime ? new Date(outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </Text>
                    </View>

                    <View style={styles.timeCol}>
                      <Text style={styles.timeLabel}>Total Hours</Text>
                      <Text style={styles.timeValue}>
                        {totalDuration}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
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
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
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
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderColor: 'rgba(100, 116, 139, 0.25)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.text,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timerLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  timerDisplay: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  punchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  punchInBtn: {
    backgroundColor: colors.primary,
  },
  punchOutBtn: {
    backgroundColor: colors.danger,
  },
  disabledBtn: {
    opacity: 0.6,
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
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  resumeBtn: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  breakBtnText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordDate: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  recordStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  timeCol: {
    alignItems: 'flex-start',
  },
  timeLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
