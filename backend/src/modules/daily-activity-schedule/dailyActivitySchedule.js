const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { protect } = require('../../core/middleware/auth');
const User = require('../../database/models/User');
const EmployeeDailyActivitySchedule = require('../../database/models/EmployeeDailyActivitySchedule');

const router = express.Router();

// Safe user fields projection (strictly excludes sensitive fields)
const SAFE_USER_PROJECTION = '_id name firstName lastName displayName email employeeId designation department avatar isActive';

/**
 * Access Evaluation Helpers
 */
function isMD(user) {
  if (!user) return false;
  const d = String(user.designation || '').trim().toUpperCase();
  const email = String(user.email || '').trim().toLowerCase();
  return d === 'MANAGING DIRECTOR' || d === 'MD' || d === 'CEO' || email.includes('ameen');
}

function isHR(user) {
  if (!user) return false;
  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();
  const role = String(user.role || '').trim().toLowerCase();
  const email = String(user.email || '').trim().toLowerCase();

  // Deenaz Shaik is authoritative HR Specialist
  if (email === 'deenaz@aotms.in') return true;

  // HR designation or HR department with manager/admin privileges
  const isHRStaff = d === 'HR' || d.includes('HR') || dept === 'HR';
  return isHRStaff || role === 'admin' || role === 'manager';
}

function isAdmin(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();
  return (
    role === 'admin' ||
    role === 'superadmin' ||
    isMD(user) ||
    d === 'CEO' ||
    d === 'MANAGING DIRECTOR' ||
    d === 'MD' ||
    dept === 'ADMIN' ||
    dept === 'MANAGEMENT'
  );
}

function isManager(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const d = String(user.designation || '').trim().toUpperCase();
  const dept = String(user.department || '').trim().toUpperCase();
  return (
    role === 'manager' ||
    d.includes('MANAGER') ||
    dept.includes('MANAGER') ||
    dept.includes('MANAGEMENT')
  );
}

function canManageSchedules(user) {
  if (!user) return false;
  // All access for Admin and Manager (including MD, CEO, HR Specialist)
  return isAdmin(user) || isManager(user) || isHR(user);
}

function canViewAll(user) {
  if (!user) return false;
  // All access for Admin and Manager (including MD, CEO, HR Specialist)
  return isAdmin(user) || isManager(user) || isHR(user);
}

/**
 * Field-level Diff Calculator for Audit History
 */
