import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

let isCheckingUpdate = false;

/**
 * Check for Expo Over-The-Air (OTA) Updates and download in background
 */
export async function checkAndFetchOtaUpdate({ onUpdateReady } = {}) {
  if (__DEV__ || isCheckingUpdate) return false;
  try {
    if (!Updates.isEnabled) return false;
    isCheckingUpdate = true;

    const update = await Updates.checkForUpdateAsync();
    if (update?.isAvailable) {
      const fetched = await Updates.fetchUpdateAsync();
      if (fetched?.isNew) {
        if (typeof onUpdateReady === 'function') {
          onUpdateReady();
        } else {
          await Updates.reloadAsync();
        }
        return true;
      }
    }
    return false;
  } catch (err) {
    // Ignore update check warnings in dev or offline
    return false;
  } finally {
    isCheckingUpdate = false;
  }
}

/**
 * Reload the app immediately to apply the downloaded OTA update
 */
export async function applyOtaUpdateNow() {
  try {
    await Updates.reloadAsync();
  } catch (err) {
    console.warn('[OTAUpdateService] Reload notice:', err.message);
  }
}

/**
 * Start automatic OTA update checker on app launch and foreground resume
 */
export function startOtaUpdateListener({ onUpdateReady } = {}) {
  checkAndFetchOtaUpdate({ onUpdateReady });

  const sub = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      checkAndFetchOtaUpdate({ onUpdateReady });
    }
  });

  return () => {
    sub.remove();
  };
}

