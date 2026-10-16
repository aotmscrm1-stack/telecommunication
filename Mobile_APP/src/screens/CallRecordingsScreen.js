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
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { recordingsApi } from '../api/recordingsApi';
import Header from '../components/Header';

const SUPPORTED_AUDIO_EXTENSIONS = /\.(m4a|amr|mp3|wav|3gp|3gpp|aac|ogg|opus|wma|flac|mp4)$/i;
const SAVED_DIRECTORY_URI_KEY = '@aotms_call_recordings_dir_uri';
const SAVED_DIRECTORY_NAME_KEY = '@aotms_call_recordings_dir_name';

/**
 * Extracts a user-friendly folder label from a SAF directory URI or path.
 * e.g., "content://.../tree/primary%3AAudio%2FCall" -> "Audio/Call"
 * e.g., "Audio" -> "Audio"
 */
function getReadableFolderLabel(rawUri) {
  if (!rawUri) return 'No folder selected';
  try {
    const decoded = decodeURIComponent(rawUri);
    // SAF content URIs usually contain 'document/primary:...' or 'tree/primary:...'
    if (decoded.includes(':')) {
      const parts = decoded.split(':');
      const tail = parts[parts.length - 1];
      const cleanTail = tail.replace(/\/+$/, '').trim();
      if (cleanTail) {
        // e.g. "Audio" or "Audio/Recordings"
        return cleanTail;
      }
    }
    const slashParts = decoded.replace(/\/+$/, '').split('/');
    return slashParts[slashParts.length - 1] || decoded;
  } catch (_) {
    return String(rawUri);
  }
}

