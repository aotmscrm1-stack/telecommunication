import { Linking, AppState, Platform, PermissionsAndroid } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as IntentLauncher from 'expo-intent-launcher';
import client, { API_BASE_URL } from '../api/client';
import { triggerLocalCallNotification } from './notificationService';

// Keep track of processed call IDs to prevent duplicate dialing across WS + FCM + Poll
const processedCallIds = new Set();
let lastDialedTimestamp = 0;

/**
 * Normalize phone string into a clean dialable tel: URI
 */
export function formatDialablePhone(rawPhone) {
  if (!rawPhone) return '';
  const cleaned = String(rawPhone)
    .replace(/^p:/i, '')
    .replace(/[^0-9+]/g, '');
  if (!cleaned || cleaned.length < 5) return '';
  return cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/\D/g, '')}`;
}

/**
 * Execute 100% Automatic Zero-Touch Phone Call on Mobile Device
 */
export async function executeZeroTouchCall(payload, options = {}) {
  if (!payload) return false;

  const callId = String(payload.callId || payload.timestamp || '');
  const rawPhone = payload.leadPhone || payload.phone || '';
  const dialNumber = formatDialablePhone(rawPhone);

  if (!dialNumber) {
    console.warn('[AutoCallService] Invalid phone number in call payload:', rawPhone);
    return false;
  }

  // Deduplicate by callId
  if (callId && processedCallIds.has(callId)) {
    return false;
  }

  // Prevent duplicate burst within 2.5 seconds for the exact same phone number
  const now = Date.now();
  if (now - lastDialedTimestamp < 2500 && processedCallIds.has(`phone_${dialNumber}`)) {
    return false;
  }

  if (callId) {
    processedCallIds.add(callId);
  }
  processedCallIds.add(`phone_${dialNumber}`);
  setTimeout(() => {
    processedCallIds.delete(`phone_${dialNumber}`);
  }, 4000);
  lastDialedTimestamp = now;

  // Trigger haptic alert
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {}

  // Show local notification if triggered from WebSocket/poll
  if (!options.fromNotification) {
    triggerLocalCallNotification({
      leadName: payload.leadName || 'Lead',
      leadPhone: dialNumber,
      leadId: payload.leadId,
      callId,
      isMetaLead: payload.isMetaLead,
    }).catch(() => {});
  }

  // Notify UI callback (e.g. AppNavigator banner)
  if (typeof options.onCallTriggered === 'function') {
    try {
      options.onCallTriggered({
        ...payload,
        leadPhone: dialNumber,
      });
    } catch (e) {}
  }

  // Immediately launch direct phone call on Android (ACTION_CALL) with fallback to tel: dialer
  try {
    if (Platform.OS === 'android') {
      try {
        const hasCallPerm = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE
        );
        if (!hasCallPerm) {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CALL_PHONE);
        }
        await IntentLauncher.startActivityAsync('android.intent.action.CALL', {
          data: `tel:${dialNumber}`,
        });
        return true;
      } catch (intentErr) {
        // Fallback to standard tel: URL if direct CALL intent is blocked
        await Linking.openURL(`tel:${dialNumber}`);
        return true;
      }
    }
    await Linking.openURL(`tel:${dialNumber}`);
    return true;
  } catch (err) {
    console.warn('[AutoCallService] Could not open dialer:', err.message);
    return false;
  }
}

/**
 * Build WebSocket URL from API_BASE_URL
 */
function getWebSocketUrl() {
  const base = String(API_BASE_URL || 'https://api.academyoftechmasters.com/api')
    .replace(/\/api\/?$/, '')
    .replace(/\/+$/, '');
  if (base.startsWith('https://')) {
    return base.replace(/^https:\/\//, 'wss://') + '/ws';
  }
  if (base.startsWith('http://')) {
    return base.replace(/^http:\/\//, 'ws://') + '/ws';
  }
  return 'wss://api.academyoftechmasters.com/ws';
}

/**
 * Start real-time Zero-Touch Auto-Call Listener (WebSocket + Fast Foreground Poll)
 */
export function startZeroTouchCallListener({ user, onCallTriggered }) {
  if (!user?._id) return () => {};

  const userIdStr = String(user._id);
  let ws = null;
  let pingTimer = null;
  let reconnectTimer = null;
  let pollTimer = null;
  let isStopped = false;

  const isTargetedForUser = (payload) => {
    if (!payload) return false;
    if (Array.isArray(payload.targetUserIds) && payload.targetUserIds.map(String).includes(userIdStr)) {
      return true;
    }
    if (payload.callerId && String(payload.callerId) === userIdStr) {
      return true;
    }
    if (payload.triggeredById && String(payload.triggeredById) === userIdStr) {
      return true;
    }
    return false;
  };

  const connectWebSocket = () => {
    if (isStopped) return;
    try {
      const wsUrl = getWebSocketUrl();
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {}
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.event === 'call:initiate' && msg?.payload) {
            if (isTargetedForUser(msg.payload)) {
              executeZeroTouchCall(msg.payload, { onCallTriggered });
            }
          }
        } catch (err) {
          // ignore non-JSON messages
        }
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (!isStopped) {
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        }
      };
    } catch (err) {
      if (!isStopped) {
        reconnectTimer = setTimeout(connectWebSocket, 4000);
      }
    }
  };

  // Fast foreground poll fallback (every 2.5s while app is open)
  const checkPendingCalls = async () => {
    if (isStopped || AppState.currentState !== 'active') return;
    try {
      const res = await client.get('/leads/pending-call');
      const pending = res?.data?.pendingCall;
      if (pending && pending.leadPhone) {
        executeZeroTouchCall(pending, { onCallTriggered });
      }
    } catch (err) {
      // silent fallback
    }
  };

  connectWebSocket();
  checkPendingCalls();
  pollTimer = setInterval(checkPendingCalls, 2500);

  const appStateSub = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      checkPendingCalls();
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        connectWebSocket();
      }
    }
  });

  return () => {
    isStopped = true;
    if (pingTimer) clearInterval(pingTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollTimer) clearInterval(pollTimer);
    if (appStateSub) appStateSub.remove();
    if (ws) {
      try {
        ws.close();
      } catch (e) {}
    }
  };
}

