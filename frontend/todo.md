# AOTMS CRM — Daily Activity & Telecaller Dashboard Master Implementation Plan

## 1. Project Overview & Architectural Vision

This master specification defines the unified engineering roadmap for:
1. **The Telecaller Dashboard & Daily Activity Module**:
   - A modern, two-column workspace featuring an **interactive Calendar on the Left** and a **department-specific Activity Form on the Right**.
   - Specialized, rich tracking for **Telecalling** (Calls Attempted, Connected, Unanswered, Lead Outcomes, Follow-up Tracking, and History Table).
   - Tailored daily report forms for **Developer**, **Management**, and **Trainer** departments.
   - **Zero Regression on Digital Marketing**: The existing `/digital-calendar` and its underlying schema, routes, modals, and workflow remain completely **unchanged and isolated**.
2. **Telecalling Target User Assignment**:
   - User ObjectId: `6ab6449b62b25645faae28ed` (Identified in MongoDB as **Dasari Durga Bhavani** / `bhavani@aotms.in`).
   - Idempotently assign to canonical department `'Telecalling'` without altering existing role, credentials, or permissions.
3. **Permanent Retirement of Legacy Task/TODO Module**:
   - Audit dependencies, strictly isolating and protecting `FollowUp` APIs (`backend/src/modules/tasks/followups.js`).
   - Remove legacy Task/TODO frontend routes, navigation items, controllers, and models.
   - Re-route all fallback redirects (in `routes.jsx`, `Login.jsx`, `Forbidden.jsx`) to safe CRM landing routes (`/daily-activity` or `/dashboard`).
   - Safely backup and migrate legacy database collections.

---

## 2. Department Workflows & Form Specifications

| Department | Form Structure & Input Fields | Backend Validation & Business Rules |
|---|---|---|
| **Telecalling (Specialized)** | **A. Summary Cards & Metrics**: Calls Attempted, Connected, Unanswered, Interested, Follow-ups Scheduled, Conversions.<br>**B. Lead Outcomes**: Lead ref, Category (`Interested`, `Follow-up Required`, `Not Interested`, `No Answer`, `Wrong Number`, `Converted`), Follow-up date/time.<br>**C. Notes**: Remarks, blockers, next steps.<br>**D. Workspaces**: History Table & Follow-up Tracker. | - Strict numeric validation: `Calls Attempted >= Connected Calls`.<br>- All call counts must be non-negative integers.<br>- Follow-up date/time is mandatory when outcome is `Follow-up Required`.<br>- Lead reference must belong to authorized leads. |
| **Developer** | Project/Module name, Task/Ticket ID, Work Completed, Features Implemented, Bugs Fixed, Git Branch/PR Link, Blockers & Dependencies, Next Working Day Plan, Status (`In Progress`, `Completed`, `Blocked`). | Required: Project, Work Completed, Next Plan, Status. Valid URL format for Git PR link. |
| **Management** | Team/Project, Key Activities & Meetings, Decisions Made, Targets & Progress, Pending Approvals, Risks & Escalations, Follow-up Owner & Due Date, Next Working Day Plan. | Required: Key Activities, Decisions Made, Next Plan. Valid future date on follow-up items. |
| **Trainer** | Course/Batch, Session Topic, Classes Conducted, Student Attendance Count, Topics Covered, Assignments/Assessments Given, Student Progress/Concerns, Next Session Plan. | Required: Course/Batch, Session Topic, Attendance Count (numeric >= 0), Topics Covered. |
| **Digital Marketing** | **100% PRESERVED**: Existing `DigitalCalendar` & `ContentFormModal` continue operating independently. | **DO NOT TOUCH**: No schema, route, or UI modifications permitted. |

---

## 3. Telecaller Dashboard UI/UX Specification

