# AOTMS CRM — Daily Activity Schedule Module
## Approved Architectural Specification & Implementation Plan

> **Specification Status**: Approved with 10 refinements (Audit diff tracking, unpublished/staging state for unconfirmed matches, HR archiving, configurable MD edit permission, and strict non-task informational architecture).

---

## 1. System Overview & Core Distinctions

The **Daily Activity Schedule** module provides an official, centralized informational reference directory for regular employee job responsibilities, routine activities, working hours, and recurring meetings across the organization.

### Daily Activity Schedule vs. Existing To-Do Module
| Dimension | Daily Activity Schedule (New Module) | Existing To-Do Module (Unchanged) |
|---|---|---|
| **Primary Scope** | Static job responsibilities, recurring activities, & regular schedule | Transactional tasks planned for today |
| **Module Nature** | **Reference & information profile** | **Action execution & task tracking** |
| **Ownership** | **HR** maintains the official employee profile | **Employee** logs and updates their daily tasks |
| **Completion & %** | **Strictly NO checkboxes, NO completion %, NO overdue alerts** | Task check-offs, completion statuses, progress bars |
| **Timetable vs. Reference** | Categorized job profile (Working Hours, Responsibilities, Meetings) | Time-bound daily task list |
| **Audit & Governance** | Enterprise audit trail with before/after diffs | Personal task logs |
| **Module Isolation** | New isolated routes, models, and UI | Existing module untouched |

---

## 2. Role-Based Access Control (RBAC) & Governance Matrix

| Role / Designation | View All Schedules | Search & Filter Directory | View Own Schedule | Create & Edit | Archive & Restore | Confirm & Publish | Audit History Diff |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Managing Director (MD)** (Ameen Sayyed / `isManagingDirector`) | ✅ (Default) | ✅ (Default) | ✅ | Configurable Only (`allowMdEdit`) | Configurable Only | Configurable Only | ✅ View |
| **HR Specialist** (Deenaz Shaik / `isHR`) | ✅ | ✅ | ✅ | ✅ | ✅ (Archive) | ✅ | ✅ Full |
| **Standard Employee** (Developer, Trainer, Telecaller, etc.) | ❌ (403) | ❌ (403) | ✅ (Read-Only) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ |

### Key Governance Rules
1. **HR Management**: HR has full create, edit, archive, restore, and publishing rights. Archiving is implemented via soft-state (`publishStatus: 'archived'` or `isArchived: true`) so that CRM-wide hard delete restrictions on HR are respected.
2. **MD View-Only by Default**: MD has view-all access across all departments and employees. Editing capability is guarded by a configurable permission flag (`allowMdEditDailyActivitySchedule` in workspace preferences or user permissions). Without this explicit flag, MD attempts to mutate records return `403 Forbidden: MD has view-only access by default`.
3. **Employee Self-View**: Employees can only retrieve their own schedule via `/api/daily-activity-schedules/me`. The employee ID is extracted strictly from the verified JWT (`req.user._id`). Any attempt to pass or tamper with another employee's ID returns `403 Forbidden`.
4. **Draft / Unpublished Guard**: If a schedule is in `draft` status (e.g. pending HR confirmation), the employee endpoint `/me` will not leak it and will return a friendly "Schedule pending HR review" state until HR explicitly confirms and publishes it.

---

## 3. Database Audit & Employee Matching Protocol

Live database verification of the `users` collection in MongoDB Atlas confirmed 12 active users. Matching the 10 profiles from the specification yields:

### A. Confirmed Exact Matches (Will be automatically seeded as Published)
| # | Employee in Spec | Matched User Record in DB | Verified `_id` | DB `employeeId` | DB Designation | DB Department |
|---|---|---|---|---|---|---|
| 1 | **Deenaz Shaik** (HR) | `deenaz shaik` | `6ab38a233312a90866e3c76c` | `AOTMS-04` | Sr. HR Specialist | Manager (HR) |
| 2 | **Bhargav Possimsetty** | `Bhargav Possimsetty` | `6aba5c2fffdd149e031957ba` | `AOTMS-16` | Corporate Trainer | Trainer |
| 3 | **Saadiya Mohammad** | `Saadiya Mohammad` | `6ab386d83312a90866e3c6d5` | `AOTMS-21` | Jr. Software Developer | Development |
| 4 | **Ramanadham Jayaveer** | `Ramanadham Jayaveer` | `6ab25b5dc6d2062c7cd12eea` | `AOTMS-20` | Sr. Software Developer | Development |

