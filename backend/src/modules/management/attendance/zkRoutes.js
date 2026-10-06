const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../../core/middleware/auth');
const zkService = require('../../../integrations/zkteco/zkService');

/**
 * POST /api/attendance/zk/test-connection
 * Test connection to ZKTeco Biometric device
 */
router.post('/test-connection', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { ip, port, timeout } = req.body;
    const targetIp = ip || process.env.ZK_DEVICE_IP || '192.168.1.106';
    const targetPort = parseInt(port, 10) || parseInt(process.env.ZK_DEVICE_PORT, 10) || 4370;

    const result = await zkService.connectDevice(targetIp, targetPort, timeout);
    return res.json({
      message: `Successfully connected to ZKTeco device at ${targetIp}:${targetPort}`,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/attendance/zk/sync
 * Manually trigger biometric attendance log sync to CRM Attendance database
 */
router.post('/sync', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const { ip, port } = req.body;
    const targetIp = ip || process.env.ZK_DEVICE_IP || '192.168.1.106';
    const targetPort = parseInt(port, 10) || parseInt(process.env.ZK_DEVICE_PORT, 10) || 4370;

    const result = await zkService.syncAttendanceLogs(targetIp, targetPort);
    return res.json({
      message: `Biometric attendance logs synced. Synced: ${result.synced}, Skipped: ${result.skipped}, Total: ${result.total}`,
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/attendance/zk/users
 * Retrieve list of biometric users on the ZKTeco device
 */
router.get('/users', protect, authorize('admin', 'hr', 'manager'), async (req, res) => {
  try {
    const targetIp = req.query.ip || process.env.ZK_DEVICE_IP || '192.168.1.106';
    const targetPort = parseInt(req.query.port, 10) || parseInt(process.env.ZK_DEVICE_PORT, 10) || 4370;

    const users = await zkService.getDeviceUsers(targetIp, targetPort);
    return res.json({
      total: users.length,
      users,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
