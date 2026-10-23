import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

const FCM_TOKEN_STORAGE_KEY = 'aotms_fcm_token';

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure Android notification channels with high priority heads-up sound & vibration
 */
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('crm_notifications', {
        name: 'CRM Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#174EA6',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    } catch (err) {
      console.warn('[NotificationService] Channel setup notice:', err.message);
    }
  }
}

/**
 * Request notification permissions and register native FCM token with the backend
 */
export async function registerForPushNotificationsAsync() {
  await setupNotificationChannels();

  if (!Device.isDevice) {
    console.log('[NotificationService] Push notifications require a physical device.');
    return null;
  }

  try {
    // 1. Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 2. Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NotificationService] Notification permission not granted');
      return null;
    }

    // 3. Obtain native FCM Registration Token directly from device
    let token = null;
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData?.data;
    } catch (tokenErr) {
      console.warn('[NotificationService] Native FCM token retrieval notice:', tokenErr.message);
    }

    if (!token) {
      return null;
    }

    // 4. Send token to backend
    const res = await client.post('/users/fcm-token', {
      token,
      platform: Platform.OS,
    });

    if (res?.data?.ok || res?.status === 200) {
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      console.log('[NotificationService] ✓ FCM device token registered successfully with backend:', token.slice(0, 15) + '...');
    }

    return token;
  } catch (error) {
    console.warn('[NotificationService] Failed to register push token:', error?.response?.data || error.message);
    return null;
  }
}

/**
 * Unregister device token upon user logout
 */
export async function unregisterPushNotificationsAsync() {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (token) {
      await client.delete('/users/fcm-token').catch(() => {});
      await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      console.log('[NotificationService] FCM token removed on logout');
    }
  } catch (err) {
    console.warn('[NotificationService] Error during token unregistration:', err.message);
  }
}
