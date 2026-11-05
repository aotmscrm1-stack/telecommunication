const crypto = require('crypto');
const User = require('../../database/models/User');
const Attendance = require('../../database/models/Attendance');
const Todo = require('../../database/models/Todo');
const PerformanceTicket = require('../../database/models/PerformanceTicket');
const { getNextTicketNumber } = require('../../database/models/PerformanceTicketSequence');
const { createNotification } = require('../../modules/notifications/notificationService');

/**
 * Executes the universal 10:00 AM IST morning compliance sweep
 * @param {string} dateStr Format: "YYYY-MM-DD"
 * @param {string} workerId Unique token from workerLockManager
 */
async function runMorning10AmCheck(dateStr, workerId = 'system') {
  const cutoff10Am = new Date(`${dateStr}T10:00:00.000+05:30`);
  const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

  const activeEmployees = await User.find({ isActive: { $ne: false } }).select('_id name employeeId department role');
  
  let compliantCount = 0;
  let ticketsGeneratedCount = 0;

  for (const emp of activeEmployees) {
    try {
      // 1. Check for Approved Leave / Exemption for today
      const leaveRecord = await Attendance.findOne({ 
        employeeId: emp._id, 
        date: dateStr, 
        status: 'ON_LEAVE' 
      });
      if (leaveRecord) {
        continue; // Exempt from morning compliance sweep
      }

      // 2. Condition A: Attendance marked on or before 10:00:00.000 AM IST
      const attendance = await Attendance.findOne({
        employeeId: emp._id,
        date: dateStr,
        startTime: { $lte: cutoff10Am }
      });
      const hasAttendance = !!attendance;

      // 3. Condition B: Fresh daily tasks uploaded/assigned on or before 10:00:00.000 AM IST
      const tasks = await Todo.find({
        assignedTo: emp._id,
        $or: [
          { scheduledAt: { $gte: startOfDay, $lte: endOfDay }, createdAt: { $lte: cutoff10Am } },
          { scheduledAt: null, createdAt: { $gte: startOfDay, $lte: cutoff10Am } }
        ]
      }).select('_id title status createdAt');
      const hasTasks = tasks.length > 0;

      // Evaluate 4 possible states
      if (hasAttendance && hasTasks) {
        compliantCount++;
        continue; // Fully compliant
      }

      // Determine Violation Type & Priority
      let triggerType = '';
      let priority = 'medium';
      let title = '';
      let description = '';
      let missingRequirement = '';

      if (!hasAttendance && hasTasks) {
        triggerType = 'ATTENDANCE_NON_COMPLIANCE';
        priority = 'high';
        title = `Morning Attendance Not Marked: ${emp.name}`;
        description = `Employee ${emp.name} (${emp.employeeId || 'ID Pending'}) did not record attendance check-in before the fixed 10:00 AM IST deadline for ${dateStr}. Daily tasks were uploaded.`;
        missingRequirement = 'Attendance check-in missing on or before 10:00:00 AM IST.';
      } else if (hasAttendance && !hasTasks) {
        triggerType = 'DAILY_TASK_SUBMISSION_MISSING';
        priority = 'medium';
        title = `Morning Daily Tasks Missing: ${emp.name}`;
        description = `Employee ${emp.name} (${emp.employeeId || 'ID Pending'}) marked attendance on time for ${dateStr}, but did not upload or receive any daily work tasks in Todo before the fixed 10:00 AM IST deadline.`;
        missingRequirement = 'Fresh daily work tasks not uploaded in Todo before 10:00:00 AM IST.';
      } else {
        // Dual Violation: Both Missing -> STRICTLY ONE COMBINED TICKET
        triggerType = 'MORNING_COMPLIANCE_DUAL_VIOLATION';
        priority = 'critical';
        title = `Dual Morning Non-Compliance (Attendance & Tasks): ${emp.name}`;
        description = `Employee ${emp.name} (${emp.employeeId || 'ID Pending'}) missed BOTH mandatory requirements before the fixed 10:00 AM IST deadline on ${dateStr}: attendance was not marked, and no daily tasks were uploaded.`;
        missingRequirement = 'Both attendance check-in and fresh daily tasks were missing before 10:00:00 AM IST.';
      }

      // Compute Deterministic Database Unique Keys
      const morningComplianceKey = `${emp._id}_${dateStr}`;
      const incidentHash = crypto.createHash('sha256').update(`${emp._id}_${dateStr}_MORNING`).digest('hex');

      // Atomic Ticket Generation (Guaranteed Deduplication)
      let ticket;
      try {
        const ticketNumber = await getNextTicketNumber(dateStr);
        ticket = await PerformanceTicket.create({
          ticketNumber,
          incidentHash,
          morningComplianceKey,
          employee: emp._id,
          employeeCode: emp.employeeId || '',
          employeeName: emp.name,
          department: emp.department || 'General',
          checkpoint: 'CHECKPOINT_1_MORNING_10AM',
          triggerType,
          priority,
          status: 'open',
          incidentDate: dateStr,
          title,
          description,
          missingRequirement,
          relatedAttendance: attendance ? attendance._id : null,
          relatedTasks: tasks.map(t => t._id),
          evidenceSnapshot: {
            checkInRecorded: hasAttendance,
            checkInTime: attendance?.startTime ? new Date(attendance.startTime).toISOString() : null,
            taskCount: tasks.length,
            evaluatedAt: new Date().toISOString()
          },
          timeline: [{
            action: 'auto_generated',
            notes: `Auto-generated during 10:00 AM sweep by worker ${workerId}`,
            timestamp: new Date()
          }]
        });
        ticketsGeneratedCount++;
      } catch (insertErr) {
        if (insertErr.code === 11000) {
          // Unique key constraint prevented duplicate ticket
          ticket = await PerformanceTicket.findOne({ morningComplianceKey });
        } else {
          console.error(`[Morning Sweep Error for ${emp.name}]`, insertErr.message);
        }
      }

      // Idempotent Notification Dispatch
      if (ticket) {
        const notifIdempotency = crypto.createHash('sha256').update(`NOTIF_${emp._id}_${dateStr}_${triggerType}`).digest('hex');
        
        // Notify employee
        await createNotification({
          recipient: emp._id,
          type: 'compliance_alert',
          title: `⚠️ Morning Compliance Alert (${dateStr})`,
          message: description,
          idempotencyKey: notifIdempotency,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            checkpoint: 'CHECKPOINT_1_MORNING_10AM',
            triggerType
          }
        });

        // Notify department managers / admin
        const managers = await User.find({ 
          role: { $in: ['manager', 'admin'] },
          _id: { $ne: emp._id }
        }).select('_id');

        for (const mgr of managers) {
          const mgrIdempotency = crypto.createHash('sha256').update(`NOTIF_MGR_${mgr._id}_${emp._id}_${dateStr}_${triggerType}`).digest('hex');
          await createNotification({
            recipient: mgr._id,
            type: 'compliance_alert',
            title: `📋 Department Compliance Ticket: ${emp.name}`,
            message: `Ticket ${ticket.ticketNumber} issued for ${emp.name}: ${missingRequirement}`,
            idempotencyKey: mgrIdempotency,
            data: {
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber,
              employeeId: emp._id,
              checkpoint: 'CHECKPOINT_1_MORNING_10AM'
            }
          });
        }
      }

    } catch (empErr) {
      console.error(`[Worker error evaluating employee ${emp._id}]`, empErr.message);
    }
  }

  return {
    total: activeEmployees.length,
    compliant: compliantCount,
    tickets: ticketsGeneratedCount
  };
}

module.exports = { runMorning10AmCheck };

