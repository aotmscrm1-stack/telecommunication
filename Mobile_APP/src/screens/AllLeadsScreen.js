import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { leadsApi } from '../api/leadsApi';
import Header from '../components/Header';
import LeadCard from '../components/LeadCard';

export default function AllLeadsScreen({ onNavigate }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Status update modal
  const [selectedLead, setSelectedLead] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const statusOptions = ['Fresh', 'Contacted', 'Interested', 'Won', 'Lost'];
  const filterTabs = ['All', 'Fresh', 'Contacted', 'Interested', 'Won', 'Lost'];

  const fetchLeads = useCallback(async (pageNum = 1, searchQuery = search, statusFilter = activeFilter) => {
    try {
      const params = {
        page: pageNum,
        limit: 20,
        filter: isAdmin ? 'all' : 'mine',
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await leadsApi.getLeads(params);
      if (res) {
        setLeads(res.leads || []);
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
        setPage(pageNum);
      }
    } catch (err) {
      console.warn('[AllLeads] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    fetchLeads(1, search, activeFilter);
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads(1, search, activeFilter);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    fetchLeads(1, search, activeFilter);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setLoading(true);
  };

  const handleLeadPress = (lead) => {
    setSelectedLead(lead);
    setStatusModalVisible(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedLead) return;
    try {
      setUpdatingStatus(true);
      await leadsApi.updateLead(selectedLead._id, { status: newStatus });
      setLeads((prev) =>
        prev.map((l) => (l._id === selectedLead._id ? { ...l, status: newStatus } : l))
      );
      setStatusModalVisible(false);
      Alert.alert('Status Updated', `Lead status updated to ${newStatus}.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="All Leads"
        subtitle={`${totalCount} Total CRM Leads`}
        showBack
        onBack={() => onNavigate('dashboard')}
        rightAction={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => onNavigate('add_lead')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name, phone, or email..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(''); fetchLeads(1, '', activeFilter); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const isActive = activeFilter === item;
            return (
              <TouchableOpacity
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => handleFilterChange(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Leads List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching leads from CRM cloud...</Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <LeadCard
              lead={item}
              onPress={() => handleLeadPress(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="person-remove-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No leads found</Text>
              <Text style={styles.emptySub}>Try adjusting your search query or filter</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  onPress={() => {
                    if (page > 1) {
                      setLoading(true);
                      fetchLeads(page - 1);
                    }
                  }}
                  disabled={page <= 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color={page <= 1 ? colors.textMuted : '#FFFFFF'} />
                  <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>Previous</Text>
                </TouchableOpacity>

                <View style={styles.pageIndicatorBox}>
                  <Text style={styles.pageIndicatorText}>
                    Page <Text style={{ fontWeight: '700', color: colors.primary }}>{page}</Text> of {totalPages}
                  </Text>
                  <Text style={styles.pageTotalSubText}>({totalCount} leads)</Text>
                </View>

                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => {
                    if (page < totalPages) {
                      setLoading(true);
                      fetchLeads(page + 1);
                    }
                  }}
                  disabled={page >= totalPages}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pageBtnText, page >= totalPages && styles.pageBtnTextDisabled]}>Next</Text>
                  <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? colors.textMuted : '#FFFFFF'} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedLead?.name || 'Lead Details'}</Text>
                <Text style={styles.modalSubtitle}>{selectedLead?.phone}</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>UPDATE STAGE / STATUS</Text>
            <View style={styles.statusOptionsGrid}>
              {statusOptions.map((st) => {
                const isCurrent = selectedLead?.status === st;
                return (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusOptionBtn, isCurrent && styles.statusOptionActive]}
                    onPress={() => handleUpdateStatus(st)}
                    disabled={updatingStatus}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statusOptionText, isCurrent && styles.statusOptionTextActive]}>
                      {st}
                    </Text>
                    {isCurrent ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: colors.background,
  },
  addBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterBar: {
    marginBottom: 6,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterTabActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    borderColor: colors.primary,
  },
  filterTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  modalSectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  statusOptionsGrid: {
    gap: 8,
    marginBottom: 20,
  },
  statusOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusOptionActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: colors.primary,
  },
  statusOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  statusOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pageBtnTextDisabled: {
    color: colors.textMuted,
  },
  pageIndicatorBox: {
    alignItems: 'center',
  },
  pageIndicatorText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  pageTotalSubText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
