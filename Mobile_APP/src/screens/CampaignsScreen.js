import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { campaignsApi } from '../api/campaignsApi';
import Header from '../components/Header';

export default function CampaignsScreen({ onNavigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New campaign modal
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // View campaign details modal
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [campaignDetailData, setCampaignDetailData] = useState(null);

  const handleOpenCampaign = async (campaign) => {
    setSelectedCampaign(campaign);
    setCampaignDetailData(null);
    setLoadingDetail(true);
    try {
      const res = await campaignsApi.getCampaign(campaign._id);
      if (res && res.campaign) {
        setCampaignDetailData(res.campaign);
      }
    } catch (err) {
      console.warn('[Campaign Detail Fetch Error]:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await campaignsApi.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : data.campaigns || []);
    } catch (err) {
      console.warn('[Campaigns] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCampaigns();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a campaign name');
      return;
    }
    try {
      setCreating(true);
      await campaignsApi.createCampaign({
        name: name.trim(),
        description: description.trim(),
        status: 'Active',
      });
      setModalVisible(false);
      setName('');
      setDescription('');
      fetchCampaigns();
      Alert.alert('Success', 'Campaign created successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Marketing Campaigns"
        subtitle={`${campaigns.length} Active Campaigns`}
        showBack
        onBack={() => onNavigate('dashboard')}
        rightAction={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleOpenCampaign(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.campaignIcon}>
                  <Ionicons name="megaphone" size={20} color={colors.primary} />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.campaignName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.campaignDate}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Active'}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.status || 'Active'}</Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.statText}>
                    {item.leads?.length || item.totalLeads || 0} Leads
                  </Text>
                </View>

                {item.type ? (
                  <View style={styles.statItem}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.statText}>{item.type}</Text>
                  </View>
                ) : null}

                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>View</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No campaigns found</Text>
              <Text style={styles.emptySub}>Tap "+ New" to create your first CRM campaign</Text>
            </View>
          }
        />
      )}

      {/* Campaign Details Modal */}
      <Modal
        visible={!!selectedCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCampaign(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedCampaign?.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Status: {selectedCampaign?.status || 'Active'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCampaign(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingDetail ? (
              <View style={{ paddingVertical: 30, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Loading campaign metrics...</Text>
              </View>
            ) : (
              <View style={styles.detailBody}>
                <View style={styles.detailRowItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.detailLabel}>Created Date:</Text>
                  <Text style={styles.detailValue}>
                    {selectedCampaign?.createdAt ? new Date(selectedCampaign.createdAt).toLocaleDateString() : 'Active'}
                  </Text>
                </View>

                <View style={styles.detailRowItem}>
                  <Ionicons name="people-outline" size={16} color={colors.primary} />
                  <Text style={styles.detailLabel}>Total Campaign Leads:</Text>
                  <Text style={styles.detailValue}>
                    {campaignDetailData?.totalLeads ?? (selectedCampaign?.leads?.length || selectedCampaign?.totalLeads || 0)}
                  </Text>
                </View>

                {selectedCampaign?.type ? (
                  <View style={styles.detailRowItem}>
                    <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                    <Text style={styles.detailLabel}>Campaign Type:</Text>
                    <Text style={styles.detailValue}>{selectedCampaign.type}</Text>
                  </View>
                ) : null}

                {/* Status Breakdown Chips if available */}
                {campaignDetailData?.statusBreakdown && campaignDetailData.statusBreakdown.length > 0 ? (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.label}>LEAD STAGES BREAKDOWN</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {campaignDetailData.statusBreakdown.map((st) => (
                        <View
                          key={st._id || 'unknown'}
                          style={{
                            backgroundColor: colors.surface,
                            borderWidth: 1,
                            borderColor: colors.cardBorder,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: colors.text, fontWeight: '600' }}>
                            {st._id || 'Fresh'}: <Text style={{ color: colors.primary }}>{st.count}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>CAMPAIGN DESCRIPTION</Text>
                  <Text style={{ fontSize: 14, color: colors.text, marginTop: 4, lineHeight: 20 }}>
                    {selectedCampaign?.description || 'No campaign description provided.'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createBtn, { marginTop: 12 }]}
              onPress={() => {
                setSelectedCampaign(null);
                onNavigate('all_leads');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.createBtnText}>Explore Leads for this Campaign</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Campaign</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>CAMPAIGN NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. October Telecaller Blast"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>DESCRIPTION / GOALS</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Target demographic, offers, script..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.disabledBtn]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.8}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.createBtnText}>Launch Campaign</Text>
              )}
            </TouchableOpacity>
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
  addBtn: {
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  campaignIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  campaignName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  campaignDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  descText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  formGroup: {
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
  createBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  detailBody: {
    gap: 12,
    paddingVertical: 8,
  },
  detailRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
});
