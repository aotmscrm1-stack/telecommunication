import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { metaLeadsApi } from '../api/metaLeadsApi';
import Header from '../components/Header';

export default function MetaCallsScreen({ onNavigate }) {
  const { user } = useAuth();

  // Leads & Pagination State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Role & Scope State
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestricted, setIsRestricted] = useState(true);
  const [allowedCampaigns, setAllowedCampaigns] = useState([]);

  // Department & Campaign Filters
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Live Calling Session Stats
  const [stats, setStats] = useState({
    total: 0,
    fresh: 0,
    contacted: 0,
    converted: 0,
  });

  // Call Outcome & Notes Modal State
  const [activeCallLead, setActiveCallLead] = useState(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callOutcomeStatus, setCallOutcomeStatus] = useState('Contacted');
  const [callNote, setCallNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Syncing State (n8n Webhook)
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-detect user's department on mount
  useEffect(() => {
    if (user?.department) {
      const uDept = String(user.department).trim();
      const uDesig = String(user.designation || '').trim();
      if (/telecall|counsellor/i.test(uDesig) || /telecall/i.test(uDept)) {
        setSelectedDept('Telecalling');
      } else if (uDept.toLowerCase() === 'hr') {
        setSelectedDept('HR');
      } else if (uDept.toLowerCase() === 'marketing') {
        setSelectedDept('Marketing');
      }
    }
  }, [user]);

  // Fetch Departments & Campaigns metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const [deptRes, campRes] = await Promise.allSettled([
        metaLeadsApi.getDepartments(),
        metaLeadsApi.getCampaigns(),
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value?.departments) {
        setDepartments(deptRes.value.departments);
      }

      if (campRes.status === 'fulfilled' && campRes.value) {
        const val = campRes.value;
        const restricted = val.isRestricted !== undefined ? !!val.isRestricted : !val.isAdmin;
        const admin = !!val.isAdmin;
        setIsRestricted(restricted);
        setIsAdmin(admin);
        setCampaigns(val.campaigns || []);
        setAllowedCampaigns(val.allowedCampaigns || []);
      }
    } catch (err) {
      console.warn('[MetaCalls] Metadata error:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Fetch Meta Leads
  const fetchLeads = useCallback(
    async (
      pageNum = 1,
      searchQuery = search,
      dept = selectedDept,
      camp = selectedCampaign,
      status = selectedStatus
    ) => {
      try {
        const params = {
          page: pageNum,
          limit: 25,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        // Only pass department if user is verified admin
        if (isAdmin && dept && dept !== 'All') params.department = dept;
        if (camp && camp !== 'All') params.campaign = camp;
        if (status && status !== 'All') params.status = status;

        const res = await metaLeadsApi.getLeads(params);
        if (res && res.success) {
          setLeads(res.leads || []);
          setTotalPages(res.pages || 1);
          setTotalCount(res.total || 0);
          setPage(pageNum);

          if (res.isAdmin !== undefined) setIsAdmin(!!res.isAdmin);
          if (res.isRestricted !== undefined) setIsRestricted(!!res.isRestricted);

          // Calculate calling session metrics
          const list = res.leads || [];
          const fresh = list.filter((l) => (l.status || 'New') === 'New').length;
          const contacted = list.filter((l) => l.status === 'Contacted').length;
          const converted = list.filter((l) => l.status === 'Converted').length;
          setStats({
            total: res.total || list.length,
            fresh,
            contacted,
            converted,
          });
        }
      } catch (err) {
        console.warn('[MetaCalls] Fetch error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, selectedDept, selectedCampaign, selectedStatus, isAdmin]
  );

  useEffect(() => {
    setLoading(true);
    fetchLeads(1, search, selectedDept, selectedCampaign, selectedStatus);
  }, [selectedDept, selectedCampaign, selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetadata();
    fetchLeads(1, search, selectedDept, selectedCampaign, selectedStatus);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchLeads(1, search, selectedDept, selectedCampaign, selectedStatus);
  };

  // Helper to extract clean phone number
  const extractPhone = (lead) => {
    if (!lead) return '';
    let raw = lead.phone || lead.normalizedPhone || lead.rawData?.phone || lead.rawData?.['Phone Number'] || lead.rawData?.['Phone'] || '';
    raw = String(raw).replace(/^p:/i, '').replace(/[^0-9+]/g, '');
    return raw;
  };

  // One-Touch Calling Action
  const handleInitiateCall = (lead) => {
    const rawPhone = extractPhone(lead);
    if (!rawPhone || rawPhone.length < 5) {
      Alert.alert('Invalid Number', 'This lead does not have a dialable phone number.');
      return;
    }

    const cleanDial = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone.replace(/\D/g, '')}`;
    Linking.openURL(`tel:${cleanDial}`).catch(() => {
      Alert.alert('Call Error', 'Could not open the native phone dialer.');
    });

    // Auto-open Call Outcome Logger so telecaller can log notes during or immediately after call
    setActiveCallLead(lead);
    setCallOutcomeStatus(lead.status === 'New' ? 'Contacted' : (lead.status || 'Contacted'));
    setCallNote('');
    setFollowUpDate('');
    setCallModalVisible(true);

    // Track call increment in background
    metaLeadsApi.updateLead(lead._id, { incrementCall: true }).catch((err) => {
      console.warn('[MetaCalls] Call count increment error:', err);
    });
  };

  // WhatsApp Action
  const handleWhatsApp = (lead) => {
    let p = extractPhone(lead).replace(/[^0-9]/g, '');
    if (!p) {
      Alert.alert('No Phone', 'This lead does not have a valid WhatsApp number.');
      return;
    }
    if (p.length === 10) p = '91' + p;

    const leadName = lead.fullName || lead.rawData?.full_name || lead.rawData?.Name || 'Candidate';
    const campaignName = (lead.campaign || 'our program').replace(/_/g, ' ');
    const msg = encodeURIComponent(
      `Hello ${leadName}, this is regarding your enquiry for ${campaignName} at AOTMS. Are you available for a quick discussion?`
    );
    const url = `https://wa.me/${p}?text=${msg}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
    });
  };

  // Save Call Outcome & Notes
  const handleSaveCallOutcome = async () => {
    if (!activeCallLead) return;
    try {
      setSavingOutcome(true);
      await metaLeadsApi.logCallOutcome(activeCallLead._id, {
        status: callOutcomeStatus,
        note: callNote.trim(),
        followUpDate: followUpDate.trim() || null,
      });

      // Update local state instantly
      setLeads((prev) =>
        prev.map((l) =>
          l._id === activeCallLead._id
            ? {
                ...l,
                status: callOutcomeStatus,
                callCount: (l.callCount || 0) + 1,
                lastCallAt: new Date().toISOString(),
                followUpDate: followUpDate.trim() || l.followUpDate,
              }
            : l
        )
      );

      setCallModalVisible(false);
      Alert.alert('Logged', 'Call outcome recorded successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save call outcome.');
    } finally {
      setSavingOutcome(false);
    }
  };

  // Convert Meta Lead to Standard CRM Lead
  const handleConvertLead = async (lead) => {
    Alert.alert(
      'Convert to CRM Lead',
      `Move "${lead.fullName || 'Lead'}" into the active CRM sales pipeline?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert Now',
          style: 'default',
          onPress: async () => {
            try {
              const res = await metaLeadsApi.convertLead(lead._id);
              if (res?.success) {
                setLeads((prev) =>
                  prev.map((l) => (l._id === lead._id ? { ...l, status: 'Converted' } : l))
                );
                Alert.alert('Success', 'Lead converted to active CRM pipeline!');
              }
            } catch (err) {
              Alert.alert('Conversion Failed', err.response?.data?.message || 'Could not convert lead.');
            }
          },
        },
      ]
    );
  };

  // Trigger n8n Meta Sync
  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await metaLeadsApi.syncNow();
      Alert.alert('Sync Dispatched', res?.message || 'Meta Leads sync triggered via n8n!');
      setTimeout(() => {
        onRefresh();
        setIsSyncing(false);
      }, 3000);
    } catch (err) {
      setIsSyncing(false);
      Alert.alert('Sync Notice', err.response?.data?.message || 'Sync workflow triggered.');
    }
  };

  // Department Badges List (Visible only to Admin)
  const departmentTabs = useMemo(() => {
    if (!isAdmin) return [];
    const list = ['All'];
    const known = ['Telecalling', 'HR', 'Marketing', 'Trainer', 'Developer'];
    known.forEach((k) => {
      if (!list.includes(k)) list.push(k);
    });
    departments.forEach((d) => {
      if (d.name && !list.includes(d.name)) list.push(d.name);
    });
    return list;
  }, [isAdmin, departments]);

  // Campaign Filter Options (Scoped to user's assigned campaigns)
  const campaignOptions = useMemo(() => {
    const opts = ['All'];
    campaigns.forEach((c) => {
      const name = c.campaign || c._id;
      if (name && !opts.includes(name)) {
        opts.push(name);
      }
    });
    allowedCampaigns.forEach((ac) => {
      if (ac && !opts.includes(ac)) opts.push(ac);
    });
    return opts;
  }, [campaigns, allowedCampaigns]);

  // Status Badge Colors
  const getStatusBadgeStyle = (status) => {
    switch (String(status || 'New').toLowerCase()) {
      case 'new':
      case 'fresh':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
      case 'contacted':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      case 'follow-up':
        return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' };
      case 'converted':
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      case 'discarded':
        return { bg: '#FFE4E6', text: '#E11D48', border: '#FECDD3' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  // Render Single Lead Card
  const renderLeadCard = ({ item }) => {
    const rawPhone = extractPhone(item);
    const badge = getStatusBadgeStyle(item.status);
    const campaignName = (item.campaign || 'General').replace(/_/g, ' ');
    const displayName =
      item.fullName ||
      item.rawData?.['Full Name'] ||
      item.rawData?.['full_name'] ||
      item.rawData?.['Name'] ||
      item.rawData?.name ||
      'Candidate';

    // Additional info fields
    const city = item.rawData?.['City'] || item.rawData?.['city'] || item.rawData?.['Location'] || '';
    const course = item.rawData?.['Course'] || item.rawData?.['Course Interest'] || '';

    return (
      <View style={styles.card}>
        {/* Top Card Info Row */}
        <View style={styles.cardHeader}>
          <View style={styles.leadAvatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.leadName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.leadPhone}>
              {rawPhone || 'No phone number'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>
              {item.status || 'New'}
            </Text>
          </View>
        </View>

        {/* Campaign & Department Tag Row */}
        <View style={styles.tagRow}>
          <View style={styles.campaignTag}>
            <Ionicons name="megaphone-outline" size={12} color="#0284C7" />
            <Text style={styles.campaignTagText} numberOfLines={1}>
              {campaignName}
            </Text>
          </View>

          {item.callCount > 0 ? (
            <View style={styles.callCountTag}>
              <Ionicons name="call" size={11} color="#059669" />
              <Text style={styles.callCountText}>{item.callCount} calls</Text>
            </View>
          ) : null}

          {city ? (
            <View style={styles.metaTag}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaTagText} numberOfLines={1}>{city}</Text>
            </View>
          ) : null}
        </View>

        {/* Dynamic Detail Info */}
        {course ? (
          <View style={styles.courseRow}>
            <Ionicons name="school-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.courseText} numberOfLines={1}>
              Interest: {course}
            </Text>
          </View>
        ) : null}

        {/* Follow-up / Last call alert */}
        {item.followUpDate ? (
          <View style={styles.followUpBanner}>
            <Ionicons name="calendar-outline" size={12} color="#7E22CE" />
            <Text style={styles.followUpText}>
              Follow-up: {new Date(item.followUpDate).toLocaleDateString()}
            </Text>
          </View>
        ) : null}

        {/* One-Touch Action Buttons Bar */}
        <View style={styles.actionRow}>
          {/* Primary Big Call Button */}
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleInitiateCall(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.callButtonText}>CALL NOW</Text>
          </TouchableOpacity>

          {/* WhatsApp Button */}
          <TouchableOpacity
            style={styles.waButton}
            onPress={() => handleWhatsApp(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Log / Notes Button */}
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => {
              setActiveCallLead(item);
              setCallOutcomeStatus(item.status || 'Contacted');
              setCallNote('');
              setFollowUpDate(item.followUpDate ? new Date(item.followUpDate).toISOString().slice(0, 10) : '');
              setCallModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Convert to CRM Lead Button */}
          {item.status !== 'Converted' ? (
            <TouchableOpacity
              style={styles.convertButton}
              onPress={() => handleConvertLead(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="git-merge-outline" size={16} color="#059669" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top App Header */}
      <Header
        title="Meta Calls Session"
        subtitle={!isAdmin ? `Assigned Leads • ${user?.displayName || user?.name || 'Agent'}` : `Admin Session • ${selectedDept} Pool`}
        rightAction={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={handleTriggerSync}
              disabled={isSyncing}
              activeOpacity={0.7}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconActionBtn}
              onPress={() => onNavigate && onNavigate('recordings')}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={20} color="#6366F1" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Realtime Calling Stats KPI Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>My Pool</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#0284C7' }]}>{stats.fresh}</Text>
          <Text style={styles.statLabel}>Fresh To Call</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats.contacted}</Text>
          <Text style={styles.statLabel}>Contacted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#059669' }]}>{stats.converted}</Text>
          <Text style={styles.statLabel}>Converted</Text>
        </View>
      </View>

      {/* SCOPE BANNER OR DEPARTMENT-WISE FILTER SELECTOR */}
      {!isAdmin ? (
        <View style={styles.assignedEmployeeBanner}>
          <View style={styles.assignedBadgeIcon}>
            <Ionicons name="shield-checkmark" size={18} color="#0284C7" />
          </View>
          <View style={styles.assignedBadgeInfo}>
            <Text style={styles.assignedBadgeTitle}>
              {user?.displayName || user?.name || 'Employee'}'s Calling Pool
            </Text>
            <Text style={styles.assignedBadgeSubtitle} numberOfLines={1}>
              {campaigns.length > 0
                ? `Assigned: ${campaigns.map((c) => (c.campaign || '').replace(/_/g, ' ')).join(', ')}`
                : 'Showing leads assigned to or added by your profile'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.deptSection}>
          <View style={styles.deptHeader}>
            <Ionicons name="business" size={14} color={colors.primary} />
            <Text style={styles.deptSectionTitle}>DEPARTMENT WISE CALLS (ADMIN VIEW)</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptScroll}
          >
            {departmentTabs.map((d) => {
              const isSelected = selectedDept === d;
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.deptPill, isSelected && styles.deptPillActive]}
                  onPress={() => setSelectedDept(d)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.deptPillText,
                      isSelected && styles.deptPillTextActive,
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search candidate, phone, city..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Campaign Filter Chips */}
      <View style={styles.filterChipSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
          {campaignOptions.map((c) => {
            const isSelected = selectedCampaign === c;
            const label = c === 'All' ? (!isAdmin ? 'All Assigned' : 'All Campaigns') : c.replace(/_/g, ' ');
            return (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedCampaign(c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter Tabs (New, Contacted, Converted, etc.) */}
      <View style={styles.statusTabsRow}>
        {['All', 'New', 'Contacted', 'Follow-up', 'Converted'].map((st) => {
          const isSelected = selectedStatus === st;
          return (
            <TouchableOpacity
              key={st}
              style={[styles.statusTabBtn, isSelected && styles.statusTabBtnActive]}
              onPress={() => setSelectedStatus(st)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusTabBtnText, isSelected && styles.statusTabBtnTextActive]}>
                {st}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Calling Leads List */}
      {loading ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading assigned meta leads...</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item._id}
          renderItem={renderLeadCard}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="call-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {!isAdmin ? 'No Leads In Your Calling Pool' : 'No Meta Calls Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {!isAdmin
                  ? 'Only leads assigned to or added by your profile are visible here. No active leads were found matching your current filter.'
                  : `No leads found for department "${selectedDept}" matching your active filters.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setSelectedCampaign('All');
                  setSelectedStatus('All');
                  setSearch('');
                  if (isAdmin) setSelectedDept('All');
                }}
              >
                <Text style={styles.emptyResetText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* CALL OUTCOME & NOTES MODAL */}
      <Modal
        visible={callModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Log Calling Outcome</Text>
                <Text style={styles.modalLeadName}>
                  {activeCallLead?.fullName || 'Selected Candidate'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCallModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Outcome Selection Buttons */}
            <Text style={styles.modalSectionLabel}>CALL DISPOSITION</Text>
            <View style={styles.outcomeGrid}>
              {['Contacted', 'Follow-up', 'Converted', 'Discarded'].map((opt) => {
                const isSel = callOutcomeStatus === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.outcomeOption, isSel && styles.outcomeOptionActive]}
                    onPress={() => setCallOutcomeStatus(opt)}
                  >
                    <Ionicons
                      name={
                        opt === 'Converted'
                          ? 'trophy'
                          : opt === 'Contacted'
                          ? 'checkmark-circle'
                          : opt === 'Follow-up'
                          ? 'alarm'
                          : 'close-circle'
                      }
                      size={16}
                      color={isSel ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text style={[styles.outcomeOptionText, isSel && styles.outcomeOptionTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Next Follow Up Date (if follow up) */}
            {callOutcomeStatus === 'Follow-up' ? (
              <View style={styles.followUpInputContainer}>
                <Text style={styles.modalSectionLabel}>FOLLOW-UP DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInputBox}
                  placeholder="e.g. 2026-10-25"
                  placeholderTextColor={colors.textMuted}
                  value={followUpDate}
                  onChangeText={setFollowUpDate}
                />
              </View>
            ) : null}

            {/* Call Notes Input */}
            <Text style={styles.modalSectionLabel}>CALL NOTES / CANDIDATE REMARKS</Text>
            <TextInput
              style={[styles.textInputBox, styles.notesArea]}
              placeholder="Enter discussion summary, questions asked, fee quotes, student expectations..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={callNote}
              onChangeText={setCallNote}
            />

            {/* Modal Action Buttons */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCallModalVisible(false)}
                disabled={savingOutcome}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveCallOutcome}
                disabled={savingOutcome}
              >
                {savingOutcome ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSaveText}>Save Outcome</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  assignedEmployeeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  assignedBadgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedBadgeInfo: {
    flex: 1,
  },
  assignedBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  assignedBadgeSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },
  deptSection: {
    backgroundColor: colors.card,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  deptSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  deptScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  deptPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deptPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deptPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deptPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  filterChipSection: {
    paddingVertical: 6,
  },
  filterChipsScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#0284C715',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  statusTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  statusTabBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusTabBtnActive: {
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  statusTabBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  statusTabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    paddingTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  leadAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  leadPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  campaignTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  campaignTagText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  callCountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  callCountText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaTagText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  courseText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  followUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  followUpText: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  waButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.whatsapp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.2)',
  },
  convertButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  emptyResetText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalLeadName: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  outcomeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  outcomeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outcomeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  outcomeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  outcomeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  followUpInputContainer: {
    marginBottom: 8,
  },
  textInputBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  notesArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    gap: 6,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