*Note*: Saadiya Mohammad and Ramanadham Jayaveer share identical initial activities in the brief, but will be seeded as completely separate, independent records linked to their respective MongoDB ObjectIds.

---

### B. Unconfirmed / Ambiguous Matches (Will NOT be automatically seeded)
Per requirement 5 (*"Do not automatically seed unconfirmed employee records"*) and requirement 4 (*"Ambiguous employee matches must remain unpublished until HR confirms them"*), these 6 profiles are staged in an **HR Setup Staging Queue** file (`backend/src/modules/daily-activity-schedule/data/unconfirmedStagingData.json`) and surfaced in the HR portal for one-click manual confirmation:

| # | Spec Employee | Candidate DB Record | Candidate DB ID | Discrepancy / Reason for HR Confirmation |
|---|---|---|---|---|
| 5 | **Bhavani** | `Dasari Durga Bhavani` | `AOTMS-18` | Legal full name `Dasari Durga Bhavani` in DB; HR must verify if all listed responsibilities belong to this employee. |
| 6 | **Rajasree Vanukuru** | `Raja Sri` (`rajasree@gmail.com`) | `AOTMS-23` | Spec gave ID `13` & `Jr Telecaller`; DB holds `AOTMS-23` & `Counsellor`. Must not guess ID. |
| 7 | **Venkat** | `Venkat Sai` (`venkatasai@aotms.in`) | `AOTMS-09` | Logout ambiguity in source (07:45 PM vs 08:00 PM) + class hours need HR sign-off. |
| 8 | **Adilakshmi** | `Adilakshmi Vemala` | `AOTMS-05` | Legal name `Adilakshmi Vemala`. Reference class timings staged for HR review. |
| 9 | **Moeen Ahmad** | `Moeen Ahmad Mahammad` | `AOTMS-25` | Spec listed ID `11`; DB holds `AOTMS-25`. HR must verify employee ID. |
| 10 | **Manasa Chinthala** | `Chinthala Manasa` | `AOTMS-24` | Spec listed ID `12`; DB holds `AOTMS-24`. HR must verify employee ID. |

---

## 4. MongoDB Schema & Audit Diff Specification

### File: `backend/src/database/models/EmployeeDailyActivitySchedule.js`
### Collection: `employee_daily_activity_schedules`

```javascript
const mongoose = require('mongoose');

// Single field diff record for comprehensive audit history
const fieldDiffSchema = new mongoose.Schema({
  field: { type: String, required: true },
  previousValue: { type: mongoose.Schema.Types.Mixed },
  updatedValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// Audit entry recording editor, action, timestamp, and field-level diffs
const auditEntrySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'updated', 'published', 'archived', 'restored'],
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  summary: {
    type: String,
    default: ''
  },
  fieldChanges: [fieldDiffSchema]
}, { _id: false });

const recurringMeetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  days: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Daily', 'Every 2 Days'],
    required: true
  }],
  time: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true }
}, { _id: true });

const employeeDailyActivityScheduleSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Guarantees strictly 1 schedule document per employee
    index: true
  },
  workingHours: {
    loginTime: { type: String, default: '', trim: true },
    logoutTime: { type: String, default: '', trim: true },
    note: { type: String, default: '', trim: true }
  },
  keyResponsibilities: [{
    type: String,
    trim: true
  }],
  regularActivities: [{
    type: String,
    trim: true
  }],
  weeklyResponsibilities: [{
    type: String,
    trim: true
  }],
  recurringMeetings: [recurringMeetingSchema],
  additionalInformation: {
    type: String,
    default: '',
    trim: true
  },
  publishStatus: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  isHrConfirmed: {
    type: Boolean,
    default: true,
    index: true
  },
  hrConfirmationNote: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditHistory: [auditEntrySchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for directory performance
employeeDailyActivityScheduleSchema.index({ publishStatus: 1, isHrConfirmed: 1 });
```