function calculateFieldDiffs(previousDoc, updateData) {
  const diffs = [];

  // 1. Working Hours
  if (updateData.workingHours) {
    if (updateData.workingHours.loginTime !== undefined && updateData.workingHours.loginTime !== (previousDoc.workingHours?.loginTime || '')) {
      diffs.push({
        field: 'workingHours.loginTime',
        previousValue: previousDoc.workingHours?.loginTime || '',
        updatedValue: updateData.workingHours.loginTime
      });
    }
    if (updateData.workingHours.logoutTime !== undefined && updateData.workingHours.logoutTime !== (previousDoc.workingHours?.logoutTime || '')) {
      diffs.push({
        field: 'workingHours.logoutTime',
        previousValue: previousDoc.workingHours?.logoutTime || '',
        updatedValue: updateData.workingHours.logoutTime
      });
    }
    if (updateData.workingHours.note !== undefined && updateData.workingHours.note !== (previousDoc.workingHours?.note || '')) {
      diffs.push({
        field: 'workingHours.note',
        previousValue: previousDoc.workingHours?.note || '',
        updatedValue: updateData.workingHours.note
      });
    }
  }

  // 2. Arrays: keyResponsibilities, regularActivities, weeklyResponsibilities
  ['keyResponsibilities', 'regularActivities', 'weeklyResponsibilities'].forEach(key => {
    if (updateData[key] !== undefined) {
      const prevArr = Array.isArray(previousDoc[key]) ? previousDoc[key] : [];
      const newArr = Array.isArray(updateData[key]) ? updateData[key] : [];
      if (JSON.stringify(prevArr) !== JSON.stringify(newArr)) {
        diffs.push({
          field: key,
          previousValue: prevArr,
          updatedValue: newArr
        });
      }
    }
  });

  // 3. Recurring Meetings
  if (updateData.recurringMeetings !== undefined) {
    const prevMeetings = Array.isArray(previousDoc.recurringMeetings) ? previousDoc.recurringMeetings.map(m => ({
      title: m.title,
      days: m.days,
      time: m.time,
      description: m.description
    })) : [];
    const newMeetings = Array.isArray(updateData.recurringMeetings) ? updateData.recurringMeetings.map(m => ({
      title: m.title,
      days: m.days,
      time: m.time,
      description: m.description
    })) : [];

    if (JSON.stringify(prevMeetings) !== JSON.stringify(newMeetings)) {
      diffs.push({
        field: 'recurringMeetings',
        previousValue: prevMeetings,
        updatedValue: newMeetings
      });
    }
  }

  // 4. Additional Information
  if (updateData.additionalInformation !== undefined && updateData.additionalInformation !== (previousDoc.additionalInformation || '')) {
    diffs.push({
      field: 'additionalInformation',
      previousValue: previousDoc.additionalInformation || '',
      updatedValue: updateData.additionalInformation
    });
  }

  // 5. Publish Status
  if (updateData.publishStatus !== undefined && updateData.publishStatus !== previousDoc.publishStatus) {
    diffs.push({
      field: 'publishStatus',
      previousValue: previousDoc.publishStatus,
      updatedValue: updateData.publishStatus
    });
  }

  return diffs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/daily-activity-schedules/me (Current employee's own schedule)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const schedule = await EmployeeDailyActivitySchedule.findOne({ employee: req.user._id })
      .populate('employee', SAFE_USER_PROJECTION)
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    if (!schedule) {
      return res.json({
        ok: true,
        schedule: null,
        status: 'unconfigured',
        message: 'No daily activity schedule has been configured for you yet.'
      });
    }

    // Ambiguous or draft schedules remain unpublished to standard employees
    if (schedule.publishStatus === 'draft' && !canViewAll(req.user)) {
      return res.json({
        ok: true,
        schedule: null,
        status: 'draft',
        message: 'Your activity schedule is currently in draft and being reviewed by HR.'
      });
    }

    if (schedule.publishStatus === 'archived' && !canViewAll(req.user)) {
      return res.json({
        ok: true,
        schedule: null,
        status: 'archived',
        message: 'Your activity schedule is currently archived.'
      });
    }

    return res.json({
      ok: true,
      schedule
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to retrieve personal schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/daily-activity-schedules/staging (Unconfirmed profiles for HR)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/staging', protect, async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. Only HR and Management can review staged profiles.' });
    }

    const stagingPath = path.join(__dirname, 'data', 'unconfirmedStagingData.json');
    if (!fs.existsSync(stagingPath)) {
      return res.json({ ok: true, staging: [] });
    }

    const raw = fs.readFileSync(stagingPath, 'utf8');
    const staging = JSON.parse(raw);

    // Filter out any that have already been created as active schedules in MongoDB
    const activeSchedules = await EmployeeDailyActivitySchedule.find({}).select('employee');
    const createdEmployeeIds = new Set(activeSchedules.map(s => String(s.employee)));

    const pendingStaging = staging.map(item => {
      const isAlreadyCreated = item.candidateUser?.id && createdEmployeeIds.has(String(item.candidateUser.id));
      return {
        ...item,
        isCreatedInDb: isAlreadyCreated
      };
    });

    return res.json({
      ok: true,
      staging: pendingStaging
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to retrieve staging data: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/daily-activity-schedules/staging/:key/confirm (HR Confirms Staging)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/staging/:key/confirm', protect, async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. You do not have permission to confirm schedules.' });
    }

    const stagingPath = path.join(__dirname, 'data', 'unconfirmedStagingData.json');
    if (!fs.existsSync(stagingPath)) {
      return res.status(404).json({ ok: false, message: 'Staging data file not found' });
    }

    const staging = JSON.parse(fs.readFileSync(stagingPath, 'utf8'));
    const item = staging.find(s => s.key === req.params.key);

    if (!item) {
      return res.status(404).json({ ok: false, message: 'Staging item not found' });
    }

    const targetEmployeeId = req.body.employeeId || item.candidateUser?.id;
    if (!targetEmployeeId) {
      return res.status(400).json({ ok: false, message: 'A valid employee reference is required to confirm.' });
    }

    const user = await User.findById(targetEmployeeId);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Target employee not found in database.' });
    }

    const existing = await EmployeeDailyActivitySchedule.findOne({ employee: user._id });
    if (existing) {
      return res.status(400).json({ ok: false, message: `Schedule already exists for ${user.name}. Please edit the existing record.` });
    }

    const scheduleData = {
      employee: user._id,
      workingHours: req.body.workingHours || item.scheduleData.workingHours,
      keyResponsibilities: req.body.keyResponsibilities || item.scheduleData.keyResponsibilities,
      regularActivities: req.body.regularActivities || item.scheduleData.regularActivities,
      weeklyResponsibilities: req.body.weeklyResponsibilities || item.scheduleData.weeklyResponsibilities,
      recurringMeetings: req.body.recurringMeetings || item.scheduleData.recurringMeetings,
      additionalInformation: req.body.additionalInformation !== undefined ? req.body.additionalInformation : item.scheduleData.additionalInformation,
      publishStatus: req.body.publishStatus || 'published',
      isHrConfirmed: true,
      hrConfirmationNote: req.body.hrConfirmationNote || `Confirmed by ${req.user.name || 'HR'} on ${new Date().toLocaleDateString()}`,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      auditHistory: [{
        action: 'confirmed',
        performedBy: req.user._id,
        performedAt: new Date(),
        summary: `Confirmed and created by HR from staged profile (${item.sourceName})`,
        fieldChanges: []
      }]
    };

    const newSchedule = await EmployeeDailyActivitySchedule.create(scheduleData);
    await newSchedule.populate('employee', SAFE_USER_PROJECTION);

    return res.status(201).json({
      ok: true,
      message: `Schedule confirmed and published successfully for ${user.name}`,
      schedule: newSchedule
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to confirm staging item: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/daily-activity-schedules (Directory List for MD & HR)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. You do not have permission to view all schedules.' });
    }

    const { search, department, designation, status, publishStatus } = req.query;

    // Fetch all active employees
    const userQuery = {};
    if (department && department !== 'all') {
      userQuery.department = { $regex: new RegExp(`^${department}$`, 'i') };
    }
    if (designation && designation !== 'all') {
      userQuery.designation = { $regex: new RegExp(`^${designation}$`, 'i') };
    }
    if (search && search.trim()) {
      const rgx = new RegExp(search.trim(), 'i');
      userQuery.$or = [
        { name: rgx },
        { displayName: rgx },
        { employeeId: rgx },
        { email: rgx }
      ];
    }

    const allUsers = await User.find(userQuery).select(SAFE_USER_PROJECTION).sort({ name: 1 });

    // Fetch all schedules
    const scheduleQuery = {};
    if (publishStatus && publishStatus !== 'all') {
      scheduleQuery.publishStatus = publishStatus;
    }

    const schedules = await EmployeeDailyActivitySchedule.find(scheduleQuery)
      .populate('employee', SAFE_USER_PROJECTION)
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    // Build directory by mapping users to schedules
    const scheduleByUserId = new Map();
    schedules.forEach(s => {
      if (s.employee?._id) {
        scheduleByUserId.set(String(s.employee._id), s);
      }
    });

    let directory = allUsers.map(u => {
      const schedule = scheduleByUserId.get(String(u._id)) || null;
      return {
        user: u,
        schedule,
        isConfigured: Boolean(schedule),
        publishStatus: schedule?.publishStatus || 'unconfigured'
      };
    });

    // Filter by configured status if requested
    if (status === 'configured') {
      directory = directory.filter(d => d.isConfigured);
    } else if (status === 'unconfigured') {
      directory = directory.filter(d => !d.isConfigured);
    } else if (status === 'published') {
      directory = directory.filter(d => d.schedule?.publishStatus === 'published');
    } else if (status === 'draft') {
      directory = directory.filter(d => d.schedule?.publishStatus === 'draft');
    } else if (status === 'archived') {
      directory = directory.filter(d => d.schedule?.publishStatus === 'archived');
    }

    return res.json({
      ok: true,
      count: directory.length,
      totalEmployees: allUsers.length,
      configuredCount: schedules.length,
      directory
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to retrieve activity directory: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/daily-activity-schedules/:employeeId (Single employee schedule)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:employeeId', protect, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const isSelf = String(req.user._id) === String(employeeId);

    if (!isSelf && !canViewAll(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. You cannot view another employee\'s schedule.' });
    }

    let query = {};
    if (mongoose.isValidObjectId(employeeId)) {
      query.$or = [{ employee: employeeId }, { _id: employeeId }];
    } else {
      // Find employee by employeeId string (e.g. AOTMS-20)
      const user = await User.findOne({ employeeId });
      if (!user) return res.status(404).json({ ok: false, message: 'Employee not found.' });
      query.employee = user._id;
    }

    const schedule = await EmployeeDailyActivitySchedule.findOne(query)
      .populate('employee', SAFE_USER_PROJECTION)
      .populate('createdBy', 'name email designation avatar')
      .populate('updatedBy', 'name email designation avatar');

    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'No schedule found for this employee.' });
    }

    if (!canViewAll(req.user) && schedule.publishStatus === 'draft') {
      return res.status(403).json({ ok: false, message: 'This schedule is currently in draft and being reviewed by HR.' });
    }

    return res.json({
      ok: true,
      schedule
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to fetch schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/daily-activity-schedules (Create Schedule)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({
        ok: false,
        message: 'Access denied. Only Admin and Manager can create schedules.'
      });
    }

    const { employee, workingHours, keyResponsibilities, regularActivities, weeklyResponsibilities, recurringMeetings, additionalInformation, publishStatus } = req.body;

    if (!employee) {
      return res.status(400).json({ ok: false, message: 'Target employee is required.' });
    }

    const user = await User.findById(employee);
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Target employee does not exist.' });
    }

    const existing = await EmployeeDailyActivitySchedule.findOne({ employee });
    if (existing) {
      return res.status(400).json({
        ok: false,
        message: `An activity schedule already exists for ${user.name} (${user.employeeId || 'ID N/A'}). Please edit the existing schedule.`
      });
    }

    const newSchedule = await EmployeeDailyActivitySchedule.create({
      employee,
      workingHours: workingHours || {},
      keyResponsibilities: Array.isArray(keyResponsibilities) ? keyResponsibilities.filter(Boolean) : [],
      regularActivities: Array.isArray(regularActivities) ? regularActivities.filter(Boolean) : [],
      weeklyResponsibilities: Array.isArray(weeklyResponsibilities) ? weeklyResponsibilities.filter(Boolean) : [],
      recurringMeetings: Array.isArray(recurringMeetings) ? recurringMeetings : [],
      additionalInformation: additionalInformation || '',
      publishStatus: publishStatus || 'published',
      isHrConfirmed: true,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      auditHistory: [{
        action: 'created',
        performedBy: req.user._id,
        performedAt: new Date(),
        summary: `Created by ${req.user.name || 'HR'}`,
        fieldChanges: []
      }]
    });

    await newSchedule.populate('employee', SAFE_USER_PROJECTION);

    return res.status(201).json({
      ok: true,
      message: `Schedule created successfully for ${user.name}`,
      schedule: newSchedule
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to create schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. PUT /api/daily-activity-schedules/:id (Update Schedule with Diff Audit)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({
        ok: false,
        message: 'Access denied. Only Admin and Manager can edit schedules.'
      });
    }

    const schedule = await EmployeeDailyActivitySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'Schedule not found.' });
    }

    const { workingHours, keyResponsibilities, regularActivities, weeklyResponsibilities, recurringMeetings, additionalInformation, publishStatus, summary } = req.body;

    // Calculate detailed before/after diffs
    const diffs = calculateFieldDiffs(schedule, req.body);

    if (workingHours) schedule.workingHours = workingHours;
    if (keyResponsibilities !== undefined) schedule.keyResponsibilities = Array.isArray(keyResponsibilities) ? keyResponsibilities.filter(Boolean) : [];
    if (regularActivities !== undefined) schedule.regularActivities = Array.isArray(regularActivities) ? regularActivities.filter(Boolean) : [];
    if (weeklyResponsibilities !== undefined) schedule.weeklyResponsibilities = Array.isArray(weeklyResponsibilities) ? weeklyResponsibilities.filter(Boolean) : [];
    if (recurringMeetings !== undefined) schedule.recurringMeetings = Array.isArray(recurringMeetings) ? recurringMeetings : [];
    if (additionalInformation !== undefined) schedule.additionalInformation = additionalInformation;
    if (publishStatus !== undefined) schedule.publishStatus = publishStatus;

    schedule.updatedBy = req.user._id;

    if (diffs.length > 0) {
      schedule.auditHistory.push({
        action: 'updated',
        performedBy: req.user._id,
        performedAt: new Date(),
        summary: summary || `Updated ${diffs.length} field(s) by ${req.user.name || 'HR'}`,
        fieldChanges: diffs
      });
    }

    await schedule.save();
    await schedule.populate('employee', SAFE_USER_PROJECTION);
    await schedule.populate('updatedBy', 'name email designation avatar');

    return res.json({
      ok: true,
      message: 'Schedule updated successfully with audit history.',
      schedule,
      modifiedFieldsCount: diffs.length
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to update schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. PATCH /api/daily-activity-schedules/:id/archive (Soft Archive)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/archive', protect, async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. You do not have permission to archive schedules.' });
    }

    const schedule = await EmployeeDailyActivitySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'Schedule not found.' });
    }

    const prev = schedule.publishStatus;
    schedule.publishStatus = 'archived';
    schedule.updatedBy = req.user._id;

    schedule.auditHistory.push({
      action: 'archived',
      performedBy: req.user._id,
      performedAt: new Date(),
      summary: `Archived by ${req.user.name || 'HR'}`,
      fieldChanges: [{
        field: 'publishStatus',
        previousValue: prev,
        updatedValue: 'archived'
      }]
    });

    await schedule.save();
    return res.json({ ok: true, message: 'Schedule archived successfully.', schedule });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to archive schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. PATCH /api/daily-activity-schedules/:id/restore (Restore Archived)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/restore', protect, async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. You do not have permission to restore schedules.' });
    }

    const schedule = await EmployeeDailyActivitySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'Schedule not found.' });
    }

    const prev = schedule.publishStatus;
    schedule.publishStatus = 'published';
    schedule.updatedBy = req.user._id;

    schedule.auditHistory.push({
      action: 'restored',
      performedBy: req.user._id,
      performedAt: new Date(),
      summary: `Restored to published by ${req.user.name || 'HR'}`,
      fieldChanges: [{
        field: 'publishStatus',
        previousValue: prev,
        updatedValue: 'published'
      }]
    });

    await schedule.save();
    return res.json({ ok: true, message: 'Schedule restored successfully.', schedule });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to restore schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. PATCH /api/daily-activity-schedules/:id/publish (Publish Draft)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/publish', protect, async (req, res) => {
  try {
    if (!canManageSchedules(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. You do not have permission to publish schedules.' });
    }

    const schedule = await EmployeeDailyActivitySchedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'Schedule not found.' });
    }

    const prev = schedule.publishStatus;
    schedule.publishStatus = 'published';
    schedule.isHrConfirmed = true;
    schedule.updatedBy = req.user._id;

    schedule.auditHistory.push({
      action: 'published',
      performedBy: req.user._id,
      performedAt: new Date(),
      summary: `Published by ${req.user.name || 'HR'}`,
      fieldChanges: [{
        field: 'publishStatus',
        previousValue: prev,
        updatedValue: 'published'
      }]
    });

    await schedule.save();
    return res.json({ ok: true, message: 'Schedule published successfully.', schedule });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to publish schedule: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. GET /api/daily-activity-schedules/:id/audit-history
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/audit-history', protect, async (req, res) => {
  try {
    if (!canViewAll(req.user)) {
      return res.status(403).json({ ok: false, message: 'Access denied. Audit history is reserved for HR and Management.' });
    }

    const schedule = await EmployeeDailyActivitySchedule.findById(req.params.id)
      .populate('auditHistory.performedBy', 'name email designation avatar');

    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'Schedule not found.' });
    }

    return res.json({
      ok: true,
      auditHistory: schedule.auditHistory || []
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to retrieve audit history: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. DELETE /api/daily-activity-schedules/:id (Hard Delete - Admin & Manager)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isManager(req.user)) {
      return res.status(403).json({ ok: false, message: 'Delete is restricted to Admin and Manager. Please use Archive instead.' });
    }

    const schedule = await EmployeeDailyActivitySchedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ ok: false, message: 'Schedule not found.' });
    }

    return res.json({ ok: true, message: 'Schedule permanently removed.' });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Failed to delete schedule: ' + err.message });
  }
});

module.exports = router;

