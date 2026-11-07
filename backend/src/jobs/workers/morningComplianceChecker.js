const crypto = require('crypto');
const User = require('../../database/models/User');
const Attendance = require('../../database/models/Attendance');
const Todo = require('../../database/models/Todo');
const PerformanceTicket = require('../../database/models/PerformanceTicket');
const EmployeePerformanceDaily = require('../../database/models/EmployeePerformanceDaily');
const { getNextTicketNumber } = require('../../database/models/PerformanceTicketSequence');
const { createNotification } = require('../../modules/notifications/notificationService');

/**
 * Calculates consecutive working-day violations looking backward from dateStr.
 * Skips Sundays and approved leave days.
 * Resets to 1 if previous working day was compliant.
 */
async function calculateConsecutiveViolations(employeeId, dateStr) {
  let streak = 1;
  let curr = new Date(`${dateStr}T12:00:00.000+05:30`);

  for (let i = 1; i <= 30; i++) {
    curr.setDate(curr.getDate() - 1);
    const dayOfWeek = curr.getDay(); // 0 is Sunday
    if (dayOfWeek === 0) continue; // Skip Sunday (weekend)

    const prevDateStr = curr.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Check if on approved leave
    const onLeave = await Attendance.findOne({
      employeeId,
      date: prevDateStr,
      status: 'ON_LEAVE'
    });
    if (onLeave) continue; // Skip approved leave

    // Check if there was a morning ticket on this prior working day
    const prevTicket = await PerformanceTicket.findOne({
      employee: employeeId,
      incidentDate: prevDateStr,
      checkpoint: 'CHECKPOINT_1_MORNING_10AM'
    }).select('consecutiveCount priority status');

    if (prevTicket) {
      if (typeof prevTicket.consecutiveCount === 'number' && prevTicket.consecutiveCount > 0) {
        return prevTicket.consecutiveCount + 1;
      }
      streak++;
    } else {
      // Prior working day had NO ticket -> compliant day, streak resets!
      break;
    }
  }

  return streak;
}

/**
 * Executes the universal 10:00 AM IST morning compliance sweep with Progressive 3-Level Escalation
 * @param {string} dateStr Format: "YYYY-MM-DD"
 * @param {string} workerId Unique token from workerLockManager
 */