---

## 5. Backend REST API Architecture & Security Model

### Router Path: `backend/src/modules/daily-activity-schedule/dailyActivitySchedule.js`
### Mounted at: `/api/daily-activity-schedules`

All endpoints are protected by `protect` middleware and validated by explicit authorization checks:

```
[Incoming Request] ──► protect (JWT / Basic Auth validation)
                     ├──► Check Designation / Role (MD, HR, Employee)
                     ├──► Check Configurable Permissions (allowMdEdit)
                     └──► Filter & Sanitize Response Projections
```

### Endpoints Specification

| Endpoint | Method | Authorization | Function & Security Rules |
|---|---|---|---|
| `/` | `GET` | MD, HR, Admin | List all employee schedules. Supports query filters (`search`, `department`, `designation`, `status`, `publishStatus`). Projections strictly exclude `password`, `resetPasswordToken`, `fcmToken`, `smtpConfig`. |
| `/me` | `GET` | Authenticated Employee | Retrieves caller's own published schedule (`req.user._id`). If status is `draft`, returns a pending-review message without exposing unconfirmed details. |
| `/staging` | `GET` | HR, Admin | Retrieves the 6 unconfirmed staged profiles requiring HR confirmation. |
| `/staging/:key/confirm` | `POST` | HR, Admin | Confirms a staged employee, links to selected MongoDB employee `_id`, and creates the initial published schedule. |
| `/:employeeId` | `GET` | MD, HR, Admin, or Self | Returns single employee schedule. Non-HR/MD callers can only request their own ID. |
| `/` | `POST` | HR, Admin, MD (if `allowMdEdit`) | Creates a new schedule for an employee. Verifies that employee exists in `User` and has no existing active schedule. Records creation in `auditHistory`. |
| `/:id` | `PUT` | HR, Admin, MD (if `allowMdEdit`) | Updates schedule. Calculates field-level diffs (`previousValue` vs `updatedValue`) and appends to `auditHistory`. |
| `/:id/archive` | `PATCH` | HR, Admin, MD (if `allowMdEdit`) | Sets `publishStatus = 'archived'`. Records archive action in `auditHistory`. |
| `/:id/restore` | `PATCH` | HR, Admin, MD (if `allowMdEdit`) | Restores an archived schedule back to `published`. |
| `/:id/publish` | `PATCH` | HR, Admin | Publishes a `draft` schedule, making it visible to the employee. |
| `/:id/audit-history` | `GET` | MD, HR, Admin | Retrieves the full history diffs for a schedule. |

---

## 6. Frontend UI/UX Structure & Navigation

### Module Directory: `frontend/src/modules/management/daily-activity-schedule/`
```
daily-activity-schedule/
├── index.jsx                        # Module controller & view switch
├── DailyActivitySchedule.jsx        # Navigation shell (Tabs for Directory, My Schedule, HR Staging)
├── AllEmployeeActivities.jsx        # MD & HR Directory with Search, Cards, & Filter Grid
├── MyActivitySchedule.jsx           # Clean personal view for employees (Sections A to G)
├── ActivityScheduleDetailModal.jsx  # Structured profile modal with tabs & audit history
├── ActivityScheduleFormModal.jsx    # HR create & edit modal with dynamic item builders
├── StagingReviewModal.jsx           # HR workflow for reviewing and confirming the 6 unconfirmed profiles
└── AuditHistoryDrawer.jsx           # Visual before/after diff viewer for HR & MD
```

### Screen Layouts & Views

#### 1. MD & HR — All Employee Directory
- **Filters**: Search (by Name or Employee ID), Department filter, Designation filter, Status filter (All, Published, Draft, Archived, Not Configured).
- **Directory Grid**: Clean cards showing:
  - Employee Avatar, Name, Employee ID, Designation, Department badge.
  - Working Hours badge (`09:30 AM – 06:30 PM`).
  - Key responsibilities snippet.
  - Publication badge (`Published`, `Draft / Pending Review`, `Archived`).
  - Actions: **View Profile**, **Edit Schedule** (HR, or MD if enabled), **Archive / Restore**, **Audit History**.
