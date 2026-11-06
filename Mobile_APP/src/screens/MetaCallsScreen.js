import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { metaLeadsApi } from '../api/metaLeadsApi';
import Header from '../components/Header';
import AutoScrollText from '../components/AutoScrollText';

// ── Meta Leads Standard Status Classifications (Matching Web CRM) ───────────
export const POSITIVE_STATUSES = [
  "Agreed to Office visit's but no luck",
  "Interested/Need time(After few months) waiting for parents approval",
  "office visit's",
  "Demo attended",
  "Demo not attended-Call Back",
  "time issues/Fee issues",
  "Call back/We will Call",
  "Not answering-call back/whats app text"
];

export const NEGATIVE_STATUSES = [
  "Not interested/Time pass",
  "WN-SO-ON",
  "joined another institute/jobs"
];

export function isLeadPositive(lead) {
  const st = String(lead?.status || '').toLowerCase().trim();
  if (st === 'positive' || st === 'converted' || st === 'won' || st === 'interested' || st === 'enrolled' || st === 'demo scheduled' || st === 'demo done' || st === 'connected') {
    return true;
  }
  return POSITIVE_STATUSES.some(p => p.toLowerCase().trim() === st);
}

export function isLeadNegative(lead) {
  const st = String(lead?.status || '').toLowerCase().trim();
  if (st === 'negative' || st === 'discarded' || st === 'lost' || st === 'blocked' || st === 'not interested' || st === 'not answered' || st === 'call not responding') {
    return true;
  }
  return NEGATIVE_STATUSES.some(n => n.toLowerCase().trim() === st);
}