async function runMorning10AmCheck(dateStr, workerId = 'system') {
  const cutoff10Am = new Date(`${dateStr}T10:00:00.000+05:30`);
  const startOfDay = new Date(`${dateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+05:30`);

  // Check if dateStr is Sunday (company weekend)
  const evalDate = new Date(`${dateStr}T12:00:00.000+05:30`);
  if (evalDate.getDay() === 0) {
    console.log(`[Morning Compliance Sweep] ${dateStr} is Sunday (Weekend). Skipping sweep.`);
    return { total: 0, compliant: 0, tickets: 0, message: 'Sunday Weekend' };
  }

  const activeEmployees = await User.find({ isActive: { $ne: false } }).select('_id name employeeId department role email');
  
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

      // 3. Condition B: Daily tasks uploaded/assigned on or before 10:00:00.000 AM IST
      // Handles tasks created on current day as well as tasks created in advance on prior days
      const tasks = await Todo.find({
        $and: [
          {
            $or: [
              { assignedTo: emp._id },
              { createdBy: emp._id }
            ]
          },
          {
            createdAt: { $lte: cutoff10Am }
          },
          {
            $or: [
              { scheduledAt: { $gte: startOfDay, $lte: endOfDay } },
              { dueDate: { $gte: startOfDay, $lte: endOfDay } },
              { createdAt: { $gte: startOfDay, $lte: cutoff10Am } },
              { completedAt: { $gte: startOfDay, $lte: cutoff10Am } },
              { status: { $in: ['upcoming', 'pending', 'in_progress'] } }
            ]
          }
        ]
      }).select('_id title status createdAt scheduledAt dueDate completedAt');
      const hasTasks = tasks.length > 0;

      // Fully Compliant State: Issue/Maintain Official Green Ticket
      if (hasAttendance && hasTasks) {
        compliantCount++;

        // Reset active streak on daily record
        await EmployeePerformanceDaily.findOneAndUpdate(
          { employee: emp._id, date: dateStr },
          { $set: { activeStreak: 0 } },
          { upsert: true }
        ).catch(() => {});

        // Clean up any stale violation warning ticket for today if it existed
        await PerformanceTicket.deleteMany({
          employee: emp._id,
          incidentDate: dateStr,
          priority: { $ne: 'green' },
          triggerType: { $ne: 'MORNING_COMPLIANCE_PASSED' }
        }).catch(() => {});

        // Guarantee an official Green Clearance Ticket in the database
        const morningComplianceKey = `${emp._id}_${dateStr}`;
        const incidentHash = crypto.createHash('sha256').update(`${emp._id}_${dateStr}_MORNING_PASS`).digest('hex');
        const existingGreenTicket = await PerformanceTicket.findOne({
          employee: emp._id,
          incidentDate: dateStr,
          priority: 'green'
        });

        if (!existingGreenTicket) {
          try {
            const ticketNumber = await getNextTicketNumber(dateStr);
            await PerformanceTicket.create({
              ticketNumber,
              incidentHash,
              morningComplianceKey,
              employee: emp._id,
              employeeCode: emp.employeeId || '',
              employeeName: emp.name,
              department: emp.department || 'General',
              checkpoint: 'CHECKPOINT_1_MORNING_10AM',
              triggerType: 'MORNING_COMPLIANCE_PASSED',
              priority: 'green',
              status: 'cleared',
              escalationLevel: 0,
              consecutiveCount: 0,
              incidentDate: dateStr,
              title: `[GREEN TICKET] 100% Morning Compliant: ${emp.name}`,
              description: `Employee ${emp.name} (${emp.employeeId || 'ID Pending'}) passed both morning compliance requirements on ${dateStr}: Check-in recorded at ${attendance?.startTime ? new Date(attendance.startTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '10:00 AM'} and ${tasks.length} active/advance daily tasks in place before 10:00 AM IST.`,
              relatedAttendance: attendance ? attendance._id : null,
              relatedTasks: tasks.map(t => t._id),
              evidenceSnapshot: {
                checkInRecorded: true,
                checkInTime: attendance?.startTime ? new Date(attendance.startTime).toISOString() : null,
                taskCount: tasks.length,
                consecutiveCount: 0,
                evaluatedAt: new Date().toISOString()
              },
              timeline: [{
                action: 'green_clearance_issued',
                notes: `100% Morning Compliance Clearance verified during 10:00 AM sweep by ${workerId}`,
                timestamp: new Date()
              }]
            });
          } catch (greenErr) {
            // Deduplication caught by unique index
          }
        }
        continue;
      }

      // If employee failed compliance, delete any stale green ticket for today
      await PerformanceTicket.deleteMany({
        employee: emp._id,
        incidentDate: dateStr,
        priority: 'green'
      }).catch(() => {});

      // Calculate Consecutive Violation Working Days
      const consecutiveCount = await calculateConsecutiveViolations(emp._id, dateStr);

      // Determine Violation Type
      let triggerType = '';
      let violationLabel = '';
      let missingRequirement = '';

      if (!hasAttendance && hasTasks) {
        triggerType = 'ATTENDANCE_NON_COMPLIANCE';
        violationLabel = 'Attendance Not Marked';
        missingRequirement = 'Attendance check-in missing on or before 10:00:00 AM IST.';
      } else if (hasAttendance && !hasTasks) {
        triggerType = 'DAILY_TASK_SUBMISSION_MISSING';
        violationLabel = 'Daily Tasks Missing';
        missingRequirement = 'Fresh daily work tasks not uploaded in Todo before 10:00:00 AM IST.';
      } else {
        // Dual Violation: Both Missing -> STRICTLY ONE COMBINED TICKET
        triggerType = 'MORNING_COMPLIANCE_DUAL_VIOLATION';
        violationLabel = 'Dual Non-Compliance (Attendance & Tasks)';
        missingRequirement = 'Both attendance check-in and fresh daily tasks were missing before 10:00:00 AM IST.';
      }

      // Determine Progressive Priority Level & Correction Deadline
      let priority = 'orange'; // Level 1
      let escalationLevel = 1;
      let deadlineHours = 72; // 72 hours for Level 1 Warning
      let levelTitlePrefix = '[ORANGE WARNING]';

      if (consecutiveCount >= 5) {
        priority = 'critical'; // Level 3 Critical Escalation
        escalationLevel = 3;
        deadlineHours = 24;
        levelTitlePrefix = `[CRITICAL ESCALATION — Day ${consecutiveCount}]`;
      } else if (consecutiveCount >= 3) {
        priority = 'red'; // Level 2 Red Escalation
        escalationLevel = 2;
        deadlineHours = 48;
        levelTitlePrefix = `[RED ESCALATION — Day ${consecutiveCount}]`;
      }

      const correctionDeadline = new Date(Date.now() + deadlineHours * 3600 * 1000);
      const title = `${levelTitlePrefix} ${violationLabel}: ${emp.name}`;
      const description = `Employee ${emp.name} (${emp.employeeId || 'ID Pending'}) failed morning compliance on ${dateStr}. Missing: ${missingRequirement} This is consecutive violation day #${consecutiveCount}.`;

      // Deterministic Database Unique Keys for Deduplication
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
          escalationLevel,
          consecutiveCount,
          correctionDeadline,
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
            consecutiveCount,
            evaluatedAt: new Date().toISOString()
          },
          timeline: [{
            action: 'auto_generated',
            notes: `Auto-generated: Level ${escalationLevel} (${priority.toUpperCase()}) ticket for consecutive day #${consecutiveCount} during 10:00 AM sweep by ${workerId}`,
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
        const notifIdempotency = crypto.createHash('sha256').update(`NOTIF_${emp._id}_${dateStr}_${triggerType}_${escalationLevel}`).digest('hex');
        
        // Notify employee
        await createNotification({
          recipient: emp._id,
          type: 'compliance_alert',
          title: `⚠️ ${levelTitlePrefix} Compliance Alert (${dateStr})`,
          message: description,
          idempotencyKey: notifIdempotency,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            checkpoint: 'CHECKPOINT_1_MORNING_10AM',
            triggerType,
            priority,
            consecutiveCount
          }
        });

        // If Level 2 (Red) or Level 3 (Critical), notify HR, Manager & MD
        const rolesToNotify = escalationLevel >= 3 
          ? ['admin', 'manager', 'hr'] 
          : ['manager', 'admin'];

        const managers = await User.find({ 
          role: { $in: rolesToNotify },
          _id: { $ne: emp._id }
        }).select('_id');

        for (const mgr of managers) {
          const mgrIdempotency = crypto.createHash('sha256').update(`NOTIF_MGR_${mgr._id}_${emp._id}_${dateStr}_${escalationLevel}`).digest('hex');
          await createNotification({
            recipient: mgr._id,
            type: 'compliance_alert',
            title: `📋 ${levelTitlePrefix}: ${emp.name} (${emp.department})`,
            message: `Ticket ${ticket.ticketNumber} (${priority.toUpperCase()} - Day #${consecutiveCount}): ${missingRequirement}`,
            idempotencyKey: mgrIdempotency,
            data: {
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber,
              employeeId: emp._id,
              checkpoint: 'CHECKPOINT_1_MORNING_10AM',
              priority
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

module.exports = { runMorning10AmCheck, calculateConsecutiveViolations };