export default function CallRecordingsScreen({ onNavigate }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Folder Sync State
  const [selectedFolderUri, setSelectedFolderUri] = useState('');
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [stagedFiles, setStagedFiles] = useState([]);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncSummary, setSyncSummary] = useState(null);

  // Metadata Edit Modal State
  const [editingRecording, setEditingRecording] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Load persisted directory URI if saved previously
  useEffect(() => {
    (async () => {
      try {
        const savedUri = await AsyncStorage.getItem(SAVED_DIRECTORY_URI_KEY);
        const savedName = await AsyncStorage.getItem(SAVED_DIRECTORY_NAME_KEY);
        if (savedUri) {
          setSelectedFolderUri(savedUri);
          setSelectedFolderName(savedName || getReadableFolderLabel(savedUri));
        }
      } catch (err) {
        console.warn('[CallRecordings] Failed to load saved directory:', err);
      }
    })();
  }, []);

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

  /**
   * Recursively scans an Expo Directory instance and its subdirectories
   */
  const scanDirectoryRecursively = async (directoryInstance, discoveredList = [], depth = 0) => {
    if (depth > 6) return; // Prevent excessive recursion depth

    try {
      const items = directoryInstance.list();
      for (const item of items) {
        if (item instanceof FileSystem.Directory || item.isDirectory) {
          try {
            const subDir = item instanceof FileSystem.Directory ? item : new FileSystem.Directory(item.uri);
            await scanDirectoryRecursively(subDir, discoveredList, depth + 1);
          } catch (subErr) {
            console.warn('[Subdirectory scan skipped]:', item.uri, subErr.message);
          }
        } else if (item instanceof FileSystem.File || !item.isDirectory) {
          const uri = item.uri;
          const decoded = decodeURIComponent(uri);
          const name = item.name || decoded.split('/').pop().split(':').pop() || 'recording.m4a';

          if (SUPPORTED_AUDIO_EXTENSIONS.test(name) || SUPPORTED_AUDIO_EXTENSIONS.test(decoded)) {
            discoveredList.push({
              uri,
              name,
              type: 'audio/m4a',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Directory scan error at depth ' + depth + ']:', err.message);
    }
  };

  /**
   * Recursively scans an Android Storage Access Framework (SAF) URI
   */
  const scanSafRecursively = async (dirUri, discoveredList = [], depth = 0) => {
    if (depth > 6) return;

    try {
      const childrenUris = await StorageAccessFramework.readDirectoryAsync(dirUri);
      for (const childUri of childrenUris) {
        const decoded = decodeURIComponent(childUri);
        const name = decoded.split('/').pop().split(':').pop() || '';

        // If file has a supported audio extension
        if (SUPPORTED_AUDIO_EXTENSIONS.test(name) || SUPPORTED_AUDIO_EXTENSIONS.test(decoded)) {
          discoveredList.push({
            uri: childUri,
            name: name || 'recording.m4a',
            type: 'audio/m4a',
          });
        } else if (!name.includes('.')) {
          // Likely a subfolder (e.g., Audio/Audio Trim, Audio/Nani), scan recursively
          try {
            await scanSafRecursively(childUri, discoveredList, depth + 1);
          } catch (_) {
            // Not a readable directory, continue
          }
        }
      }
    } catch (err) {
      console.warn('[SAF recursive scan warning at depth ' + depth + ']:', err.message);
    }
  };

  /**
   * Native Android Directory Picker (ACTION_OPEN_DOCUMENT_TREE)
   * Obtains parent folder reference, displays readable folder label (e.g. Audio),
   * and recursively scans folder + subfolders for all supported audio files.
   */
  const handleSelectFolder = async () => {
    if (syncing || scanningFolder) return;

    try {
      setScanningFolder(true);
      let directoryUri = null;
      let folderLabel = '';
      const discoveredAudioFiles = [];

      // Method 1: New Expo 57 Directory.pickDirectoryAsync (Native SAF ACTION_OPEN_DOCUMENT_TREE)
      if (typeof FileSystem.Directory?.pickDirectoryAsync === 'function') {
        try {
          const pickedDir = await FileSystem.Directory.pickDirectoryAsync();
          if (pickedDir && pickedDir.uri) {
            directoryUri = pickedDir.uri;
            folderLabel = pickedDir.name || getReadableFolderLabel(pickedDir.uri);
            await scanDirectoryRecursively(pickedDir, discoveredAudioFiles, 0);
          }
        } catch (pickErr) {
          // If user cancelled, simply return cleanly without alert
          const errMsg = String(pickErr.message || '').toLowerCase();
          if (errMsg.includes('cancel') || errMsg.includes('user cancelled')) {
            setScanningFolder(false);
            return;
          }
          console.warn('[Directory.pickDirectoryAsync failed, trying SAF legacy]:', pickErr);
        }
      }

      // Method 2: StorageAccessFramework.requestDirectoryPermissionsAsync (Android SAF)
      if (!directoryUri && Platform.OS === 'android' && StorageAccessFramework?.requestDirectoryPermissionsAsync) {
        const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permissions || !permissions.granted) {
          setScanningFolder(false);
          return;
        }

        directoryUri = permissions.directoryUri;
        folderLabel = getReadableFolderLabel(directoryUri);
        await scanSafRecursively(directoryUri, discoveredAudioFiles, 0);
      }

      // If user did not pick a directory or unsupported platform
      if (!directoryUri) {
        setScanningFolder(false);
        return;
      }

      // Persist the selected folder reference
      setSelectedFolderUri(directoryUri);
      setSelectedFolderName(folderLabel);
      try {
        await AsyncStorage.setItem(SAVED_DIRECTORY_URI_KEY, directoryUri);
        await AsyncStorage.setItem(SAVED_DIRECTORY_NAME_KEY, folderLabel);
      } catch (_) {}

      setStagedFiles(discoveredAudioFiles);
      setScanningFolder(false);

      if (discoveredAudioFiles.length === 0) {
        Alert.alert(
          'No Audio Files Found',
          `Folder "${folderLabel}" and its subdirectories contain no supported audio files (.m4a, .mp3, .wav, .amr, .aac, .3gp).\n\nPath:\n${directoryUri}`
        );
        return;
      }

      Alert.alert(
        'Folder Selected',
        `Folder: "${folderLabel}"\n\nDiscovered ${discoveredAudioFiles.length} audio file(s) across this folder and its subdirectories.\n\nClick "Sync Data" to sync with CRM.`
      );
    } catch (err) {
      setScanningFolder(false);
      console.error('[Folder Selection Error]:', err);
      Alert.alert('Folder Picker Error', err.message || 'Failed to select folder.');
    }
  };

  /**
   * Process and sync discovered audio files.
   * Handles SAF content:// URIs safely by copying to app cache when needed.
   */
  const processSyncFiles = async (files) => {
    if (!files || files.length === 0) return;
    setSyncing(true);
    setSyncSummary(null);

    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let failedCount = 0;
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      setSyncProgress({
        current: i + 1,
        total,
        filename: file.name,
      });

      let uploadableFile = file;
      let tempCacheFile = null;

      try {
        // If it's an Android content:// URI, copy to local cache directory to ensure
        // standard multipart/form-data upload via Axios/Fetch works seamlessly
        if (file.uri && file.uri.startsWith('content://')) {
          const cleanName = (file.name || `audio_${Date.now()}.m4a`).replace(/[^a-zA-Z0-9._-]/g, '_');
          const cacheDir = FileSystem.Paths?.cache?.uri || FileSystem.cacheDirectory || `${FileSystem.documentDirectory}temp/`;
          const destinationUri = `${cacheDir.replace(/\/+$/, '')}/${Date.now()}_${cleanName}`;

          try {
            // Check if legacy copyAsync or new File copy works
            if (typeof FileSystem.copyAsync === 'function') {
              await FileSystem.copyAsync({ from: file.uri, to: destinationUri });
              tempCacheFile = destinationUri;
              uploadableFile = {
                uri: destinationUri,
                name: file.name,
                type: file.type || 'audio/m4a',
              };
            }
          } catch (copyErr) {
            console.warn('[Cache copy notice, using original URI]:', copyErr.message);
          }
        }

        const res = await recordingsApi.uploadRecording(uploadableFile, {
          recordedAt: new Date().toISOString(),
        });

        if (res.alreadySynced) {
          alreadySyncedCount++;
        } else {
          syncedCount++;
        }
      } catch (uploadErr) {
        console.error('[Sync Error on file]:', file.name, uploadErr.message);
        failedCount++;
      } finally {
        // Clean up temporary cache copy if created
        if (tempCacheFile) {
          try {
            if (typeof FileSystem.deleteAsync === 'function') {
              await FileSystem.deleteAsync(tempCacheFile, { idempotent: true });
            }
          } catch (_) {}
        }
      }
    }

    setSyncing(false);
    setSyncProgress(null);

    const summary = {
      discovered: total,
      synced: syncedCount,
      alreadySynced: alreadySyncedCount,
      failed: failedCount,
    };
    setSyncSummary(summary);

    Alert.alert(
      'Sync Complete',
      `• Discovered: ${total}\n• Newly Synced: ${syncedCount}\n• Already in CRM: ${alreadySyncedCount}\n• Failed: ${failedCount}`,
      [{ text: 'OK', onPress: () => onRefresh() }]
    );
  };

  const handlePlayAudio = async (rec) => {
    const streamUrl = recordingsApi.getStreamUrl(rec);
    if (!streamUrl) {
      Alert.alert('Audio Unavailable', 'No audio stream URL is available for this recording.');
      return;
    }

    try {
      await Linking.openURL(streamUrl);
    } catch (err) {
      Alert.alert('Playback Notice', `Could not open audio stream:\n${streamUrl}`);
    }
  };

  const handleEditRecording = (rec) => {
    setEditingRecording(rec);
    setEditName(rec.originalName || '');
    setEditPhone(rec.phone || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRecording) return;
    try {
      setSavingEdit(true);
      await recordingsApi.updateRecording(editingRecording._id, {
        originalName: editName.trim(),
        phone: editPhone.trim(),
      });
      setEditingRecording(null);
      Alert.alert('Updated', 'Recording metadata updated successfully.');
      onRefresh();
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.error || err.message || 'Could not update recording.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRecording = (rec) => {
    Alert.alert(
      'Delete Recording',
      `Are you sure you want to delete "${rec.originalName || 'this recording'}"? This removes the audio from CRM storage permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await recordingsApi.deleteRecording(rec._id);
              Alert.alert('Deleted', 'Recording was removed successfully.');
              onRefresh();
            } catch (err) {
              Alert.alert('Delete Failed', err.response?.data?.error || 'Could not delete recording.');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
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
        subtitle={`${recordings.length} Recorded calls synced in CRM`}
        showBack
        onBack={() => onNavigate('dashboard')}
      />

      {/* Folder Sync Header Bar */}
      <View style={styles.uploadHeaderBar}>
        <View style={styles.uploadTextContainer}>
          <Text style={styles.uploadHeaderTitle}>Folder Audio Sync</Text>
          <Text style={styles.uploadHeaderSubtitle} numberOfLines={1}>
            {selectedFolderName ? `Folder: ${selectedFolderName}` : 'No folder selected'}
          </Text>
          {scanningFolder ? (
            <Text style={[styles.stagedCountText, { color: colors.primary }]}>
              ⏳ Scanning directory & subfolders...
            </Text>
          ) : stagedFiles.length > 0 ? (
            <Text style={styles.stagedCountText}>
              ✓ {stagedFiles.length} audio file(s) ready to sync
            </Text>
          ) : null}
        </View>

        <View style={styles.headerButtonCol}>
          <TouchableOpacity
            style={[styles.selectFolderBtn, (syncing || scanningFolder) && styles.syncDataBtnDisabled]}
            onPress={handleSelectFolder}
            disabled={syncing || scanningFolder}
            activeOpacity={0.8}
          >
            {scanningFolder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="folder-open" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.selectFolderBtnText}>
              {scanningFolder ? 'Scanning...' : 'Select Folder'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.syncDataBtn,
              (syncing || stagedFiles.length === 0) && styles.syncDataBtnDisabled,
            ]}
            onPress={() => processSyncFiles(stagedFiles)}
            disabled={syncing || stagedFiles.length === 0}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.syncDataBtnText}>
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Syncing Progress Indicator */}
      {syncing && syncProgress ? (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.progressText}>
            Syncing ({syncProgress.current}/{syncProgress.total}): {syncProgress.filename}
          </Text>
        </View>
      ) : null}

      {/* Sync Summary Notice */}
      {syncSummary ? (
        <View style={styles.summaryBar}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.summaryText}>
            Synced: {syncSummary.synced} | Already in CRM: {syncSummary.alreadySynced} | Failed: {syncSummary.failed}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching call library from CRM...</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Synced Recordings</Text>
              <Text style={styles.emptySubtitle}>
                Tap "Select Folder" above to scan your audio recordings folder. All supported files will sync into the CRM and be available across mobile and the website!
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const phone = item.phone || item.lead?.phone || '';
            const leadName = item.lead?.name || item.contactName || item.phone || item.originalName || 'Call Log';
            const duration = formatDuration(item.duration || item.callDuration);

            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="mic" size={20} color={colors.primary} />
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.leadName} numberOfLines={1}>{leadName}</Text>
                    <Text style={styles.phoneText}>{phone || 'No matched contact'}</Text>
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

                {/* Audio Stream & Full CRUD Actions Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => handlePlayAudio(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={16} color="#FFFFFF" />
                    <Text style={styles.playBtnText}>Play</Text>
                  </TouchableOpacity>

                  <View style={styles.crudActions}>
                    {/* Call Quick Action */}
                    {phone ? (
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.callBtn]}
                        onPress={() => handleCall(phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : null}

                    {/* Edit Metadata */}
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.editBtn]}
                      onPress={() => handleEditRecording(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {/* Delete Recording */}
                    <TouchableOpacity
                      style={[styles.smallBtn, styles.deleteBtn]}
                      onPress={() => handleDeleteRecording(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Metadata Edit Modal */}
      <Modal
        visible={!!editingRecording}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingRecording(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Recording Metadata</Text>

            <Text style={styles.modalLabel}>File / Display Title</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Recording Name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.modalLabel}>Phone Number (10 digits)</Text>
            <TextInput
              style={styles.modalInput}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingRecording(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
                activeOpacity={0.8}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Changes</Text>
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
    backgroundColor: colors.background,
  },
  uploadHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  uploadTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  uploadHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  uploadHeaderSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stagedCountText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 3,
  },
  headerButtonCol: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  selectFolderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  selectFolderBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  syncDataBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  syncDataBtnDisabled: {
    opacity: 0.5,
  },
  syncDataBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  progressText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  summaryText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
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
    fontSize: 13,
    marginTop: 2,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  durationText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  playBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  crudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    backgroundColor: colors.accent,
  },
  waBtn: {
    backgroundColor: colors.whatsapp,
  },
  editBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
