const ZKRaw = require('zk-attendance-sdk');
const ZKAttendanceClient = ZKRaw.default || ZKRaw;
const Attendance = require('../../database/models/Attendance');
const User = require('../../database/models/User');
const { broadcastWebSocketEvent } = require('../../app/websocket');

/**
 * ZKTeco Biometric Fingerprint Attendance Integration Service
 */

let activeClient = null;

function getClient(ip = process.env.ZK_DEVICE_IP || '192.168.1.106', port = parseInt(process.env.ZK_DEVICE_PORT, 10) || 4370, timeout = 5000) {
  return new ZKAttendanceClient(ip, port, timeout);
}

/**
 * Test & Connect to ZKTeco Biometric Device
 */
async function connectDevice(ip, port, timeout) {
  const client = getClient(ip, port, timeout);
  try {
    await client.createSocket();
    const info = await client.getInfo();
    const serial = await client.getSerialNumber().catch(() => 'N/A');
    const deviceTime = await client.getTime().catch(() => new Date());

    activeClient = client;
    return {
      connected: true,
      connectionType: client.getConnectionType ? client.getConnectionType() : 'tcp',
      info,
      serial,
      deviceTime,
    };
  } catch (err) {
    console.error('[ZKDevice Connect Error]:', err.message);
    throw new Error(`Failed to connect to ZKTeco device at ${ip}:${port} — ${err.message}`);
  }
}

/**
 * Fetch and Sync Biometric Device Attendance Logs to CRM Database
 */
async function syncAttendanceLogs(ip, port) {
  const client = getClient(ip, port);
  await client.createSocket();

  try {
    const logsRes = await client.getAttendances();
    const rawLogs = Array.isArray(logsRes?.data) ? logsRes.data : (Array.isArray(logsRes) ? logsRes : []);
    let synced = 0;
    let skipped = 0;

    for (const log of rawLogs) {
      const deviceUserId = String(log.userId || log.deviceUserId || log.uid || '').trim();
      const attTime = new Date(log.attTime || log.timestamp || log.recordTime);

      if (!deviceUserId || isNaN(attTime.getTime())) {
        skipped++;
        continue;
      }

      // Map device user ID or employee code to CRM User
      const user = await User.findOne({
        $or: [
          { employeeId: deviceUserId },
          { employeeCode: deviceUserId },
          { phone: deviceUserId },
          { name: new RegExp('^' + deviceUserId + '$', 'i') },
        ],
      }).lean();

      const employeeId = user?._id || new Object();
      const employeeName = user?.name || `Biometric User ${deviceUserId}`;
      const employeeCode = user?.employeeCode || deviceUserId;

      const dateStr = attTime.toISOString().split('T')[0];
      const dayStr = attTime.toLocaleDateString('en-US', { weekday: 'long' });

      let record = await Attendance.findOne({ employeeCode, date: dateStr });
      if (!record && user) {
        record = await Attendance.findOne({ employeeId: user._id, date: dateStr });
      }

      if (!record) {
        await Attendance.create({
          employeeId: user ? user._id : undefined,
          employeeName,
          employeeCode,
          date: dateStr,
          day: dayStr,
          startTime: attTime,
          status: 'ON_DUTY',
          deviceInfo: {
            platform: 'ZKTeco Biometric Device',
            userAgent: `ZK-Device-${ip}`,
          },
          notes: `Synced from ZKTeco Biometric Device (${attTime.toLocaleTimeString()})`,
        });
        synced++;
      } else {
        // Update check-out / end time if punch is later than current startTime
        if (attTime > record.startTime && (!record.endTime || attTime > record.endTime)) {
          record.endTime = attTime;
          record.status = 'COMPLETED';
          const durationSec = Math.floor((attTime.getTime() - record.startTime.getTime()) / 1000);
          record.durationSeconds = durationSec;
          record.actualWorkSeconds = Math.max(0, durationSec - (record.totalBreakSeconds || 0));
          await record.save();
          synced++;
        }
      }
    }

    await client.disconnect().catch(() => {});
    return { synced, skipped, total: rawLogs.length };
  } catch (err) {
    await client.disconnect().catch(() => {});
    throw err;
  }
}

/**
 * Start Real-Time Attendance Event Listener from ZKTeco Device
 */
async function startRealTimeLogs(ip, port, onLogReceived) {
  const client = getClient(ip, port);
  await client.createSocket();

  await client.getRealTimeLogs(async (event) => {
    console.log('[ZK Realtime Punch Event]:', event);

    const deviceUserId = String(event.userId || event.deviceUserId || '').trim();
    const attTime = new Date(event.attTime || Date.now());

    // Broadcast WebSocket live punch event for real-time dashboard listeners
    broadcastWebSocketEvent('attendance:live_punch', {
      deviceUserId,
      timestamp: attTime,
      rawEvent: event,
    });

    if (typeof onLogReceived === 'function') {
      onLogReceived(event);
    }
  });

  return { listening: true, ip, port };
}

/**
 * Retrieve All Users from ZKTeco Device
 */
async function getDeviceUsers(ip, port) {
  const client = getClient(ip, port);
  await client.createSocket();
  try {
    const usersRes = await client.getUsers();
    await client.disconnect().catch(() => {});
    return Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : []);
  } catch (err) {
    await client.disconnect().catch(() => {});
    throw err;
  }
}

module.exports = {
  connectDevice,
  syncAttendanceLogs,
  startRealTimeLogs,
  getDeviceUsers,
};
