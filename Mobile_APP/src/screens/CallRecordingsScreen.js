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
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { recordingsApi } from '../api/recordingsApi';
import Header from '../components/Header';

const SUPPORTED_AUDIO_EXTENSIONS = /\.(m4a|amr|mp3|wav|3gp|3gpp|aac|ogg|opus|wma|flac|mp4|awb|m4p|weba)$/i;

function getAudioMimeType(filename) {
  if (!filename) return 'audio/mpeg';
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'aac': return 'audio/aac';
    case 'mp3': return 'audio/mpeg';
    case 'm4a': return 'audio/mp4';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'opus': return 'audio/opus';
    case 'amr': return 'audio/amr';
    case 'awb': return 'audio/amr-wb';
    case '3gp':
    case '3gpp': return 'audio/3gpp';
    case 'flac': return 'audio/flac';
    default: return 'audio/mpeg';
  }
}

const SAVED_DIRECTORY_URI_KEY = '@aotms_call_recordings_dir_uri';
const SAVED_DIRECTORY_NAME_KEY = '@aotms_call_recordings_dir_name';
const SAVED_SYNCED_NAMES_KEY = '@aotms_synced_recording_names_v1';

function normalizeRecName(raw) {
  if (!raw) return '';
  try {
    const dec = decodeURIComponent(String(raw));
    const base = dec.split('/').pop().split(':').pop() || dec;
    return base.trim().toLowerCase();
  } catch (_) {
    return String(raw).trim().toLowerCase();
  }
}

