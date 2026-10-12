import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors } from '../theme/colors';
import { recordingsApi } from '../api/recordingsApi';
import Header from '../components/Header';

export default function CallRecordingsScreen({ onNavigate }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Audio Playback State
  const [sound, setSound] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);

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
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [fetchRecordings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecordings();
  };

  const handlePlayToggle = async (rec) => {
    const streamUrl = recordingsApi.getStreamUrl(rec);
    if (!streamUrl) {
      Alert.alert('Playback Error', 'No audio stream URL available for this recording.');
      return;
    }

    try {
      // If same recording is playing, toggle pause
      if (playingId === rec._id && sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // If different recording, stop existing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      setBuffering(true);
      setPlayingId(rec._id);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setBuffering(false);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPlayingId(null);
            }
          } else if (status.error) {
            setBuffering(false);
            setIsPlaying(false);
          }
        }
      );

      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      setBuffering(false);
      setIsPlaying(false);
      setPlayingId(null);
      Alert.alert('Audio Error', 'Unable to stream audio recording from server.');
    }
  };

  const formatDuration = (sec) => {
    if (!sec) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Call Recordings"
        subtitle={`${recordings.length} Logged calls with audio`}
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading call recordings...</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const isThisPlaying = playingId === item._id && isPlaying;
            const isThisBuffering = playingId === item._id && buffering;

            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.leadName} numberOfLines={1}>
                      {item.lead?.name || item.contactName || item.phone || 'Caller Recording'}
                    </Text>
                    <Text style={styles.phoneText}>
                      {item.phone || item.lead?.phone || 'Unknown phone'}
                    </Text>
                  </View>

                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                    <Text style={styles.durationText}>
                      {formatDuration(item.duration || item.callDuration)}
                    </Text>
                  </View>
                </View>

                {/* Player Row */}
                <View style={styles.playerRow}>
                  <TouchableOpacity
                    style={[styles.playBtn, isThisPlaying && styles.playingBtn]}
                    onPress={() => handlePlayToggle(item)}
                    activeOpacity={0.8}
                  >
                    {isThisBuffering ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons
                        name={isThisPlaying ? 'pause' : 'play'}
                        size={18}
                        color="#FFFFFF"
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.trackInfo}>
                    <View style={styles.waveformPlaceholder}>
                      <View style={[styles.progressFill, { width: isThisPlaying ? '60%' : '0%' }]} />
                    </View>
                    <Text style={styles.dateText}>
                      {item.recordedAt || item.createdAt
                        ? new Date(item.recordedAt || item.createdAt).toLocaleString()
                        : 'Recorded Call'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No recordings found</Text>
              <Text style={styles.emptySub}>Connected call recordings will appear here automatically</Text>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
    marginRight: 10,
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
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingTop: 12,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingBtn: {
    backgroundColor: colors.accent,
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  waveformPlaceholder: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
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