export default function MetaCallsScreen({ onNavigate }) {
  const { user } = useAuth();

  // Robust check: determine if user is truly an executive/system admin
  const isTrueAdmin = useMemo(() => {
    if (!user) return false;
    const role = String(user.role || '').toLowerCase().trim();
    const desig = String(user.designation || '').toUpperCase().trim();
    const dName = String(user.displayName || user.name || '').toUpperCase().trim();
    const dept = String(user.department || '').toUpperCase().trim();

    // Explicit non-admin roles / designations: employee, caller, telecaller, counsellor
    const isRestrictedStaff =
      role === 'employee' ||
      role === 'caller' ||
      role === 'telecaller' ||
      role === 'councellor' ||
      role === 'counselor' ||
      desig.includes('COUNSELLOR') ||
      desig.includes('COUNSELOR') ||
      desig.includes('CALLER') ||
      desig.includes('TELE') ||
      dName.includes('COUNSELLOR') ||
      dName.includes('COUNSELOR') ||
      dName.includes('CALLER') ||
      dName.includes('TELE') ||
      dept.includes('TELE');

    if (isRestrictedStaff) {
      return false;
    }

    if (role === 'admin' || role === 'superadmin') return true;

    if (
      desig === 'MD' ||
      desig === 'CEO' ||
      desig === 'CTO' ||
      desig.includes('MANAGING DIRECTOR') ||
      desig.includes('CHIEF EXECUTIVE') ||
      dName.includes('MANAGING DIRECTOR') ||
      dName.includes('CHIEF EXECUTIVE')
    ) {
      return true;
    }

    return false;
  }, [user]);

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
    positive: 0,
    negative: 0,
    fresh: 0,
  });

  // Call Outcome & Notes Modal State (Positive Priority #1 First!)
  const [activeCallLead, setActiveCallLead] = useState(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [outcomeCategory, setOutcomeCategory] = useState('Positive'); // 'Positive' (Priority #1) | 'Negative'
  const [callOutcomeStatus, setCallOutcomeStatus] = useState(POSITIVE_STATUSES[0]);
  const [callNote, setCallNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [savingOutcome, setSavingOutcome] = useState(false);
  const subStatusScrollRef = useRef(null);

  // Lead Details Modal State
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [detailsLead, setDetailsLead] = useState(null);

  // Syncing State (n8n Webhook)
  const [isSyncing, setIsSyncing] = useState(false);


  // Sync admin state with profile
  useEffect(() => {
    setIsAdmin(isTrueAdmin);
    setIsRestricted(!isTrueAdmin);
  }, [isTrueAdmin]);

  // Fetch Departments & Campaigns metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const [deptRes, campRes, assignRes] = await Promise.allSettled([
        metaLeadsApi.getDepartments(),
        metaLeadsApi.getCampaigns(),
        metaLeadsApi.getMyAssignmentStatus(),
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value?.departments) {
        setDepartments(deptRes.value.departments);
      }

      let assignedFromEndpoint = [];
      if (assignRes.status === 'fulfilled' && assignRes.value?.assignedCampaigns) {
        assignedFromEndpoint = assignRes.value.assignedCampaigns;
      }

      if (campRes.status === 'fulfilled' && campRes.value) {
        const val = campRes.value;
        const allCampList = val.campaigns || [];
        const returnedAllowed = val.allowedCampaigns || [];

        if (isTrueAdmin) {
          setIsAdmin(true);
          setIsRestricted(false);
          setCampaigns(allCampList);
          setAllowedCampaigns([]);
        } else {
          setIsAdmin(false);
          setIsRestricted(true);

          const currentUserId = String(user?._id || user?.id || '');
          const currentUserEmail = String(user?.email || '').toLowerCase().trim();

          const myAssignedNamesSet = new Set([
            ...assignedFromEndpoint,
            ...returnedAllowed,
          ]);

          allCampList.forEach((c) => {
            if (Array.isArray(c.assignedUsers)) {
              const isAssigned = c.assignedUsers.some((u) => {
                const uId = typeof u === 'object' && u !== null ? String(u._id || u.id || '') : String(u || '');
                const uEmail = typeof u === 'object' && u !== null ? String(u.email || '').toLowerCase().trim() : '';
                return (currentUserId && uId === currentUserId) || (currentUserEmail && uEmail === currentUserEmail);
              });
              if (isAssigned && c.campaign) {
                myAssignedNamesSet.add(c.campaign);
              }
            }
          });

          const assignedList = Array.from(myAssignedNamesSet);
          // Strictly restrict campaigns list to those assigned to this user (never fall back to allCampList for staff)
          const filteredCamps = assignedList.length > 0
            ? allCampList.filter((c) => assignedList.includes(c.campaign))
            : [];

          setAllowedCampaigns(assignedList);
          setCampaigns(filteredCamps);

          // If current selectedCampaign is not in assignedList and not 'All', reset to first assigned or 'All'
          if (selectedCampaign !== 'All' && assignedList.length > 0 && !assignedList.includes(selectedCampaign)) {
            setSelectedCampaign(assignedList[0] || 'All');
          } else if (assignedList.length === 0) {
            setSelectedCampaign('All');
          }
        }
      }
    } catch (err) {
      console.warn('[MetaCalls] Metadata error:', err);
    }
  }, [isTrueAdmin, user, selectedCampaign]);


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
          limit: 50,
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        // Only pass department if verified admin chose a specific department
        if (isTrueAdmin && dept && dept !== 'All') params.department = dept;
        if (camp && camp !== 'All') params.campaign = camp;
        if (status && status !== 'All' && status !== 'Positive' && status !== 'Negative') {
          params.status = status;
        }

        const res = await metaLeadsApi.getLeads(params);
        if (res && res.success) {
          let allVisibleList = res.leads || [];
          if (camp && camp !== 'All') {
            allVisibleList = allVisibleList.filter((item) => item.campaign === camp);
          }

          // Calculate metrics strictly on visible scoped leads before status chip filtering
          const positive = allVisibleList.filter((l) => isLeadPositive(l)).length;
          const negative = allVisibleList.filter((l) => isLeadNegative(l)).length;
          const fresh = allVisibleList.filter((l) => (l.status || 'New').toLowerCase() === 'new' || l.status === 'Fresh').length;
          setStats({
            total: !isTrueAdmin ? allVisibleList.length : (res.total || allVisibleList.length),
            positive,
            negative,
            fresh,
          });

          // Apply client-side chip filters for Positive, Negative, New, or specific status
          let filteredList = allVisibleList;
          if (status && status !== 'All') {
            if (status === 'Positive') {
              filteredList = allVisibleList.filter((item) => isLeadPositive(item));
            } else if (status === 'Negative') {
              filteredList = allVisibleList.filter((item) => isLeadNegative(item));
            } else if (status === 'New' || status === 'Fresh') {
              filteredList = allVisibleList.filter((item) => (item.status || 'New').toLowerCase() === 'new' || item.status === 'Fresh');
            } else {
              filteredList = allVisibleList.filter((item) => item.status === status);
            }
          }

          setLeads(filteredList);
          setTotalPages(res.pages || 1);
          setTotalCount(!isTrueAdmin ? filteredList.length : (res.total || filteredList.length));
          setPage(pageNum);

          if (isTrueAdmin && res.isAdmin !== undefined) setIsAdmin(!!res.isAdmin);
          if (!isTrueAdmin) setIsAdmin(false);
        }
      } catch (err) {
        console.warn('[MetaCalls] Fetch error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, selectedDept, selectedCampaign, selectedStatus, isTrueAdmin]
  );

  useEffect(() => {
    setLoading(true);
    fetchLeads(1, search, selectedDept, selectedCampaign, selectedStatus);
  }, [selectedDept, selectedCampaign, selectedStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMetadata();
    await fetchLeads(1, search, selectedDept, selectedCampaign, selectedStatus);
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

    // Auto-open Call Outcome Logger (Positive Priority #1 First!)
    setActiveCallLead(lead);
    const isExistingNeg = isLeadNegative(lead);
    const initialCategory = isExistingNeg ? 'Negative' : 'Positive'; // Priority #1 is Positive
    setOutcomeCategory(initialCategory);
    setCallOutcomeStatus(
      lead.status && (initialCategory === 'Positive' ? POSITIVE_STATUSES.includes(lead.status) : NEGATIVE_STATUSES.includes(lead.status))
        ? lead.status
        : (initialCategory === 'Positive' ? POSITIVE_STATUSES[0] : NEGATIVE_STATUSES[0])
    );
    setCallNote('');
    setFollowUpDate(lead.followUpDate ? new Date(lead.followUpDate).toISOString().slice(0, 10) : '');
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

  // Trigger n8n Meta Sync and immediately reload leads
  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      setLoading(true);
      const res = await metaLeadsApi.syncNow().catch((e) => ({ message: e.response?.data?.message || e.message }));
      await fetchMetadata();
      const freshData = await metaLeadsApi.getLeads({
        page: 1,
        limit: 50,
        ...(selectedCampaign !== 'All' ? { campaign: selectedCampaign } : {}),
      });
      if (freshData?.leads) {
        let list = freshData.leads;
        if (selectedStatus !== 'All') {
          list = list.filter((item) => item.status === selectedStatus);
        }
        setLeads(list);
        setTotalCount(freshData.total || list.length);
        const fresh = list.filter((l) => (l.status || 'New') === 'New').length;
        const contacted = list.filter((l) => l.status === 'Contacted').length;
        const converted = list.filter((l) => l.status === 'Converted').length;
        setStats({
          total: freshData.total || list.length,
          fresh,
          contacted,
          converted,
        });
      }
      setIsSyncing(false);
      setLoading(false);
      Alert.alert(
        'Meta Leads Updated',
        `Successfully synced! Loaded ${freshData?.total || freshData?.leads?.length || 0} leads.`
      );
    } catch (err) {
      setIsSyncing(false);
      setLoading(false);
      Alert.alert('Notice', 'Refreshed leads data.');
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

  // Campaign Filter Options (Strictly scoped to user's assigned campaigns)
  const campaignOptions = useMemo(() => {
    if (isTrueAdmin) {
      const opts = ['All'];
      campaigns.forEach((c) => {
        const name = c.campaign || c._id;
        if (name && !opts.includes(name)) {
          opts.push(name);
        }
      });
      return opts;
    }

    // For non-admin employee / telecaller / counsellor: ONLY assigned campaigns
    const myCamps = allowedCampaigns.length > 0
      ? allowedCampaigns
      : campaigns.map((c) => c.campaign).filter(Boolean);

    if (myCamps.length === 0) {
      return [];
    }

    if (myCamps.length > 1) {
      return ['All', ...myCamps];
    }

    return myCamps;
  }, [isTrueAdmin, campaigns, allowedCampaigns]);

  // Status Badge Colors (Aligned with Web CRM Positive vs Negative)
  const getStatusBadgeStyle = (status) => {
    if (isLeadPositive({ status })) {
      return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
    }
    if (isLeadNegative({ status })) {
      return { bg: '#FFE4E6', text: '#E11D48', border: '#FECDD3' };
    }
    const s = String(status || 'New').toLowerCase();
    if (s === 'new' || s === 'fresh') {
      return { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' };
    }
    return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
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
          {/* Top-Right Corner Status Badge with AutoScroll for Long Positive/Negative Statuses */}
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <View style={[styles.statusDot, { backgroundColor: badge.text }]} />
            <AutoScrollText
              text={item.status || 'New'}
              maxWidth={140}
              style={[styles.statusText, { color: badge.text }]}
            />
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

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          {/* Primary Call Button */}
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleInitiateCall(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={14} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>

          {/* WhatsApp Button */}
          <TouchableOpacity
            style={styles.waButton}
            onPress={() => handleWhatsApp(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Log Outcome Button */}
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => {
              setActiveCallLead(item);
              const isExistingNeg = isLeadNegative(item);
              const initialCategory = isExistingNeg ? 'Negative' : 'Positive'; // Priority #1 is Positive
              setOutcomeCategory(initialCategory);
              setCallOutcomeStatus(
                item.status && (initialCategory === 'Positive' ? POSITIVE_STATUSES.includes(item.status) : NEGATIVE_STATUSES.includes(item.status))
                  ? item.status
                  : (initialCategory === 'Positive' ? POSITIVE_STATUSES[0] : NEGATIVE_STATUSES[0])
              );
              setCallNote('');
              setFollowUpDate(item.followUpDate ? new Date(item.followUpDate).toISOString().slice(0, 10) : '');
              setCallModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={15} color="#FFFFFF" />
            <Text style={styles.logButtonText}>Log</Text>
          </TouchableOpacity>

          {/* View Details Button */}
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => {
              setDetailsLead(item);
              setDetailsModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle-outline" size={15} color="#12305A" />
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top App Header (Cloud & Refresh symbols removed as requested) */}
      <Header
        title="Meta Leads"
        subtitle={`${stats.total || totalCount} Assigned Leads`}
      />

      {/* Realtime Calling Stats KPI Strip (Positive & Negative Aligned with Web CRM) */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => setSelectedStatus('Positive')} activeOpacity={0.7}>
          <Text style={[styles.statNumber, { color: '#059669' }]}>{stats.positive}</Text>
          <Text style={[styles.statLabel, { color: '#059669', fontWeight: '700' }]}>Positive</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => setSelectedStatus('Negative')} activeOpacity={0.7}>
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.negative}</Text>
          <Text style={[styles.statLabel, { color: '#DC2626', fontWeight: '700' }]}>Negative</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => setSelectedStatus('New')} activeOpacity={0.7}>
          <Text style={[styles.statNumber, { color: '#0284C7' }]}>{stats.fresh}</Text>
          <Text style={styles.statLabel}>Pending/New</Text>
        </TouchableOpacity>
      </View>

      {/* SCOPE BANNER OR DEPARTMENT-WISE FILTER SELECTOR */}
      {!isTrueAdmin ? (
        <View style={styles.assignedEmployeeBanner}>
          <View style={styles.assignedBadgeIcon}>
            <Ionicons name="shield-checkmark" size={18} color="#0284C7" />
          </View>
          <View style={styles.assignedBadgeInfo}>
            <Text style={styles.assignedBadgeTitle}>
              {user?.displayName || user?.name || 'Employee'}'s Calling Pool
            </Text>
            <Text style={styles.assignedBadgeSubtitle} numberOfLines={1}>
              {allowedCampaigns.length > 0 || campaigns.length > 0
                ? `Assigned: ${(allowedCampaigns.length > 0 ? allowedCampaigns : campaigns.map((c) => c.campaign))
                    .filter(Boolean)
                    .map((c) => c.replace(/_/g, ' '))
                    .join(', ')}`
                : 'No campaigns assigned to your profile yet'}
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
      {campaignOptions.length > 0 ? (
        <View style={styles.filterChipSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
            {campaignOptions.map((c) => {
              const isSelected = selectedCampaign === c;
              const label = c === 'All' ? (!isTrueAdmin ? 'All Assigned' : 'All Campaigns') : c.replace(/_/g, ' ');
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
      ) : null}

      {/* Status Filter Tabs (All, Positive, Negative, New) */}
      <View style={styles.statusTabsRow}>
        {[
          { id: 'All', label: 'All' },
          { id: 'Positive', label: 'Positive', color: '#059669' },
          { id: 'Negative', label: 'Negative', color: '#DC2626' },
          { id: 'New', label: 'New / Fresh', color: '#0284C7' },
        ].map((st) => {
          const isSelected = selectedStatus === st.id;
          return (
            <TouchableOpacity
              key={st.id}
              style={[
                styles.statusTabBtn,
                isSelected && styles.statusTabBtnActive,
                isSelected && st.id === 'Positive' && { backgroundColor: '#059669', borderColor: '#059669' },
                isSelected && st.id === 'Negative' && { backgroundColor: '#DC2626', borderColor: '#DC2626' },
                isSelected && st.id === 'New' && { backgroundColor: '#0284C7', borderColor: '#0284C7' },
              ]}
              onPress={() => setSelectedStatus(st.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusTabBtnText, isSelected && styles.statusTabBtnTextActive]}>
                {st.label}
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
                {!isTrueAdmin ? 'No Leads In Your Calling Pool' : 'No Meta Calls Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {!isTrueAdmin
                  ? 'Only leads assigned to or added by your profile are visible here. No active leads were found matching your current filter.'
                  : `No leads found for department "${selectedDept}" matching your active filters.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setSelectedCampaign('All');
                  setSelectedStatus('All');
                  setSearch('');
                  if (isTrueAdmin) setSelectedDept('All');
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Log Calling Outcome</Text>
                <Text style={styles.modalLeadName} numberOfLines={1}>
                  {activeCallLead?.fullName || activeCallLead?.rawData?.full_name || activeCallLead?.name || 'Selected Candidate'}
                </Text>
                {activeCallLead ? (
                  <Text style={styles.modalLeadPhone}>
                    📞 {extractPhone(activeCallLead)} • {(activeCallLead.campaign || 'Campaign').replace(/_/g, ' ')}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setCallModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Selected Status Header Badge with AutoScroll */}
              <View
                style={[
                  styles.selectedStatusBanner,
                  outcomeCategory === 'Positive' ? styles.selBannerPos : styles.selBannerNeg,
                ]}
              >
                <Ionicons
                  name={outcomeCategory === 'Positive' ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={outcomeCategory === 'Positive' ? '#059669' : '#DC2626'}
                />
                <Text
                  style={[
                    styles.selectedStatusBannerLabel,
                    { color: outcomeCategory === 'Positive' ? '#065F46' : '#991B1B' },
                  ]}
                >
                  Status:
                </Text>
                <AutoScrollText
                  text={callOutcomeStatus}
                  maxWidth={230}
                  style={[
                    styles.selectedStatusBannerText,
                    { color: outcomeCategory === 'Positive' ? '#065F46' : '#991B1B' },
                  ]}
                />
              </View>

              {/* Category Selector: Positive (Priority 1) vs Negative */}
              <Text style={styles.modalSectionLabel}>DISPOSITION CATEGORY</Text>
              <View style={styles.categoryToggleRow}>
                {/* 1. Positive (Priority First) */}
                <TouchableOpacity
                  style={[
                    styles.categoryCard,
                    outcomeCategory === 'Positive' && styles.categoryCardActivePositive,
                  ]}
                  onPress={() => {
                    setOutcomeCategory('Positive');
                    if (!POSITIVE_STATUSES.includes(callOutcomeStatus)) {
                      setCallOutcomeStatus(POSITIVE_STATUSES[0]);
                    }
                    setTimeout(() => {
                      subStatusScrollRef.current?.scrollTo({ y: 0, animated: true });
                    }, 50);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryCardHeader}>
                    <Ionicons
                      name="thumbs-up"
                      size={18}
                      color={outcomeCategory === 'Positive' ? '#059669' : '#64748B'}
                    />
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>Priority #1</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.categoryCardTitle,
                      outcomeCategory === 'Positive' && styles.categoryCardTitleActivePositive,
                    ]}
                  >
                    Positive
                  </Text>
                  <Text style={styles.categoryCardSubtitle}>
                    Visits, Demos, Callbacks, Interested
                  </Text>
                </TouchableOpacity>

                {/* 2. Negative */}
                <TouchableOpacity
                  style={[
                    styles.categoryCard,
                    outcomeCategory === 'Negative' && styles.categoryCardActiveNegative,
                  ]}
                  onPress={() => {
                    setOutcomeCategory('Negative');
                    if (!NEGATIVE_STATUSES.includes(callOutcomeStatus)) {
                      setCallOutcomeStatus(NEGATIVE_STATUSES[0]);
                    }
                    setTimeout(() => {
                      subStatusScrollRef.current?.scrollTo({ y: 0, animated: true });
                    }, 50);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.categoryCardHeader}>
                    <Ionicons
                      name="thumbs-down"
                      size={18}
                      color={outcomeCategory === 'Negative' ? '#DC2626' : '#64748B'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryCardTitle,
                      outcomeCategory === 'Negative' && styles.categoryCardTitleActiveNegative,
                    ]}
                  >
                    Negative
                  </Text>
                  <Text style={styles.categoryCardSubtitle}>
                    Not Interested, Time pass, Jobs
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Sub-disposition Status Selection Chips with Bounded ScrollView */}
              <View style={styles.subStatusSectionHeader}>
                <Text style={styles.modalSectionLabel}>
                  SELECT {outcomeCategory.toUpperCase()} STATUS
                </Text>
                <Text style={styles.subStatusCountHint}>
                  {(outcomeCategory === 'Positive' ? POSITIVE_STATUSES : NEGATIVE_STATUSES).length} Options
                </Text>
              </View>

              <View style={styles.subStatusScrollWrapper}>
                <ScrollView
                  ref={subStatusScrollRef}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                  style={styles.subStatusScrollView}
                  contentContainerStyle={styles.subStatusContainer}
                >
                  {(outcomeCategory === 'Positive' ? POSITIVE_STATUSES : NEGATIVE_STATUSES).map((st) => {
                    const isSel = callOutcomeStatus === st;
                    const isPos = outcomeCategory === 'Positive';
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.subStatusChip,
                          isSel && (isPos ? styles.subStatusChipActivePos : styles.subStatusChipActiveNeg),
                        ]}
                        onPress={() => setCallOutcomeStatus(st)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={
                            isSel
                              ? 'checkmark-circle'
                              : isPos
                              ? 'ellipse-outline'
                              : 'close-circle-outline'
                          }
                          size={16}
                          color={
                            isSel
                              ? isPos
                                ? '#059669'
                                : '#DC2626'
                              : '#64748B'
                          }
                        />
                        <AutoScrollText
                          text={st}
                          maxWidth={270}
                          style={[
                            styles.subStatusChipText,
                            isSel && (isPos ? styles.subStatusChipTextActivePos : styles.subStatusChipTextActiveNeg),
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Next Follow Up Date */}
              <View style={styles.followUpInputContainer}>
                <Text style={styles.modalSectionLabel}>FOLLOW-UP DATE (OPTIONAL, YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInputBox}
                  placeholder="e.g. 2026-11-10"
                  placeholderTextColor={colors.textMuted}
                  value={followUpDate}
                  onChangeText={setFollowUpDate}
                />
              </View>

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
                  style={[
                    styles.modalSaveBtn,
                    outcomeCategory === 'Positive' ? styles.modalSaveBtnPos : styles.modalSaveBtnNeg,
                  ]}
                  onPress={handleSaveCallOutcome}
                  disabled={savingOutcome}
                >
                  {savingOutcome ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                      <Text style={styles.modalSaveText}>Save Outcome</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* LEAD DETAILS MODAL */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Candidate Details</Text>
                <Text style={styles.modalLeadName}>{detailsLead?.fullName || 'Candidate'}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Phone:</Text>
                <Text style={styles.detailsVal}>{detailsLead?.phone || detailsLead?.normalizedPhone || 'N/A'}</Text>
              </View>
              {detailsLead?.email ? (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Email:</Text>
                  <Text style={styles.detailsVal}>{detailsLead.email}</Text>
                </View>
              ) : null}
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Campaign:</Text>
                <Text style={styles.detailsVal}>{detailsLead?.campaign || 'General'}</Text>
              </View>
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Status:</Text>
                <Text style={styles.detailsVal}>{detailsLead?.status || 'New'}</Text>
              </View>
              {detailsLead?.rawData?.['City'] || detailsLead?.rawData?.['city'] ? (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>City/Location:</Text>
                  <Text style={styles.detailsVal}>{detailsLead.rawData['City'] || detailsLead.rawData['city']}</Text>
                </View>
              ) : null}
              {detailsLead?.rawData?.['Course'] || detailsLead?.rawData?.['Course Interest'] ? (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Course Interest:</Text>
                  <Text style={styles.detailsVal}>{detailsLead.rawData['Course'] || detailsLead.rawData['Course Interest']}</Text>
                </View>
              ) : null}
              {detailsLead?.followUpDate ? (
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Follow-up Date:</Text>
                  <Text style={styles.detailsVal}>{new Date(detailsLead.followUpDate).toLocaleDateString()}</Text>
                </View>
              ) : null}
              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabel}>Calls Attempted:</Text>
                <Text style={styles.detailsVal}>{detailsLead?.callCount || 0}</Text>
              </View>
            </ScrollView>

            <View style={styles.detailsActionRow}>
              {detailsLead?.status !== 'Converted' ? (
                <TouchableOpacity
                  style={styles.detailsConvertBtn}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    handleConvertLead(detailsLead);
                  }}
                >
                  <Ionicons name="git-merge-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.detailsConvertBtnText}>Convert to Lead</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.detailsCloseBtn}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.detailsCloseBtnText}>Close</Text>
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
    paddingBottom: 95, // Clean clearance above the bottom navigation bar
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#12305A',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 140,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
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
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174EA6',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
    elevation: 2,
    shadowColor: '#174EA6',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F28C28',
    gap: 4,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F4F7FB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  detailsButtonText: {
    color: '#12305A',
    fontSize: 12,
    fontWeight: '600',
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
  detailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    width: '40%',
  },
  detailsVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    width: '60%',
    textAlign: 'right',
  },
  detailsActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  detailsConvertBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174EA6',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
  },
  detailsConvertBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  detailsCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
  },
  detailsCloseBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
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
  modalLeadPhone: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  /* Selected Status Preview Banner with AutoScroll */
  selectedStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  selBannerPos: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  selBannerNeg: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECDD3',
  },
  selectedStatusBannerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectedStatusBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Category Toggle: Positive (Priority 1) vs Negative */
  categoryToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  categoryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryCardActivePositive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  categoryCardActiveNegative: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priorityBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  categoryCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 1,
  },
  categoryCardTitleActivePositive: {
    color: '#065F46',
  },
  categoryCardTitleActiveNegative: {
    color: '#991B1B',
  },
  categoryCardSubtitle: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 13,
  },

  /* Sub-status Scroll Section */
  subStatusSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  subStatusCountHint: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  subStatusScrollWrapper: {
    maxHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 6,
    marginBottom: 12,
  },
  subStatusScrollView: {
    flexGrow: 0,
  },
  subStatusContainer: {
    gap: 5,
  },
  subStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subStatusChipActivePos: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  subStatusChipActiveNeg: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  subStatusChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  subStatusChipTextActivePos: {
    color: '#065F46',
    fontWeight: '700',
  },
  subStatusChipTextActiveNeg: {
    color: '#991B1B',
    fontWeight: '700',
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
  modalSaveBtnPos: {
    backgroundColor: '#059669',
  },
  modalSaveBtnNeg: {
    backgroundColor: '#DC2626',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
