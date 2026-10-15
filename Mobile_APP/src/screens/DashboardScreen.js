import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { leadsApi } from '../api/leadsApi';
import { attendanceApi } from '../api/attendanceApi';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import LeadCard from '../components/LeadCard';

export default function DashboardScreen({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    freshLeads: 0,
    wonLeads: 0,
    todayCalls: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch Realtime KPIs & Stats
      const [kpiRes, leadsRes, attRes] = await Promise.allSettled([
        leadsApi.getRealtimeKpis(),
        leadsApi.getLeads({ limit: 5 }),
        attendanceApi.getCurrentStatus(),
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value) {
        const k = kpiRes.value;
        setStats({
          totalLeads: k.leads?.total || 0,
          freshLeads: k.leads?.fresh || 0,
          wonLeads: k.leads?.won || 0,
          todayCalls: k.voice?.todayCalls || 0,
        });
      }

      if (leadsRes.status === 'fulfilled' && leadsRes.value) {
        setRecentLeads(leadsRes.value.leads || []);
      }

      if (attRes.status === 'fulfilled' && attRes.value) {
        setAttendanceStatus(attRes.value);
      }
    } catch (err) {
      console.warn('[Dashboard] Data fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const quickActions = [
    {
      id: 'add_lead',
      title: 'Add Lead',
      subtitle: 'New prospect',
      icon: 'person-add',
      color: colors.primary,
    },
    {
      id: 'all_leads',
      title: 'All Leads',
      subtitle: 'Directory & status',
      icon: 'people',
      color: '#3B82F6',
    },
    {
      id: 'campaigns',
      title: 'Campaigns',
      subtitle: 'Marketing pools',
      icon: 'megaphone',
      color: colors.secondary,
    },
    {
      id: 'contacts',
      title: 'Contacts',
      subtitle: 'Phonebook',
      icon: 'book',
      color: '#8B5CF6',
    },
    {
      id: 'attendance',
      title: 'Attendance',
      subtitle: 'Punch In / Out',
      icon: 'time',
      color: colors.accent,
    },
    {
      id: 'recordings',
      title: 'Call Recordings',
      subtitle: 'Voice logs & audio',
      icon: 'mic',
      color: '#EC4899',
    },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="AOTMS CRM"
        subtitle={`Welcome, ${user?.name || 'Agent'}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* User Role Card */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeTextGroup}>
            <Text style={styles.welcomeGreeting}>Overview & Realtime KPIs</Text>
            <Text style={styles.welcomeRole}>
              Role: <Text style={{ color: colors.primary, fontWeight: '700' }}>{user?.role?.toUpperCase() || 'AGENT'}</Text>
              {user?.department ? ` • ${user.department}` : ''}
            </Text>
          </View>

          {/* Punch Status Badge */}
          <TouchableOpacity
            style={[
              styles.punchStatusChip,
              attendanceStatus?.active ? styles.punchedIn : styles.punchedOut,
            ]}
            onPress={() => onNavigate('attendance')}
            activeOpacity={0.8}
          >
            <View style={[styles.dot, attendanceStatus?.active ? styles.dotGreen : styles.dotGray]} />
            <Text style={styles.punchText}>
              {attendanceStatus?.active ? 'Punched In' : 'Punched Out'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                title="Total Leads"
                value={stats.totalLeads}
                icon="people"
                iconColor={colors.primary}
                subtitle="In database"
                onPress={() => onNavigate('all_leads')}
              />
              <StatCard
                title="Fresh Leads"
                value={stats.freshLeads}
                icon="sparkles"
                iconColor={colors.fresh}
                subtitle="Awaiting action"
                onPress={() => onNavigate('all_leads')}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="Won Deals"
                value={stats.wonLeads}
                icon="trophy"
                iconColor={colors.won}
                subtitle="Conversions"
                onPress={() => onNavigate('all_leads')}
              />
              <StatCard
                title="Today Calls"
                value={stats.todayCalls}
                icon="call"
                iconColor={colors.accent}
                subtitle="Connected"
                onPress={() => onNavigate('recordings')}
              />
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CRM WORKSPACE MODULES</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionTile}
                onPress={() => onNavigate(action.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconContainer,
                    { backgroundColor: `${action.color}15`, borderColor: `${action.color}35` },
                  ]}
                >
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.actionTileTitle} numberOfLines={1}>{action.title}</Text>
                <Text style={styles.actionTileSub} numberOfLines={1}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Leads Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>RECENT LEADS</Text>
            <TouchableOpacity onPress={() => onNavigate('all_leads')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All ({stats.totalLeads})</Text>
            </TouchableOpacity>
          </View>

          {recentLeads.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyText}>No recent leads found</Text>
            </View>
          ) : (
            recentLeads.map((lead) => (
              <LeadCard
                key={lead._id || lead.id}
                lead={lead}
                onPress={() => onNavigate('all_leads')}
              />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  welcomeTextGroup: {
    flex: 1,
  },
  welcomeGreeting: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  welcomeRole: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  punchStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  punchedIn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  punchedOut: {
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
  dotGray: {
    backgroundColor: colors.textMuted,
  },
  punchText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  loaderContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  actionTileTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actionTileSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
