# AOTMS CRM — Employee Performance Tracking & Automatic Ticket Generation Module
## Enterprise Architecture Specification, Core Business Compliance Engine & Audit System

> **Document Version**: 2.4.0 — Canonical Business Specification with Fixed 10:00 AM Universal Deadline & Before-Logout Task Closure  
> **Status**: Approved for Engineering Execution  
> **Target Platform**: AOTMS Telecommunication Web CRM Portal & Mobile Backend (`backend/` & `frontend/`)  
> **Central Business Principle**:  
> **EVERY EMPLOYEE MUST MARK ATTENDANCE AND UPLOAD DAILY TASKS BY 10:00 AM IST, REGARDLESS OF LOGIN TIME. EVERY EMPLOYEE MUST UPDATE THEIR TASK STATUSES BEFORE LOGOUT.**

---

## 📑 Table of Contents
1. [Core Business Model & Two Distinct Compliance Checkpoints](#1-core-business-model--two-distinct-compliance-checkpoints)
2. [Existing CRM Codebase Audit & Verified Source Mappings](#2-existing-crm-codebase-audit--verified-source-mappings)
3. [Checkpoint 1: Universal 10:00 AM Morning Compliance Engine](#3-checkpoint-1-universal-1000-am-morning-compliance-engine)
4. [Checkpoint 2: Mandatory Before-Logout Task Status Closure](#4-checkpoint-2-mandatory-before-logout-task-status-closure)
5. [Database Architecture, Sparse Deduplication & Mongoose Schemas](#5-database-architecture-sparse-deduplication--mongoose-schemas)
6. [Late Corrections, Status Transitions & Audit History](#6-late-corrections-status-transitions--audit-history)
7. [Remote Work (WFH), Leave, Holidays & Exceptions](#7-remote-work-wfh-leave-holidays--exceptions)
8. [Complete 5-Pillar Performance Scoring System](#8-complete-5-pillar-performance-scoring-system)
9. [Department-Wise KPI Configuration Matrix](#9-department-wise-kpi-configuration-matrix)
10. [Backend REST API Specification & Architecture](#10-backend-rest-api-specification--architecture)
11. [Frontend Components & Modal Warning Architecture](#11-frontend-components--modal-warning-architecture)
12. [Background Scheduler, Distributed Locking & Recovery](#12-background-scheduler-distributed-locking--recovery)
13. [Real-Time Notifications, Idempotency & Escalation Matrix](#13-real-time-notifications-idempotency--escalation-matrix)
14. [Comprehensive Multi-Scenario Testing Matrix](#14-comprehensive-multi-scenario-testing-matrix)
15. [Verified List of Existing Codebase Files to Modify](#15-verified-list-of-existing-codebase-files-to-modify)
16. [Final Phased Implementation Roadmap](#16-final-phased-implementation-roadmap)

---

## 1. Core Business Model & Two Distinct Compliance Checkpoints

The AOTMS Employee Performance Tracking & Automatic Ticket Generation system is governed by two independent, non-overlapping compliance checkpoints:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        AOTMS TWO-CHECKPOINT COMPLIANCE ARCHITECTURE                    │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ CHECKPOINT 1: FIXED 10:00 AM IST SWEEP   │ CHECKPOINT 2: BEFORE LOGOUT / END ATTENDANCE│    
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Fixed deadline for EVERY active staff  │ • Enforced dynamically when employee        │
│ • Attendance marked by 10:00 AM          │   attempts to stop attendance or log out    │
│ • Daily tasks uploaded by 10:00 AM       │ • Every assigned task must have updated     │
│ • Evaluated strictly at 10:00:00 AM IST  │   status (Completed, In Progress, Pending,  │
│ • No login-time or shift-based extension │   Blocked) + mandatory reasons if not done  │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### 1.1 Fixed 10:00 AM Universal Deadline (No Extensions)
- The morning compliance deadline is **fixed at 10:00:00.000 AM IST (Asia/Kolkata) for every active employee**.
- **No Dynamic Login Offsets**:
  - Employee logs in at 09:00 AM $\rightarrow$ Deadline is 10:00 AM.
  - Employee logs in at 09:30 AM $\rightarrow$ Deadline is 10:00 AM.
  - Employee logs in at 10:30 AM $\rightarrow$ Deadline was 10:00 AM. The employee is already late for morning compliance.
  - Employee logs in at 11:00 AM $\rightarrow$ Deadline was 10:00 AM.
- The system **never** computes deadlines via:
  - $\times$ Login time + 30 minutes.
  - $\times$ Scheduled login + 30 minutes.
  - $\times$ Individual shift start times.
  - $\times$ Automatic extensions based on late check-in.

---

## 2. Existing CRM Codebase Audit & Verified Source Mappings

To prevent duplicating existing CRM modules, this specification directly binds to actual source code:

| CRM Entity | Verified Codebase Path | Actual Verified Fields in Source Code | Integration Role |
|---|---|---|---|
| **Attendance** | `backend/src/database/models/Attendance.js` | `_id`, `employeeId`, `date`, `startTime`, `endTime`, `status` (`'ON_DUTY'`, `'ON_BREAK'`, `'COMPLETED'`), `breaks` array, `totalBreakSeconds`, `actualWorkSeconds`. | Checkpoint 1: `startTime <= 10:00:00 AM`. Checkpoint 2: Hooked into `/api/attendance/stop` before attendance is completed. |
| **Todo / Tasks**| `backend/src/database/models/Todo.js` | `_id`, `assignedTo`, `assignedBy`, `createdBy`, `createdAt`, `scheduledAt`, `status` (`'upcoming'`, `'done'`, `'late'`, `'cancelled'`, `'pending'`, `'in_progress'`, `'completed'`), `note`, `comments`, `activityHistory` array. | Checkpoint 1: Fresh tasks uploaded before 10:00 AM. Checkpoint 2: Verification of status updates and explanation reasons. |
| **User** | `backend/src/database/models/User.js` | `_id`, `name`, `employeeId`, `department`, `role` (`'employee'`, `'caller'`, `'manager'`, `'admin'`), `isActive`, `fcmToken`. | Active employee eligibility (`isActive !== false`); Manager mapping; Mobile push dispatch. |
| **Daily Activity**| `backend/src/database/models/DailyActivity.js`| `employeeId`, `activityDate`, `status`, `submittedAt`, `metrics`, `outcomes`. | Pillar 5 Discipline evaluation (EOD report submitted by 07:30 PM). |
| **Notification**| `backend/src/database/models/Notification.js`| `recipient`, `type`, `title`, `message`, `data`. | Real-time in-app, WebSocket, and FCM push notifications. |

---

## 3. Checkpoint 1: Universal 10:00 AM Morning Compliance Engine

At **10:00:00.000 AM IST** on every working day, the background scheduler sweeps all active employees and evaluates two independent conditions:

```
                               10:00:00 AM IST
                              EVALUATION SWEEP
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
   [Condition A: Attendance]                           [Condition B: Tasks]
   Attendance marked by 10 AM?                         Tasks uploaded by 10 AM?
           │                                                   │
     ┌─────┴─────┐                                       ┌─────┴─────┐
     ▼           ▼                                       ▼           ▼
  [YES]        [NO]                                    [YES]        [NO]
     │           │                                       │           │
     └───────────┼───────────────────────────────────────┼───────────┘
                 │                                       │
                 ▼                                       ▼
    ┌─────────────────────────┬───────────────────────────────┬─────────────────────────┐
    │  Condition A & B [YES]  │    One Condition Missing      │  Both Conditions [NO]   │
    ├─────────────────────────┼───────────────────────────────┼─────────────────────────┤
    │       COMPLIANT         │ Attendance Missing Only:      │ DUAL VIOLATION          │
    │       0 Tickets         │ 🔴 ATTENDANCE_NON_COMPLIANCE  │ 🔴 Combined Single Tkt  │
    │                         │ Tasks Missing Only:           │ 🔴 MORNING_COMPLIANCE_  │
    │                         │ 🟠 DAILY_TASK_SUBMISSION_     │    DUAL_VIOLATION       │
    │                         │    MISSING                    │ (Never 2 tickets)       │
    └─────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

### 3.1 Condition A: Attendance Compliance
- **Check**: Has the employee created an `Attendance` record for today (`date === todayDateStr`) where `startTime <= 10:00:00.000 AM IST`?
- Check-ins at `10:00:01 AM` or later are late and fail Condition A.
- Note: Punctuality scoring in Pillar 3 assesses whether login was before `09:30 AM` (grace up to `09:45 AM`), but non-compliance ticket generation occurs strictly at `10:00:00 AM`.

### 3.2 Condition B: Task Upload Compliance
- **Check**: Has the employee created or been assigned daily tasks in `Todo` for today's working date (`scheduledAt` matches today or `createdAt` falls between `00:00:00` and `10:00:00 AM IST` today)?
- **Timestamp Integrity**: The task must have been created or assigned on or before `10:00:00.000 AM IST` today. Old tasks from yesterday carried over do **not** qualify as today's morning upload.
- **Manager-Assigned Tasks**: Tasks assigned by a Manager/Admin before 10:00 AM for today count toward the employee's task compliance.

### 3.3 Evaluation Matrix & Ticket Generation
| Condition A (Attendance) | Condition B (Tasks Uploaded) | Compliance Result | Ticket Generated | Priority |
|:---:|:---:|---|---|:---:|
| **Completed** | **Completed** | 🟢 **Compliant** | None (0 tickets) | — |
| **Missing** | **Completed** | 🔴 **Attendance Violation** | Exactly ONE `ATTENDANCE_NON_COMPLIANCE` | High (48h SLA) |
| **Completed** | **Missing** | 🟠 **Task-Upload Violation** | Exactly ONE `DAILY_TASK_SUBMISSION_MISSING` | Medium (72h SLA) |
| **Missing** | **Missing** | 🔴 **Both Violations** | Exactly ONE combined `MORNING_COMPLIANCE_DUAL_VIOLATION` | Critical (24h SLA) |

> [!IMPORTANT]
> **Single Combined Ticket Guarantee**:
> If both attendance and tasks are missing, the system generates **strictly ONE combined ticket**. It will **never** generate separate attendance and task tickets for the same morning sweep.

---

## 4. Checkpoint 2: Mandatory Before-Logout Task Status Closure

Every employee must update the status of their assigned daily tasks before ending their attendance or logging out.

```
Employee clicks "End Attendance" or "Logout"
                       │
                       ▼
    Inspect all Todo items assigned to employee for today
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
[All Tasks Have Valid Updates]   [Un-updated Tasks or Missing Reasons]
       │                               │
       ▼                               ▼
Attendance Stopped               Show Intercept Warning Modal:
Session Closed                   • List tasks requiring updates
                                 • Inline status & reason selector
                                       │
                     ┌─────────────────┴─────────────────┐
                     ▼                                   ▼
          [Employee Updates Tasks]            [Employee Forces Logout]
                     │                                   │
                     ▼                                   ▼
          Attendance Stopped                  1. Stop Attendance
          Zero Violations                     2. Generate Ticket:
                                                 🔴 SHIFT_TASK_UPDATE_MISSING
```

### 4.1 Supported Task Statuses & Mandatory Reasons
Before ending attendance, every daily task in `Todo` must be updated to its actual real-world status:
- **Completed** (`'completed'` or `'done'`): Finished successfully.
- **In Progress** (`'in_progress'`): Development / work ongoing. Requires a status reason (e.g., *"Development is still ongoing, 70% completed"*).
- **Pending** (`'pending'`): Waiting on an external prerequisite. Requires an explanation reason (e.g., *"Waiting for client confirmation on wireframe"*).
- **Blocked** (`'late'` / impediment): Blocked due to dependencies. Requires an explanation reason (e.g., *"Required server access credentials have not been provided"*).

### 4.2 Explicit Status-Change Verification (No Fake Updates)
- The system checks `Todo.activityHistory` for an explicit status-change event (`action === 'status_update'` or `'status_confirmed'`) with `timestamp >= Attendance.startTime`.
- An unrelated edit (such as fixing a typo in title or background automated touch) updating `Todo.updatedAt` does **not** qualify as a status confirmation.
- Incomplete tasks (`in_progress`, `pending`, `blocked`) must have a non-empty explanation note recorded with the status update.

### 4.3 Logout Interception & Forced Logout Violation
1. When the employee clicks **"End Attendance"** (calling `/api/attendance/stop`) or logs out:
   - The backend validates whether all assigned tasks for today have been updated.
   - If un-updated tasks exist and `force !== true`:
     - Returns HTTP 400 with `code: 'TASKS_NOT_UPDATED'` and the list of un-updated tasks:
       ```json
       {
         "ok": false,
         "code": "TASKS_NOT_UPDATED",
         "message": "You must update all assigned daily tasks before ending attendance.",
         "pendingTasks": [
           { "id": "672...", "title": "Implement auth middleware", "status": "upcoming" }
         ]
       }
       ```
2. The frontend presents a **Task Update Modal** allowing the employee to set each task's status and enter reasons.
3. If the employee chooses to **Force End Attendance** without updating tasks:
   - Attendance session is closed.
   - The backend immediately generates a **`SHIFT_TASK_UPDATE_MISSING`** ticket containing the un-updated task IDs and titles in `evidenceSnapshot`.

---

## 5. Database Architecture, Sparse Deduplication & Mongoose Schemas

All models reside in `backend/src/database/models/`.

### 5.1 `PerformanceTicket.js` (With Database-Level Deduplication Keys)
```javascript
const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const performanceTicketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true, index: true }, // e.g. TKT-20261105-0001
  incidentHash: { type: String, required: true, unique: true, index: true },

  // DATABASE-LEVEL GUARANTEED DEDUPLICATION KEYS
  // Formatted: "<employeeId>_<incidentDate>"
  morningComplianceKey: { type: String, unique: true, sparse: true, index: true },
  // Formatted: "<employeeId>_<attendanceSessionId>"
  shiftComplianceKey: { type: String, unique: true, sparse: true, index: true },

  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  employeeCode: { type: String, default: '', index: true },
  employeeName: { type: String, default: '' },
  department: { type: String, required: true, index: true },

  checkpoint: { 
    type: String, 
    enum: ['CHECKPOINT_1_MORNING_10AM', 'CHECKPOINT_2_BEFORE_LOGOUT', 'PERFORMANCE_GOVERNANCE'],
    required: true,
    index: true
  },

  triggerType: { 
    type: String, 
    enum: [
      'ATTENDANCE_NON_COMPLIANCE',          // Morning Checkpoint: Attendance missing
      'DAILY_TASK_SUBMISSION_MISSING',       // Morning Checkpoint: Tasks missing
      'MORNING_COMPLIANCE_DUAL_VIOLATION',   // Morning Checkpoint: Both missing
      'SHIFT_TASK_UPDATE_MISSING',          // Logout Checkpoint: Tasks not updated
      'TASK_OVERDUE', 
      'POOR_PERFORMANCE_DAILY', 
      'REPEATED_LATE_LOGIN', 
      'MISSED_DAILY_REPORT'
    ], 
    required: true,
    index: true
  },
  
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
  status: { 
    type: String, 
    enum: ['open', 'under_review', 'employee_response_pending', 'action_required', 'resolved', 'closed', 'reopened'], 
    default: 'open',
    index: true 
  },

  incidentDate: { type: String, required: true, index: true }, // "YYYY-MM-DD"
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  missingRequirement: { type: String, default: '' },
  
  // Late Correction Tracking
  isCorrectedLater: { type: Boolean, default: false },
  correctedAt: { type: Date },
  correctionDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

  relatedAttendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  relatedTasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Todo' }],
  evidenceSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Dispute & Resolution
  employeeExplanation: { type: String, default: '' },
  isDisputed: { type: Boolean, default: false },
  assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String, default: '' },

  escalationLevel: { type: Number, default: 1 },
  escalatedAt: { type: Date },
  currentEscalationRole: { type: String, default: 'manager' },

  timeline: [timelineEventSchema]
}, { timestamps: true });

performanceTicketSchema.index({ employee: 1, incidentDate: 1 });
performanceTicketSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('PerformanceTicket', performanceTicketSchema);
```

### 5.2 Atomic Ticket Sequence Counter (`PerformanceTicketSequence.js`)
```javascript
const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Format: "TKT-YYYYMMDD"
  seq: { type: Number, default: 0 }
});

const Sequence = mongoose.model('PerformanceTicketSequence', sequenceSchema);

async function getNextTicketNumber(dateStr) {
  const prefix = `TKT-${dateStr.replace(/-/g, '')}`;
  const record = await Sequence.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `${prefix}-${String(record.seq).padStart(4, '0')}`;
}

module.exports = { Sequence, getNextTicketNumber };
```

### 5.3 Distributed Lease Lock (`ComplianceJobState.js`)
```javascript
const mongoose = require('mongoose');

const complianceJobStateSchema = new mongoose.Schema({
  jobName: { type: String, required: true, index: true }, // 'MORNING_10AM_COMPLIANCE'
  date: { type: String, required: true, index: true },     // 'YYYY-MM-DD'
  
  workerId: { type: String, default: '' },
  lockedAt: { type: Date },
  heartbeatAt: { type: Date },
  lockExpiresAt: { type: Date }, // 5-minute lease TTL
  attempts: { type: Number, default: 0 },
  
  lastRunStartedAt: { type: Date, required: true },
  lastRunCompletedAt: { type: Date },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'running' },
  
  totalEmployeesEvaluated: { type: Number, default: 0 },
  compliantCount: { type: Number, default: 0 },
  ticketsGeneratedCount: { type: Number, default: 0 },
  errors: [{ message: String, timestamp: { type: Date, default: Date.now } }]
}, { timestamps: true });

complianceJobStateSchema.index({ jobName: 1, date: 1 }, { unique: true });
complianceJobStateSchema.index({ status: 1, lockExpiresAt: 1 });

module.exports = mongoose.model('ComplianceJobState', complianceJobStateSchema);
```

---

## 6. Late Corrections, Status Transitions & Audit History

When an employee marks attendance late (e.g. at 10:20 AM) or uploads tasks after the 10:00 AM sweep:
1. **Ticket Retention**: The generated ticket is **never deleted**. The original violation record is permanently preserved.
2. **Correction Flags**: The system records `isCorrectedLater = true` and `correctedAt = new Date()`.
3. **Payload Details**: Captures what was corrected in `correctionDetails`:
   - E.g., `{ lateClockIn: '10:20 AM IST', lateTaskCount: 3 }`.
4. **Audit Timeline**: Appends an event to `ticket.timeline` documenting the late correction.
5. **Status Update**: Transitions status from `'open'` $\rightarrow$ `'under_review'` for management review.

---

## 7. Remote Work (WFH), Leave, Holidays & Exceptions

1. **Remote Work & WFH Policy**:
   - Employees approved for Work From Home (WFH) **must follow the exact same 10:00 AM attendance and task upload deadline**.
   - WFH does **not** grant automatic exemption from morning compliance or before-logout updates.
2. **Approved Leave & Official Holidays**:
   - Employees on approved leave (`Attendance.status === 'ON_LEAVE'`) or recognized public holidays are excluded from compliance sweeps.
3. **No Automatic Absenteeism from Late Login**:
   - An employee logging in at 10:30 AM is **not** marked absent. Their attendance is recorded as late, and the morning compliance ticket captures the late clock-in separately from actual work hours.
4. **Half-Day & HR Approved Exceptions**:
   - Approved half-day morning leaves exempt the 10:00 AM check upon HR flag verification in the employee profile (`morningExempt: true`).

---

## 8. Complete 5-Pillar Performance Scoring System

Performance scores are calculated separately from compliance tickets across 5 distinct dimensions ($0.00 \le \text{Score} \le 100.00$):

$$\text{Composite Score} = (S_{\text{tasks}} \times 0.30) + (S_{\text{productivity}} \times 0.25) + (S_{\text{attendance}} \times 0.15) + (S_{\text{quality}} \times 0.20) + (S_{\text{discipline}} \times 0.10)$$

### 8.1 Pillar 1: Task Completion & Status Quality (30%)
$$S_{\text{tasks}} = \frac{N_{\text{completed}} + (0.75 \times N_{\text{in\_progress\_with\_reason}}) + (0.50 \times N_{\text{pending\_with\_reason}})}{N_{\text{total\_assigned}}} \times 100$$
- Incomplete tasks without reasons receive 0 credit.
- If $N_{\text{total\_assigned}} = 0$, defaults to a neutral baseline of $85.00$.

### 8.2 Pillar 2: Productivity Hours & Output (25%)
- **Telecalling**: $\min\left(100, \left(\frac{\text{Connected Calls}}{50} \times 50\right) + \left(\frac{\text{Audio Seconds}}{12600} \times 50\right)\right)$
- **Non-Calling Staff**: $\min\left(100, \left(\frac{\text{Actual Work Seconds}}{28800} \times 80\right) + (\text{Checklist Ratio} \times 20)\right)$

### 8.3 Pillar 3: Attendance & Punctuality (15%)
Evaluated against official scheduled login time (`09:30 AM IST`):
| Check-in Timestamp | Score ($S_{\text{attendance}}$) | Morning Checkpoint 1 Result |
|---|:---:|---|
| $\le \text{09:30:00 AM IST}$ | **100.00** | Compliant (if tasks uploaded by 10 AM) |
| $\text{09:30:01} - \text{09:45:00 AM IST}$ (Grace) | **85.00** | Compliant (if tasks uploaded by 10 AM) |
| $\text{09:45:01} - \text{10:00:00 AM IST}$ (Late) | **60.00** | Compliant (if tasks uploaded by 10 AM) |
| $> \text{10:00:00 AM IST}$ (Delinquent) | **20.00** | 🔴 Ticket: `ATTENDANCE_NON_COMPLIANCE` |
| Absent / No Login | **0.00** | 🔴 Ticket: `ATTENDANCE_NON_COMPLIANCE` (or Dual) |

### 8.4 Pillar 4: Work Quality (20%)
- Average score from `CallAudit.js` (for callers) or code review/QA audits (for developers). Baseline: $85.00$ if unmeasured.

### 8.5 Pillar 5: Discipline & Daily Reporting (10%)
- Daily Activity report in `DailyActivity` submitted $\le \text{07:30 PM}$: **100.00**; between `07:31 PM – 09:00 PM`: **70.00**; after `09:00 PM`: **40.00**; missed: **0.00**.

---

## 9. Department-Wise KPI Configuration Matrix

| Department | Task Metric (30%) | Productivity Benchmark (25%) | Punctuality SLA (15%) | Quality Metric (20%) | Reporting SLA (10%) |
|---|---|---|---|---|---|
| **Telecalling & Counselors** | Follow-up tasks completed in `Todo` on schedule | 50+ attempted calls, 3.5h connected audio time | Login by 09:30 AM (10:00 AM ticket cutoff) | Positive lead summary accuracy, call audit quality | Daily lead outcome report in `DailyActivity` by 07:30 PM |
| **Software Development** | Feature & bug tasks delivered before due date | Checklist items done, active commit/PR logging | Login by 09:30 AM (10:00 AM ticket cutoff) | Code review approval, 0 task reopenings, clean PRs | Daily task summary report in `DailyActivity` by 07:30 PM |
| **Digital Marketing** | Campaign milestones, ad copies submitted on time | Meta leads synced, campaign budget health tracked | Login by 09:30 AM (10:00 AM ticket cutoff) | Cost per lead benchmark, creative design approval | Digital Calendar updates & report by 07:30 PM |
| **Technical Trainers** | Lab material prep, batch roadmap completion | Student training hours conducted per schedule | Login by 09:30 AM (or scheduled session) | Student demo success rate, student feedback score | Batch attendance & session log by 07:30 PM |
| **HR Operations** | Employee onboarding, document verification tasks | Attendance audits, daily schedule confirmations | Login by 09:30 AM (10:00 AM ticket cutoff) | Dispute resolution speed, policy compliance | Operational log in `DailyActivity` by 07:30 PM |

---

## 10. Backend REST API Specification & Architecture

Mounted in `backend/src/app/routes.js` under `/performance`:

### 10.1 Compliance Endpoints (`/api/performance/compliance`)
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/today` | Admin, Manager, HR | Get workforce summary for Checkpoint 1 (10 AM) and Checkpoint 2 (Logout). |
| `GET` | `/my-status` | Logged-in Staff | Returns current employee's morning compliance state and un-updated tasks list. |
| `POST` | `/run-morning-sweep` | Admin, HR | Manually triggers the 10:00 AM compliance check (idempotent; 0 duplicate tickets). |
| `GET` | `/before-logout-check` | Logged-in Staff | Evaluates task statuses prior to attendance stop. Returns un-updated tasks. |

### 10.2 Ticket Governance Endpoints (`/api/performance/tickets`)
| Method | Route | Access | Description |
|---|---|---|---|
| `GET` | `/` | Admin, Manager, HR | Filter tickets by Date, Employee, Checkpoint, TriggerType, Priority, Status. |
| `POST` | `/:id/explain` | Ticket Assignee | Submit explanation note with attachments. Moves status to `employee_response_pending`. |
| `POST` | `/:id/resolve` | Admin, Manager, HR | Resolve ticket with mandatory corrective action plan notes. |

---

## 11. Frontend Components & Modal Warning Architecture

### 11.1 Before-Logout Task Warning Modal (`BeforeLogoutTaskModal.jsx`)
Integrated into `frontend/src/modules/management/attendance/AttendanceRecords.jsx`:
- Intercepts `handleStopAttendance` when `/api/attendance/stop` returns `code: 'TASKS_NOT_UPDATED'`.
- Displays pending tasks with an inline form to set status (`Completed`, `In Progress`, `Pending`, `Blocked`) and enter reasons.
- Submits updates via `/api/todos/:id/status` and re-triggers stop attendance.
- Includes a "Force Stop Anyway" button (which logs attendance stop and triggers the compliance ticket).

### 11.2 Morning Compliance KPI Card (`MorningComplianceWidget.jsx`)
- Visual display of workforce compliance for today:
  - 🟢 Both Compliant
  - 🔴 Attendance Missing
  - 🟠 Tasks Missing
  - 🔴 Dual Violations

---

## 12. Background Scheduler, Distributed Locking & Recovery

Integrated into `backend/src/app/providers.js`:

```javascript
// backend/src/jobs/workers/complianceScheduler.js
const { acquireComplianceLock, releaseComplianceLock } = require('./workerLockManager');
const { runMorning10AmCheck } = require('./morningComplianceChecker');

function startComplianceScheduler() {
  // Server Boot Recovery: Check if server booted after 10:00 AM and morning sweep was missed
  recoverMissedMorningSweepOnBoot();

  // Precision 60-second tick
  setInterval(async () => {
    const now = new Date();
    const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
    const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    // Checkpoint 1: 10:00 AM IST Universal Sweep window (10:00:00 - 10:14:59)
    if (istTimeStr >= '10:00:00' && istTimeStr < '10:15:00') {
      const lock = await acquireComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr);
      if (lock.acquired) {
        try {
          await runMorning10AmCheck(todayDateStr, lock.lockToken);
          await releaseComplianceLock('MORNING_10AM_COMPLIANCE', todayDateStr, lock.lockToken);
        } catch (err) {
          console.error('[Morning Compliance Sweeper Error]', err);
        }
      }
    }
  }, 60 * 1000);
}
```

---

## 13. Real-Time Notifications, Idempotency & Escalation Matrix

### 13.1 Database-Level Idempotent Notification Dispatch
In `backend/src/database/models/Notification.js`:
```javascript
idempotencyKey: { type: String, unique: true, sparse: true, index: true }
```
Dispatch verifies or safely catches `E11000` to guarantee that concurrent runs or retries never deliver duplicate toasts or mobile FCM alerts.

### 13.2 Role-Based Escalation Matrix
- **Level 1 (0h)**: Assigned direct reporting manager (`manager`).
- **Level 2 (100% SLA Breached)**: HR role (`hr`). Status moves to `action_required`.
- **Level 3 (150% SLA Breached)**: System Administrator / Executive (`admin`).

---

## 14. Comprehensive Multi-Scenario Testing Matrix

| # | Test Scenario | Evaluated Checkpoint | Expected System Behavior |
|---|---|:---:|---|
| **1** | Employee clocks attendance at 09:15 AM and uploads tasks at 09:40 AM | Checkpoint 1 (10 AM) | Both completed $\le$ 10:00 AM. Verified Compliant. 0 tickets generated. |
| **2** | Employee clocks attendance at 09:30 AM but does not upload tasks by 10 AM | Checkpoint 1 (10 AM) | Attendance completed, tasks missing. Triggers ONE `DAILY_TASK_SUBMISSION_MISSING` ticket. |
| **3** | Employee uploads tasks at 09:50 AM but has not clocked attendance by 10 AM | Checkpoint 1 (10 AM) | Tasks completed, attendance missing. Triggers ONE `ATTENDANCE_NON_COMPLIANCE` ticket. |
| **4** | Employee does neither attendance nor task upload by 10 AM | Checkpoint 1 (10 AM) | Both missing. Triggers strictly ONE combined `MORNING_COMPLIANCE_DUAL_VIOLATION` ticket. MongoDB rejects separate tickets via `morningComplianceKey`. |
| **5** | Employee clocks attendance at 10:30 AM | Checkpoint 1 (10 AM) | Clock-in $> \text{10:00:00 AM}$. Deadline was 10:00 AM regardless of login. Flagged non-compliant; ticket generated. |
| **6** | Employee updates all tasks to Completed before ending attendance | Checkpoint 2 (Logout) | All tasks updated. Attendance stopped smoothly. 0 tickets. |
| **7** | Employee updates tasks to In Progress with explanation reason before logout | Checkpoint 2 (Logout) | Verified via `activityHistory`. Compliant. 0 tickets. |
| **8** | Employee attempts to stop attendance with un-updated tasks | Checkpoint 2 (Logout) | Intercepted! Backend returns `TASKS_NOT_UPDATED`. Warning modal displayed with pending task list. |
| **9** | Employee forces logout without updating task statuses | Checkpoint 2 (Logout) | Attendance stopped; triggers ONE `SHIFT_TASK_UPDATE_MISSING` ticket with task titles in evidence snapshot. |
| **10**| Employee updates a task to Pending without an explanation reason | Checkpoint 2 (Logout) | Missing mandatory reason fails validation. Triggers ticket. |
| **11**| Employee working from home (WFH) fails to clock attendance by 10 AM | Checkpoint 1 (10 AM) | WFH employees are not exempt. Evaluated under standard 10 AM rule; ticket generated. |
| **12**| Employee on approved leave on current working date | Checkpoints 1 & 2 | Verified exempt (`status: 'ON_LEAVE'`). Excluded from sweeps; 0 tickets. |
| **13**| Employee clocks attendance late (10:18 AM) after ticket was issued | Checkpoint 1 (10 AM) | Ticket retained (never deleted); `isCorrectedLater = true`, `correctedAt` logged, moves to `under_review`. |
| **14**| Server was offline from 09:55 AM to 10:12 AM | Checkpoint 1 (10 AM) | Boot recovery sweeper detects uncompleted sweep for today, executes 10 AM check safely with 0 duplicate tickets. |
| **15**| Scheduler tick executes concurrently across 2 worker processes | Checkpoints 1 & 2 | Atomic lease lock on `ComplianceJobState` ensures only 1 worker evaluates the sweep. Second worker backs off. |
| **16**| High priority ticket reaches 48h without resolution | Governance SLA | Automatically escalates to role `hr`, status moves to `action_required`. |

---

## 15. Verified List of Existing Codebase Files to Modify

To implement this specification with zero redundant modules:

1. **`backend/src/modules/management/attendance/attendance.js`**:
   - In `POST /stop` (line 407): Add Checkpoint 2 task status verification before completing attendance. If un-updated tasks exist and `!req.body.force`, return HTTP 400 with un-updated tasks list. If `force === true`, call ticket generator for `SHIFT_TASK_UPDATE_MISSING`.
2. **`backend/src/modules/tasks/todos.js`**:
   - In `PATCH /:id/status` and `PATCH /:id`: Ensure every status change appends to `activityHistory` with `action: 'status_update'`, `performedBy`, `details` (status and explanation reason), and `timestamp`.
3. **`backend/src/database/models/Notification.js`**:
   - Add `idempotencyKey: { type: String, unique: true, sparse: true, index: true }`.
4. **`backend/src/app/providers.js`**:
   - Register and start `startComplianceScheduler()` on server initialization.
5. **`backend/src/app/routes.js`**:
   - Mount `/api/performance` routes.
6. **`frontend/src/modules/management/attendance/AttendanceRecords.jsx`**:
   - In `handleStopAttendance`: Handle HTTP 400 with `code: 'TASKS_NOT_UPDATED'` by opening the `BeforeLogoutTaskModal`.
7. **`frontend/src/app/routes.jsx` & `Navbar.jsx`**:
   - Register `/performance` dashboard route and navigation link.

---

## 16. Final Phased Implementation Roadmap

```
Phase 1: Database Models & 10:00 AM Morning Compliance Engine (Immediate Next Step)
├── 1.1 Create PerformanceTicket.js with morningComplianceKey and shiftComplianceKey
├── 1.2 Create PerformanceTicketSequence.js for atomic TKT-YYYYMMDD-XXXX numbering
├── 1.3 Create ComplianceJobState.js for distributed lease locking
├── 1.4 Create workerLockManager.js (atomic lease, heartbeats, renewal, crash recovery)
├── 1.5 Implement morningComplianceChecker.js (fixed 10:00 AM IST attendance & task sweep)
├── 1.6 Implement dual-violation combined ticket logic and idempotent notification dispatch
└── 1.7 Register complianceScheduler.js and boot recovery sweeper in providers.js

Phase 2: Before-Logout Task Closure & Attendance Stop Hook
├── 2.1 Update Todo.js routes (todos.js) to record explicit status_update in activityHistory
├── 2.2 Hook Checkpoint 2 validation into Attendance POST /stop in attendance.js
├── 2.3 Build BeforeLogoutTaskModal.jsx in frontend to display and update pending tasks
└── 2.4 Handle force logout ticket generation for SHIFT_TASK_UPDATE_MISSING

Phase 3: Performance Scoring, Dashboards & SLA Escalations
├── 3.1 Implement EmployeePerformanceDaily.js and 5-pillar mathematical scoring calculator
├── 3.2 Build SLA escalation background checker (Manager ──► HR ──► Admin)
├── 3.3 Build REST APIs under /api/performance (compliance, tickets, roster, dispute, resolve)
├── 3.4 Build Frontend MorningComplianceWidget and TicketGovernanceHub
└── 3.5 Wire routes in routes.jsx and add navigation items in Navbar.jsx
```

---

> **Specification Sign-off**: This specification faithfully reflects the exact business rules: **fixed universal 10:00 AM deadline** and **mandatory before-logout task status closure**. No login-based deadline offsets or automatic extensions exist. Ready for implementation.
