const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const fs = require('fs');
const path = require('path');
const User = require('../../database/models/User');

let firebaseApp = null;
let messagingInstance = null;

/**
 * Initialize Firebase Admin SDK using modern firebase-admin v14+ modular API
 */
function initFirebase() {
  if (firebaseApp && messagingInstance) {
    return true;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    messagingInstance = getMessaging(firebaseApp);
    return true;
  }

  try {
    let serviceAccount = null;

    // 1. Check FIREBASE_SERVICE_ACCOUNT_JSON in environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (parseErr) {
        console.warn('[FCM Service] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
      }
    }

    // 2. Check FIREBASE_SERVICE_ACCOUNT_BASE64 in environment
    if (!serviceAccount && process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      try {
        const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } catch (base64Err) {
        console.warn('[FCM Service] Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64:', base64Err.message);
      }
    }

    // 3. Check local candidate paths
    if (!serviceAccount) {
      const candidatePaths = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
        path.resolve(__dirname, '../../../config/serviceAccountKey.json'),
        path.resolve(process.cwd(), 'config/serviceAccountKey.json'),
        path.resolve(process.cwd(), 'src/config/serviceAccountKey.json'),
      ].filter(Boolean);

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
          break;
        }
      }
    }

    if (!serviceAccount) {
      console.warn('[FCM Service] Firebase service account credentials not found. Push notifications will be logged.');
      return false;
    }

    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'telecommunication-77ecc',
    });

    messagingInstance = getMessaging(firebaseApp);
    console.log(`[FCM Service] ✓ Firebase Admin v14 initialized successfully for project: ${serviceAccount.project_id}`);
    return true;
  } catch (err) {
    console.warn('[FCM Service] Initialization warning:', err.message);
    return false;
  }
}

/**
 * Send FCM Push Notification to employee mobile device
 *
 * @param {Object} options
 * @param {string} options.token - Native FCM device token
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Custom payload data
 * @param {string} options.userId - User ID for automatic cleanup if token expired
 */
async function sendFcmNotification({ token, title, body, data = {}, userId = null }) {
  if (!token) return false;

  const initialized = initFirebase();
  if (!initialized || !messagingInstance) {
    console.log(`[FCM Push Simulated] Title: "${title}", Body: "${body}", Target: ${token.slice(0, 10)}...`);
    return false;
  }

  // Convert all data attributes to string values (FCM requirement)
  const cleanData = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) {
      cleanData[k] = String(v);
    }
  }

  const message = {
    token: token.trim(),
    notification: {
      title: title || 'AOTMS CRM Alert',
      body: body || 'You have a new update.',
    },
    data: cleanData,
    android: {
      priority: 'high',
      notification: {
        channelId: 'crm_notifications',
        sound: 'default',
        color: '#174EA6',
        icon: 'ic_notification',
      },
    },
  };

  try {
    const response = await messagingInstance.send(message);
    console.log(`[FCM Push Delivered] Message ID: ${response}`);
    return true;
  } catch (error) {
    console.warn('[FCM Push Delivery Notice]:', error.message);

    // Handle invalid or expired token cleanup
    if (
      userId &&
      (error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered')
    ) {
      try {
        await User.findByIdAndUpdate(userId, { fcmToken: '' });
        console.log(`[FCM Token Cleanup] Removed expired FCM token for user: ${userId}`);
      } catch (cleanErr) {}
    }

    return false;
  }
}

module.exports = {
  initFirebase,
  sendFcmNotification,
};
