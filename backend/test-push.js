/**
 * test-push.js
 *
 * Diagnostic script to verify FCM Push Notification delivery to an employee mobile device.
 *
 * Usage:
 *   node test-push.js <employee_email>
 * Example:
 *   node test-push.js caller1@aotms.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/database/models/User');
const { sendFcmNotification } = require('./src/modules/notifications/fcmService');

async function testPush() {
  const targetEmail = process.argv[2];

  if (!targetEmail) {
    console.log('\n❌ Please provide an employee email address.\nUsage: node test-push.js <employee_email>\nExample: node test-push.js caller1@aotms.com\n');
    process.exit(1);
  }

  console.log(`\n🔍 Connecting to MongoDB to check FCM token for: ${targetEmail}...`);
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email: targetEmail.toLowerCase().trim() });
  if (!user) {
    console.log(`❌ No user found in database with email: ${targetEmail}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✓ User found: ${user.name} (${user.role})`);
  console.log(`📱 FCM Device Token: ${user.fcmToken ? user.fcmToken.slice(0, 25) + '...' : '(NO TOKEN REGISTERED YET)'}`);
  console.log(`⏱️ Last Token Sync: ${user.fcmTokenUpdatedAt || 'Never'}\n`);

  if (!user.fcmToken) {
    console.log('⚠️ This user has not registered a mobile device token yet.');
    console.log('👉 Please open the AOTMS Mobile App on the Android phone and log in as this user to register the device token.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('🚀 Sending test FCM push notification...');
  const success = await sendFcmNotification({
    token: user.fcmToken,
    title: '🔔 AOTMS Test Notification',
    body: `Hello ${user.name}! Your mobile push notifications are working perfectly.`,
    data: {
      type: 'lead_assigned',
      leadId: 'test-12345'
    },
    userId: user._id
  });

  if (success) {
    console.log('✅ FCM Push Notification successfully delivered to Google Firebase!');
    console.log('📲 Check the Android phone lock screen / notification tray.\n');
  } else {
    console.log('ℹ️ Push was processed by the notification engine.');
  }

  await mongoose.disconnect();
}

testPush().catch(err => {
  console.error('❌ Error testing push notification:', err.message);
  process.exit(1);
});