- **Pending Review Alert**: Banner notifying HR of any unconfirmed staging profiles awaiting review.

#### 2. Employee — My Activity Schedule (Personal Read-Only View)
- Accessible via Sidebar under **My Workspace** -> **Activity Schedule** (`/activity-schedule`).
- Shows strictly structured, non-task sections:
  - **Section A: Employee Overview**: Profile header, Department, Designation, Employee ID.
  - **Section B: Working Hours**: Login time, Logout time, and timing notes.
  - **Section C: Key Responsibilities**: Unordered bullet list of primary job responsibilities.
  - **Section D: Regular Daily Activities**: Bullet list of routine daily tasks.
  - **Section E: Weekly Responsibilities & Recurring Meetings**: Clean schedule cards displaying Meeting Title, Days, Time, and Description.
  - **Section F: Additional Information**: HR directives and coordination notes.
  - **Section G: Record Metadata**: Last updated date and publication status.
- **Strictly Informational**: Zero checkboxes, zero completion percentages, zero daily timetables.

#### 3. HR Staging Review & Confirmation Workflow
- Lists the 6 unconfirmed employee profiles.
- Shows side-by-side comparison between the Brief's details and the candidate database record.
- Allows HR to verify the employee, adjust working hours or notes, and click **"Confirm & Create Schedule"**.

---

## 7. Audit Diff Tracking Example

When an HR Specialist edits Ramanadham Jayaveer's logout time and adds a new responsibility:
```json
{
  "action": "updated",
  "performedBy": "6ab38a233312a90866e3c76c", // Deenaz Shaik
  "performedAt": "2026-11-03T16:35:00.000Z",
  "summary": "Updated working hours and added responsibility",
  "fieldChanges": [
    {
      "field": "workingHours.logoutTime",
      "previousValue": "06:15 PM",
      "updatedValue": "06:30 PM"
    },
    {
      "field": "keyResponsibilities",
      "previousValue": ["Project development and execution"],
      "updatedValue": ["Project development and execution", "Architecture review for mobile client"]
    }
  ]
}
```
HR and MD can view these exact diffs at any time through the **Audit History** panel.

---

## 8. Idempotent Initial Seed Strategy

- **Confirmed Seed**: Seeds the 4 verified employees (`Deenaz Shaik`, `Bhargav Possimsetty`, `Saadiya Mohammad`, `Ramanadham Jayaveer`) directly into `employee_daily_activity_schedules` with `publishStatus: 'published'` and `isHrConfirmed: true`.
- **Unconfirmed Staging**: Places the remaining 6 profiles into `unconfirmedStagingData.json` so they are available in the HR UI setup tab without creating unverified database records.
- **Idempotency**: Running `node seedActivitySchedules.js` multiple times will update or skip existing records without creating duplicates.

---

## 9. Verification & Testing Checklist

### Functional & Security Verification
- [ ] **MD Access**: MD can view all schedules, search, and filter. Edit button is hidden unless `allowMdEdit` is enabled.
- [ ] **MD Configurable Edit**: When `allowMdEdit` is disabled, PUT/PATCH calls from MD return `403 Forbidden`.
- [ ] **HR Access**: HR can create, edit, archive, restore, and confirm schedules.
- [ ] **Employee Access**: Regular employee can query `/me` and view only their own schedule.
- [ ] **Horizontal Privilege Escalation**: Employee requesting another employee's ID (`/:employeeId`) receives `403 Forbidden`.
- [ ] **Draft Isolation**: Unpublished/draft schedules return a pending message on `/me` and are not leaked to employees.
- [ ] **Audit Trail**: Every update creates a structured diff showing `previousValue` and `updatedValue`.
- [ ] **No Unconfirmed Seeding**: Database contains only verified records; unconfirmed profiles are kept in the HR staging review queue.
- [ ] **Zero Secrets Leaked**: Responses never expose password hashes, reset tokens, FCM tokens, or SMTP passwords.
- [ ] **Regression Check**: Existing To-Do (`/todo`), Attendance, and Call Recordings modules remain 100% operational and untouched.
- [ ] **Production Build**: `npm run build` in `frontend` compiles with 0 errors.