function extractPhonePreview(filename) {
  if (!filename) return '';
  const direct = String(filename).match(/(?:\+?91[\s\-_]*)?([6-9]\d{9})\b/);
  if (direct && direct[1]) return direct[1];
  const seqs = String(filename).match(/\d{10,13}/g);
  if (seqs) {
    for (const s of seqs) {
      if (s.length === 13 && Number(s) > 1000000000000) continue;
      const last10 = s.slice(-10);
      if (/^[6-9]\d{9}$/.test(last10)) return last10;
    }
  }
  return '';
}

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
  const [folderStats, setFolderStats] = useState({
    totalInFolder: 0,
    alreadyInCrm: 0,
    newCount: 0,
  });
  const [showNewRecordsModal, setShowNewRecordsModal] = useState(false);
  const [scanningFolder, setScanningFolder] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncSummary, setSyncSummary] = useState(null);
  const [crmSyncedNamesSet, setCrmSyncedNamesSet] = useState(() => new Set());

  // Metadata Edit Modal State
  const [editingRecording, setEditingRecording] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Helper: Load and merge all known synced recording names from CRM + local cache
  const loadLatestSyncedNamesSet = useCallback(async (currentRecordings = []) => {
    const mergedSet = new Set();

    // 1. From local AsyncStorage cache
    try {
      const cachedJson = await AsyncStorage.getItem(SAVED_SYNCED_NAMES_KEY);
      if (cachedJson) {
        const parsed = JSON.parse(cachedJson);
        if (Array.isArray(parsed)) {
          parsed.forEach((n) => {
            const norm = normalizeRecName(n);
            if (norm) mergedSet.add(norm);
          });
        }
      }
    } catch (_) {}

    // 2. From passed recordings array
    (currentRecordings || []).forEach((r) => {
      const n1 = normalizeRecName(r?.originalName);
      const n2 = normalizeRecName(r?.storedName);
      if (n1) mergedSet.add(n1);
      if (n2) mergedSet.add(n2);
    });

    // 3. From backend /recordings/my?limit=all and /recordings/synced-names
    try {
      const [myData, syncedData] = await Promise.all([
        recordingsApi.getMy({ limit: 'all' }).catch(() => null),
        recordingsApi.getSyncedNames().catch(() => null),
      ]);

      const list = Array.isArray(myData) ? myData : myData?.recordings || [];
      list.forEach((r) => {
        const n1 = normalizeRecName(r?.originalName);
        const n2 = normalizeRecName(r?.storedName);
        if (n1) mergedSet.add(n1);
        if (n2) mergedSet.add(n2);
      });

      const extraNames = [
        ...(Array.isArray(myData?.allSyncedNames) ? myData.allSyncedNames : []),
        ...(Array.isArray(syncedData?.names) ? syncedData.names : []),
      ];
      extraNames.forEach((n) => {
        const norm = normalizeRecName(n);
        if (norm) mergedSet.add(norm);
      });

      if (list.length > 0) {
        setRecordings(list);
      }
    } catch (_) {}

    // Save updated set back to AsyncStorage
    try {
      await AsyncStorage.setItem(SAVED_SYNCED_NAMES_KEY, JSON.stringify([...mergedSet]));
    } catch (_) {}

    setCrmSyncedNamesSet(new Set(mergedSet));
    return mergedSet;
  }, []);

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
      const data = await recordingsApi.getMy({ limit: 'all' });
      const list = Array.isArray(data) ? data : data.recordings || [];
      setRecordings(list);
      await loadLatestSyncedNamesSet(list);
    } catch (err) {
      console.warn('[Recordings] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLatestSyncedNamesSet]);

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
              type: getAudioMimeType(name),
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
            type: getAudioMimeType(name),
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
   * Filters discovered folder audio files against all recordings already in CRM.
   * Removes existing CRM recordings so ONLY brand-new call records are staged and shown.
   */
  const filterNewRecordingsOnly = useCallback(
    async (discoveredAudioFiles) => {
      const knownSet = await loadLatestSyncedNamesSet(recordings);
      const seenInBatch = new Set();
      const newFiles = [];
      let alreadyInCrmCount = 0;

      for (const file of discoveredAudioFiles) {
        const normName = normalizeRecName(file.name || file.uri);
        if (!normName) continue;
        if (knownSet.has(normName) || seenInBatch.has(normName)) {
          alreadyInCrmCount++;
        } else {
          seenInBatch.add(normName);
          newFiles.push({
            ...file,
            phonePreview: extractPhonePreview(file.name),
          });
        }
      }

      const stats = {
        totalInFolder: discoveredAudioFiles.length,
        alreadyInCrm: alreadyInCrmCount,
        newCount: newFiles.length,
      };
      setFolderStats(stats);
      setStagedFiles(newFiles);
      return { newFiles, stats };
    },
    [loadLatestSyncedNamesSet, recordings]
  );

  /**
   * Re-scans a previously saved directory URI without opening the picker again
   */
  const scanSavedDirectoryUri = useCallback(
    async (dirUri) => {
      if (!dirUri) return [];
      const discoveredAudioFiles = [];
      try {
        if (dirUri.startsWith('content://') && Platform.OS === 'android' && StorageAccessFramework?.readDirectoryAsync) {
          await scanSafRecursively(dirUri, discoveredAudioFiles, 0);
        }
        if (discoveredAudioFiles.length === 0 && FileSystem.Directory) {
          try {
            const dirInst = new FileSystem.Directory(dirUri);
            await scanDirectoryRecursively(dirInst, discoveredAudioFiles, 0);
          } catch (_) {}
        }
      } catch (err) {
        console.warn('[Saved folder scan notice]:', err.message);
      }
      return discoveredAudioFiles;
    },
    []
  );

  // Auto-scan saved folder on initial load so new call count is ready immediately
  useEffect(() => {
    if (selectedFolderUri && !loading && folderStats.totalInFolder === 0 && !scanningFolder) {
      (async () => {
        try {
          setScanningFolder(true);
          const files = await scanSavedDirectoryUri(selectedFolderUri);
          if (files.length > 0) {
            await filterNewRecordingsOnly(files);
          }
        } catch (_) {
        } finally {
          setScanningFolder(false);
        }
      })();
    }
  }, [selectedFolderUri, loading]);

  /**
   * Native Android Directory Picker (ACTION_OPEN_DOCUMENT_TREE)
   * Obtains parent folder reference, displays readable folder label (e.g. Audio),
   * recursively scans folder + subfolders, and automatically filters out existing CRM records.
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

      if (discoveredAudioFiles.length === 0) {
        setFolderStats({ totalInFolder: 0, alreadyInCrm: 0, newCount: 0 });
        setStagedFiles([]);
        setScanningFolder(false);
        Alert.alert(
          'No Audio Files Found',
          `Folder "${folderLabel}" and its subdirectories contain no supported audio files (.m4a, .mp3, .wav, .amr, .aac, .3gp).`
        );
        return;
      }

      // Filter out all recordings already existing in CRM
      const { newFiles, stats } = await filterNewRecordingsOnly(discoveredAudioFiles);
      setScanningFolder(false);

      if (newFiles.length === 0) {
        Alert.alert(
          'All Call Records Already Synced',
          `Folder: "${folderLabel}"\n\n• Total Call Records: ${stats.totalInFolder}\n• Already in CRM: ${stats.alreadyInCrm}\n• New Call Records: 0\n\nAll recordings in this folder are already in the CRM!`
        );
        return;
      }

      // Automatically show the New Call Records preview modal so user can review & click Continue
      setShowNewRecordsModal(true);
    } catch (err) {
      setScanningFolder(false);
      console.error('[Folder Selection Error]:', err);
      Alert.alert('Folder Picker Error', err.message || 'Failed to select folder.');
    }
  };

  /**
   * Triggered when user clicks "Sync Data":
   * Scans/refreshes folder, filters out already-existing CRM records,
   * and shows ONLY the New Call Records on display with a "Continue" button to sync them.
   */
  const handleSyncDataClick = async () => {
    if (syncing || scanningFolder) return;

    if (!selectedFolderUri) {
      Alert.alert('Select Folder First', 'Please click "Select Folder" and choose your call recordings folder.');
      return;
    }

    try {
      setScanningFolder(true);
      const discovered = await scanSavedDirectoryUri(selectedFolderUri);
      if (discovered.length > 0) {
        const { newFiles, stats } = await filterNewRecordingsOnly(discovered);
        setScanningFolder(false);

        if (newFiles.length === 0) {
          Alert.alert(
            'Up to Date',
            `• Total Call Records: ${stats.totalInFolder}\n• Already Existing in CRM: ${stats.alreadyInCrm}\n• New Call Records: 0\n\nNo new call recordings to sync!`
          );
          return;
        }
        setShowNewRecordsModal(true);
        return;
      }
      setScanningFolder(false);

      // Fallback if stagedFiles already populated from handleSelectFolder
      if (stagedFiles.length > 0) {
        setShowNewRecordsModal(true);
      } else {
        Alert.alert(
          'Up to Date',
          `• Total Call Records: ${folderStats.totalInFolder}\n• Already Existing in CRM: ${folderStats.alreadyInCrm}\n• New Call Records: 0\n\nNo new call recordings found to sync.`
        );
      }
    } catch (err) {
      setScanningFolder(false);
      if (stagedFiles.length > 0) {
        setShowNewRecordsModal(true);
      }
    }
  };

  /**
   * Process and sync ONLY the filtered new audio files.
   * Handles SAF content:// URIs safely by copying to app cache when needed.
   */
  const processSyncFiles = async (files) => {
    if (!files || files.length === 0) return;
    setShowNewRecordsModal(false);
    setSyncing(true);
    setSyncSummary(null);

    let syncedCount = 0;
    let alreadySyncedCount = 0;
    let failedCount = 0;
    const total = files.length;
    const newlySyncedNames = [];

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
        if (file.uri && file.uri.startsWith('content://')) {
          const ext = file.name?.includes('.') ? file.name.split('.').pop() : 'm4a';
          const baseName = file.name ? file.name.substring(0, file.name.lastIndexOf('.')) || file.name : `audio_${Date.now()}`;
          const cleanName = `${baseName.replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`;
          const cacheDir = FileSystem.Paths?.cache?.uri || FileSystem.cacheDirectory || `${FileSystem.documentDirectory}temp/`;
          const destinationUri = `${cacheDir.replace(/\/+$/, '')}/${Date.now()}_${cleanName}`;

          try {
            if (typeof FileSystem.copyAsync === 'function') {
              await FileSystem.copyAsync({ from: file.uri, to: destinationUri });
              tempCacheFile = destinationUri;
              uploadableFile = {
                uri: destinationUri,
                name: file.name,
                type: file.type || getAudioMimeType(file.name),
              };
            }
          } catch (copyErr) {
            console.warn('[Cache copy notice, using original URI]:', copyErr.message);
          }
        }

        const res = await recordingsApi.uploadRecording(uploadableFile, {
          recordedAt: new Date().toISOString(),
          phone: file.phonePreview || undefined,
        });

        const norm = normalizeRecName(file.name);
        if (norm) newlySyncedNames.push(norm);

        if (res.alreadySynced) {
          alreadySyncedCount++;
        } else {
          syncedCount++;
        }
      } catch (uploadErr) {
        console.error('[Sync Error on file]:', file.name, uploadErr.message, uploadErr.response?.data || '');
        failedCount++;
      } finally {
        if (tempCacheFile) {
          try {
            if (typeof FileSystem.deleteAsync === 'function') {
              await FileSystem.deleteAsync(tempCacheFile, { idempotent: true });
            }
          } catch (_) {}
        }
      }
    }

    // Persist newly synced names so they are never shown as New again
    if (newlySyncedNames.length > 0) {
      const updatedSet = new Set(crmSyncedNamesSet);
      newlySyncedNames.forEach((n) => updatedSet.add(n));
      setCrmSyncedNamesSet(updatedSet);
      try {
        await AsyncStorage.setItem(SAVED_SYNCED_NAMES_KEY, JSON.stringify([...updatedSet]));
      } catch (_) {}
    }

    // Clear staged new files so they only appear once
    setStagedFiles([]);
    setFolderStats((prev) => ({
      totalInFolder: prev.totalInFolder,
      alreadyInCrm: prev.alreadyInCrm + syncedCount + alreadySyncedCount,
      newCount: 0,
    }));

    setSyncing(false);
    setSyncProgress(null);

    const summary = {
      totalInFolder: folderStats.totalInFolder,
      alreadyInCrm: folderStats.alreadyInCrm,
      discovered: total,
      synced: syncedCount,
      alreadySynced: alreadySyncedCount,
      failed: failedCount,
    };
    setSyncSummary(summary);

    Alert.alert(
      'New Call Records Synced',
      `• Total in Folder: ${folderStats.totalInFolder}\n• Existing in CRM: ${folderStats.alreadyInCrm}\n• New Leads / Records Synced: ${syncedCount}${failedCount > 0 ? `\n• Failed: ${failedCount}` : ''}`,
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
              const delNorm = normalizeRecName(rec.originalName);
              if (delNorm) {
                try {
                  const cachedJson = await AsyncStorage.getItem(SAVED_SYNCED_NAMES_KEY);
                  if (cachedJson) {
                    const arr = JSON.parse(cachedJson).filter((n) => normalizeRecName(n) !== delNorm);
                    await AsyncStorage.setItem(SAVED_SYNCED_NAMES_KEY, JSON.stringify(arr));
                  }
                } catch (_) {}
              }
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
        showBack={false}
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
              ⏳ Scanning & filtering existing CRM records...
            </Text>
          ) : folderStats.totalInFolder > 0 ? (
            <Text style={styles.stagedCountText}>
              Total: {folderStats.totalInFolder} | Existing: {folderStats.alreadyInCrm} | New: {stagedFiles.length}
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
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="folder-open" size={15} color={colors.text} />
            )}
            <Text style={styles.selectFolderBtnText}>
              {scanningFolder ? 'Scanning...' : 'Select Folder'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.syncDataBtn,
              (syncing || scanningFolder || !selectedFolderUri) && styles.syncDataBtnDisabled,
            ]}
            onPress={handleSyncDataClick}
            disabled={syncing || scanningFolder || !selectedFolderUri}
            activeOpacity={0.8}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.syncDataBtnText}>
              {syncing
                ? 'Syncing...'
                : stagedFiles.length > 0
                ? `Sync Data (${stagedFiles.length} New)`
                : 'Sync Data'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Syncing Progress Indicator */}
      {syncing && syncProgress ? (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.progressText}>
            Syncing New Lead ({syncProgress.current}/{syncProgress.total}): {syncProgress.filename}
          </Text>
        </View>
      ) : null}

      {/* Sync Summary Notice */}
      {syncSummary ? (
        <View style={styles.summaryBar}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.summaryText}>
            Total: {syncSummary.totalInFolder || syncSummary.discovered} | Existing Filtered: {syncSummary.alreadyInCrm || 0} | New Leads Synced: {syncSummary.synced}
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

            return (
              <View style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="mic" size={20} color={colors.primary} />
                  </View>

                  <View style={styles.infoCol}>
                    <Text style={styles.leadName} numberOfLines={1}>{leadName}</Text>
                    <Text style={styles.phoneText}>{phone || 'No matched contact'}</Text>
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

      {/* New Call Records Only Preview Modal (Shown Once before Syncing) */}
      <Modal
        visible={showNewRecordsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewRecordsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '82%' }]}>
            <View style={styles.newSyncHeaderRow}>
              <View style={styles.newSyncIconBadge}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { marginBottom: 2 }]}>
                  New Call Records Ready
                </Text>
                <Text style={styles.newSyncSubText}>
                  Already existing CRM records have been automatically filtered out.
                </Text>
              </View>
            </View>

            {/* Stats Summary Breakdown (Total vs Existing vs New) */}
            <View style={styles.statsBreakdownRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxNumber}>{folderStats.totalInFolder}</Text>
                <Text style={styles.statBoxLabel}>Total Records</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statBoxNumber, { color: colors.textSecondary }]}>
                  {folderStats.alreadyInCrm}
                </Text>
                <Text style={styles.statBoxLabel}>In CRM (Filtered)</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxHighlight]}>
                <Text style={[styles.statBoxNumber, { color: colors.accent }]}>
                  {stagedFiles.length}
                </Text>
                <Text style={[styles.statBoxLabel, { color: colors.accent, fontWeight: '700' }]}>
                  New Leads Only
                </Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>
              Showing {stagedFiles.length} New Call Record(s) to Sync:
            </Text>

            <FlatList
              data={stagedFiles}
              keyExtractor={(item, idx) => `${item.name}_${idx}`}
              style={styles.newFilesList}
              renderItem={({ item, index }) => (
                <View style={styles.newFileItem}>
                  <View style={styles.newFileIndexBadge}>
                    <Text style={styles.newFileIndexText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.newFileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.newFilePhone}>
                      {item.phonePreview ? `📞 New Lead: ${item.phonePreview}` : 'Audio Call Record'}
                    </Text>
                  </View>
                  <View style={styles.newLeadTag}>
                    <Text style={styles.newLeadTagText}>NEW</Text>
                  </View>
                </View>
              )}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowNewRecordsModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => processSyncFiles(stagedFiles)}
                disabled={syncing || stagedFiles.length === 0}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSaveText}>
                  Continue (Sync {stagedFiles.length} Only)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 95, // Clearance for bottom navigation bar
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
  newSyncHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  newSyncIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSyncSubText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statsBreakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statBoxHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: colors.accent,
  },
  statBoxNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  statBoxLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  newFilesList: {
    maxHeight: 240,
    marginBottom: 12,
  },
  newFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    gap: 8,
  },
  newFileIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newFileIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  newFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  newFilePhone: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  newLeadTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newLeadTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
  },
});