### 3.1 Workspace Layout
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Telecaller Dashboard                                        [Save Draft] [Submit Day]  │
│  Track daily calls, manage scheduled follow-ups, and log activity outcomes             │
├────────────────────────────┬───────────────────────────────────────────────────────────┤
│  LEFT COLUMN: CALENDAR     │  RIGHT COLUMN: DAILY ACTIVITY WORKSPACE                   │
│                            │                                                           │
│  [ < October 2026 > ]      │  Selected Date: 16 October 2026    Status: [ Draft ]      │
│  Su Mo Tu We Th Fr Sa      │  Telecaller: Dasari Durga Bhavani  Dept: Telecalling       │
│   1  2  3  4  5  6  7      ├───────────────────────────────────────────────────────────┤
│   8  9 10 11 12 13 14      │  CALLING SUMMARY METRICS                                  │
│  15 16 17 18 19 20 21      │  [ Attempted: 45 ]  [ Connected: 32 ]  [ Interested: 8 ]  │
│  22 23 24 25 26 27 28      │  [ Unanswered: 13]  [ Follow-ups: 6 ]  [ Converted:  2 ]  │
│  29 30 31                  ├───────────────────────────────────────────────────────────┤
│                            │  LEAD CALL OUTCOMES                                       │
│  Status Legend:            │  Lead: John Doe (+91 98765...)  Category: [ Follow-up Req ]│
│  🟢 Submitted              │  Next Follow-up: 18 Oct 2026 11:00 AM                     │
│  🟡 Draft                  │  Notes: Needs quotation revision for enterprise plan      │
│  🟠 Needs Correction       ├───────────────────────────────────────────────────────────┤
│  ⚪ No Report Recorded     │  REMARKS & NEXT STEPS                                     │
│                            │  [......................................................] │
│  [ Jump to Today ]         │  [Save Draft]                     [Submit Daily Activity] │
├────────────────────────────┴───────────────────────────────────────────────────────────┤
│  MY RECENT ACTIVITY HISTORY                  │  FOLLOW-UP TRACKER (DUE TODAY & UPCOMING) │
│  Date       Calls  Conn. Int. Status Actions │  Lead Name      Due Time    Last Notes   │
│  15 Oct 26   50     38    10  🟢 Sub  [View] │  Sarah Connor   02:30 PM    Follow up... │
│  14 Oct 26   42     30     6  🟢 Sub  [View] │  Rahul Sharma   04:00 PM    Interested...│
└──────────────────────────────────────────────┴───────────────────────────────────────────┘
```

### 3.2 UI States & Responsive Behavior
- **Desktop**: Side-by-side 2-column workspace (`w-[320px]` left calendar, `flex-1` right form), followed by bottom 2-column grid for History and Follow-up Tracker.
- **Tablet / Mobile**: Stacks calendar above form with collapsible toggle; tables convert to responsive swipeable cards.
- **Zero Fabricated Metrics**: If data is loading, show pulse skeletons. If no metrics exist, display clear empty states (`—` or "No calls recorded").
- **Unsaved Changes Protection**: Modal alert if telecaller attempts to switch calendar dates while having dirty/unsaved inputs.

---

## 4. Backend Architecture & Database Design

### 4.1 Mongoose Schema: `DailyActivity`
- **File**: `backend/src/database/models/DailyActivity.js`
- **Fields**:
  - `employeeId`: `{ type: ObjectId, ref: 'User', required: true, index: true }`
  - `department`: `{ type: String, required: true, index: true }`
  - `activityDate`: `{ type: String, required: true }` (Normalized ISO `YYYY-MM-DD` date)
  - `status`: `{ type: String, enum: ['draft', 'submitted', 'reviewed', 'needs_correction'], default: 'draft', index: true }`
  - `metrics`:
    - `callsAttempted`: `{ type: Number, min: 0, default: 0 }`
    - `connectedCalls`: `{ type: Number, min: 0, default: 0 }`
    - `unansweredCalls`: `{ type: Number, min: 0, default: 0 }`
    - `interestedLeads`: `{ type: Number, min: 0, default: 0 }`
    - `followUpsScheduled`: `{ type: Number, min: 0, default: 0 }`
    - `conversions`: `{ type: Number, min: 0, default: 0 }`
  - `outcomes`: `[{ leadId: { type: ObjectId, ref: 'Lead' }, leadName: String, category: String, followUpAt: Date, notes: String }]`
  - `departmentData`: `{ type: Schema.Types.Mixed }` (Payload for Developer, Management, Trainer)
  - `remarks`: `{ type: String, default: '' }`
  - `nextSteps`: `{ type: String, default: '' }`
  - `submittedAt`: `Date`
  - `reviewedAt`: `Date`
  - `reviewedBy`: `{ type: ObjectId, ref: 'User' }`
  - `correctionReason`: `String`
  - `revisions`: `[{ editedAt: Date, editedBy: ObjectId, changesSummary: String }]`
- **Indexes**:
  - `{ employeeId: 1, activityDate: 1 }` (Unique compound index: 1 report per employee per day)
  - `{ department: 1, activityDate: -1, status: 1 }` (Admin overview index)

### 4.2 API Contract (`/api/daily-activities`)
| Method | Endpoint | Access Scope | Purpose |
|---|---|---|---|
| `GET` | `/calendar?month=YYYY-MM` | Own data (Admin: filtered) | Status markers for monthly calendar dots |
| `GET` | `?date=YYYY-MM-DD` | Own data (Admin: filtered) | Load report for the selected calendar date |
| `POST` | `/` | Authenticated Employee | Save or update draft for the current day |
| `POST` | `/:id/submit` | Report Owner | Formally submit activity report |
| `GET` | `/history?page=1&limit=10` | Authenticated Employee | Paginated personal activity history |
| `GET` | `/follow-ups` | Authenticated Telecaller | Permitted call follow-ups due today / upcoming |
| `GET` | `/admin/overview` | Admin / Authorized Manager | Organization-wide activity table with multi-filters |
| `GET` | `/:id` | Owner / Admin | Detailed single report view |
| `PATCH` | `/:id/review` | Admin / Authorized Manager | Approve or request correction with remarks |

---

## 5. Master Implementation Checklist

### Phase 1: Pre-Implementation Audit & Security Isolation
- [x] **1.1 Telecalling Target User Verification**:
  - [x] Query MongoDB for User ID `6ab6449b62b25645faae28ed`.
  - [x] Confirm user is **Dasari Durga Bhavani** (`bhavani@aotms.in`), account is active (`isActive: true`), and current department is `'Manager'`.
  - [x] Ensure canonical `Department` record for `'Telecalling'` exists in `departments` collection.
- [x] **1.2 Legacy Tasks & TODO Dependencies Audit**:
  - [x] Verify `backend/src/modules/tasks/followups.js` handles `/api/followups`.
  - [x] Isolate `followups.js` so Lead Call Follow-ups remain 100% operational when `tasks.js` and `todos.js` are removed.
  - [x] Locate all `/tasks` route redirects across `routes.jsx`, `Sidebar.jsx`, `Navbar.jsx`, `Login.jsx`, and `Forbidden.jsx`.
- [x] **1.3 Digital Marketing Lock & Baseline Check**:
  - [x] Test `/digital-calendar` route to verify existing cards, modals, and content schedules.
  - [x] Lock `frontend/src/modules/marketing/digital-calendar/` from any changes.

---

### Phase 2: Database Schema & Migration Execution
- [x] **2.1 Telecalling User Migration**:
  - [x] Execute migration script updating user `6ab6449b62b25645faae28ed`: set `department: 'Telecalling'`.
  - [x] Verify role (`manager`), credentials, email, and password hash are preserved untouched.
- [x] **2.2 Create `DailyActivity` Model**:
  - [x] Implement `backend/src/database/models/DailyActivity.js` with metrics, outcomes, and audit schemas.
  - [x] Add unique compound index `{ employeeId: 1, activityDate: 1 }`.
  - [x] Register model in `backend/src/modules/models/DailyActivity.js`.

---

### Phase 2 (Backend API, Validation & RBAC Middleware)
- [x] **2.1 Department Validation Layer**:
  - [x] Create `backend/src/modules/daily-activities/validators.js`.
  - [x] Implement Telecalling numeric validation: `callsAttempted >= connectedCalls`, non-negative counts.
  - [x] Implement strict calendar date validation (real calendar date parsing, reject invalid dates like `2026-10-88` or `2026-02-30`).
  - [x] Implement Developer, Management, and Trainer payload schemas.
- [x] **2.2 Controller & Service Implementation**:
  - [x] Create `backend/src/modules/daily-activities/dailyActivities.js`.
  - [x] Implement `GET /calendar`: Aggregate date status dots for authenticated user.
  - [x] Implement `GET /`: Fetch report for requested `date`.
  - [x] Implement `POST /`: Save draft (bind `employeeId: req.user._id` from trusted JWT).
  - [x] Implement `POST /:id/submit`: Transition status from `draft` / `needs_correction` to `submitted`.
  - [x] Implement `GET /history`: Paginated employee history list.
  - [x] Implement `GET /follow-ups`: Fetch today's call follow-ups for the telecaller.
  - [x] Implement `GET /admin/overview`: Paginated query with filters (Department, Employee, Status, Date range).
  - [x] Implement `PATCH /:id/review`: Admin action (Approve / Request Correction with audit logging).
- [x] **2.3 Route Mounting & Protection**:
  - [x] Mount `/api/daily-activities` in `backend/src/app/routes.js` with `protect` authentication and rate limiting.
  - [x] Enforce strict RBAC: Regular employees cannot query or submit other employees' records.

---

### Phase 3: Frontend Telecaller & Daily Activity Dashboard UI
- [x] **3.1 Module Setup & API Service**:
  - [x] Create `frontend/src/modules/daily-activities/` folder.
  - [x] Integrate `dailyActivityAPI` in `frontend/src/services/api.js` connecting all backend endpoints.
- [x] **3.2 Left Panel — Interactive Calendar Widget**:
  - [x] Create `ActivityCalendar.jsx` with month navigation, status dots, and jump-to-today.
  - [x] Create `CalendarStatusLegend.jsx` (🟢 Submitted, 🟡 Draft, 🟠 Needs Correction, ⚪ No Report).
- [x] **3.3 Right Panel — Form Components**:
  - [x] Create `DepartmentActivityForm.jsx` (Form shell with read-only header: Date, Name, Department).
  - [x] Create `TelecallingActivityFields.jsx`:
    - [x] Metric counters (Attempted, Connected, Unanswered, Interested, Follow-ups, Conversions).
    - [x] Dynamic lead outcome logging with follow-up date-time picker.
    - [x] Notes, remarks, and blocker textareas.
  - [x] Create `DeveloperActivityFields.jsx`, `ManagementActivityFields.jsx`, and `TrainerActivityFields.jsx`.
  - [x] Add `Save Draft` and `Submit Daily Activity` buttons with dirty-form confirmation.
- [x] **3.4 Lower Workspace — History & Follow-ups**:
  - [x] Create `ActivityHistoryTable.jsx`: Paginated table of user's past submissions.
  - [x] Create `FollowUpTracker.jsx`: Cards showing calls due today and upcoming follow-ups with one-click lead access.
- [x] **3.5 Admin Activity Overview & Review Workflow**:
  - [x] Create `AdminActivityOverview.jsx` for Admin / Manager roles.
  - [x] Add filters: Department dropdown, Employee search autocomplete, Date range picker, Status filter.
  - [x] Add summary cards: Total Expected, Submitted, Drafts, Needs Correction, Missing.
  - [x] Create `ActivityReportDrawer.jsx` for detailed inspection.
  - [x] Implement **Approve** and **Request Correction** (with mandatory reason textarea).

---

### Phase 6: Legacy Task/TODO Safe Retirement & Redirection
- [x] **6.1 Preserve Call Follow-ups**:
  - [x] Verify `followups.js` is isolated and accessible via `/api/followups`.
- [x] **6.2 Update Navigation & Fallback Redirects**:
  - [x] In `routes.jsx`: Replace `!canViewDashboard ? "/tasks"` with `"/daily-activity"`.
  - [x] In `Login.jsx`: Replace `/tasks` redirect with `/daily-activity` or `/dashboard`.
  - [x] In `Forbidden.jsx`: Update return button to `/daily-activity`.
  - [x] In `Sidebar.jsx`: Replace `Tasks` nav item with `Daily Activity` (Calendar icon).
  - [x] In `Navbar.jsx`: Remove `Tasks` and `TODO List` menu links.
  - [x] In `MandatoryAttendanceModal.jsx`: Permanently remove Step 2/2 Todo form and restore pure single-step Attendance clock-in.
- [x] **6.3 Clean Code Deletion (Completed Frontend, Backend & Unmount)**:
  - [x] Delete `frontend/src/modules/tasks/`.
  - [x] Delete `frontend/src/components/dashboard/Task/` and `Todo/`.
  - [x] In `backend/src/app/routes.js`: Unmount `/tasks` and `/todos`.
  - [x] Delete `backend/src/modules/tasks/tasks.js` and `todos.js`.
  - [x] Remove `Task.js` and `Todo.js` from `backend/src/database/models/`.
- [x] **6.4 Database Backup & Migration (Completed)**:
  - [x] Export JSON backup of MongoDB `tasks` (11 docs) and `todos` (71 docs).
  - [x] Safely drop `tasks` and `todos` MongoDB collections after backup verification.

---

### Phase 7: Quality Assurance, Security & Regression Testing
- [x] **7.1 Security & RBAC Checks**:
  - [x] Verify Telecaller sees only their own calls, calendar, and history.
  - [x] Verify non-admin cannot access `/api/daily-activities/admin/overview`.
  - [x] Verify client cannot tamper with `employeeId` or `status` in payload.
- [x] **7.2 Telecalling Validation Checks**:
  - [x] Submit invalid call counts (`attempted: 10, connected: 15`) -> Confirm rejected with HTTP 422.
  - [x] Select outcome `Follow-up Required` without date -> Confirm rejected.
- [x] **7.3 Zero Regression Checks**:
  - [x] Test `/digital-calendar`: Confirm Marketing calendar and cards function 100% normally.
  - [x] Test Leads & Follow-ups: Confirm lead calling and follow-up reminders are fully functional.
- [x] **7.4 Production Build**:
  - [x] Run `npx vite build --emptyOutDir` in `frontend/` to confirm 0 compilation/lint errors.
  - [x] Verify backend boots with zero missing module imports.

---

## 6. Implementation Guardrails

1. **Digital Marketing Isolation**: Never touch `DigitalCalendar.jsx`, `digitalCalendarAPI`, or marketing routes.
2. **Call Follow-ups Protection**: Never delete or unmount `followups.js` when retiring tasks.
3. **Database Backup First**: Always export `tasks` and `todos` before dropping collections.
4. **Trusted Identity**: Always derive `employeeId` from `req.user._id` via verified JWT token.
5. **No Broken Links**: Cleanly re-route all legacy `/tasks` paths across routes, guards, and error pages.