import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { recordingsApi } from '../api/recordingsApi';
import Header from '../components/Header';

export default function CallRecordingsScreen({ onNavigate }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecordings = useCallback(async () => {
    try {
      const data = await recordingsApi.getMy();
      const list = Array.isArray(data) ? data : data.recordings || [];
      setRecordings(list);
    } catch (err) {
      console.warn('[Recordings] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecordings();
  };

  const handlePlayAudio = async (rec) => {
    const streamUrl = recordingsApi.getStreamUrl(rec);
    if (!streamUrl) {
      Alert.alert('Audio Unavailable', 'No audio stream URL is available for this recording.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(streamUrl);
      if (supported) {
        await Linking.openURL(streamUrl);
      } else {
        // Fallback open
        await Linking.openURL(streamUrl);
      }
    } catch (err) {
      Alert.alert(
        'Playback Notice',
        `Streaming audio via browser/player:\n${streamUrl}`,
        [
          { text: 'Open URL', onPress: () => Linking.openURL(streamUrl) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
  };

  const handleWhatsApp = (phone, name) => {
    if (!phone) return;
    let p = phone.replace(/[^0-9]/g, '');
    if (p.length === 10) p = '91' + p;
    const msg = encodeURIComponent(`Hello ${name || ''}, regarding our recent call on AOTMS CRM.`);
    Linking.openURL(`https://wa.me/${p}?text=${msg}`);
  };

  const formatDuration = (sec) => {
    if (!sec && sec !== 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Call Recordings"
        subtitle={`${recordings.length} Recorded calls with audio`}
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching call logs and audio streams...</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const phone = item.phone || item.lead?.phone || '';
            const leadName = item.lead?.name || item.contactName || item.phone || 'Call Log';
            const duration = formatDuration(item.duration || item.callDuration);

            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="mic" size={20} color={colors.primary} />
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.leadName} numberOfLines={1}>{leadName}</Text>
                    <Text style={styles.phoneText}>{phone || 'Unknown phone'}</Text>
                    <Text style={styles.dateText}>
                      {item.recordedAt || item.createdAt
                        ? new Date(item.recordedAt || item.createdAt).toLocaleString()
                        : 'Recent Recording'}
                    </Text>
                  </View>

                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={13} color={colors.accent} />
                    <Text style={styles.durationText}>{duration}</Text>
                  </View>
                </View>

                {/* Audio Stream & Actions Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => handlePlayAudio(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                    <Text style={styles.playBtnText}>Play Recording</Text>
                  </TouchableOpacity>

                  {phone ? (
                    <View style={styles.contactActions}>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.callBtn]}
                        onPress={() => handleCall(phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={14} color="#FFFFFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.smallBtn, styles.waBtn]}
                        onPress={() => handleWhatsApp(phone, leadName)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No call recordings found</Text>
              <Text style={styles.emptySub}>Connected call recordings from CRM dialer will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  leadName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  phoneText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingTop: 12,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: colors.surfaceLight,
  },
  waBtn: {
    backgroundColor: colors.whatsapp,
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
});
