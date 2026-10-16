# AOTMS Telecommunication CRM - Mobile Application

Next-generation Cross-Platform Mobile Application built with **React Native & Expo**, connecting directly to the **AOTMS CRM Enterprise Cloud Backend**.

---

## 🚀 Connected Backend
- **Live Cloud Base URL**: `https://telecommunication-l3oz.onrender.com/api`
- All data (Leads, Campaigns, Contacts, WhatsApp blasts, Attendance, Call Recordings, and Auth) replicates and syncs in real time with the web CRM database.

---

## 📱 Features Included

### 1. Landing Page
- Premium dark & neon-cyan enterprise design.
- Brand logo & value proposition cards.
- Real-time cloud connectivity status badge.
- Quick navigation to Sign In & Account Creation.

### 2. Authentication (Login & Signup)
- **Sign In**: Email & password authentication with JWT token storage via `@react-native-async-storage/async-storage`.
- **Register**: User onboarding with name, phone, email, and role selector (Caller, Staff, Manager, Admin).
- Persistent session: Automatically resumes logged-in agents on app launch.

### 3. Dashboard
- **Live Real-Time KPIs**: Total Leads, Fresh Leads, Won Deals, and Today's Connected Calls.
- **Punch Clock Status**: Live attendance indicator (Punched In / Punched Out).
- **Recent Leads**: Preview of latest CRM entries with 1-touch actions.
- **Pull-To-Refresh**: Instant cloud data reload.

### 4. CRM Modules & Features
| Module | Capabilities |
| :--- | :--- |
| **Add Lead** | Form with name, phone, email, course interest, initial status, source, budget, and notes. Posts to `/api/leads`. |
| **All Leads** | Search by name/phone/email, status filter chips, 1-touch Phone dialer (`tel:`), 1-touch WhatsApp launcher, status update modal. |
| **Campaigns** | View active marketing campaigns from `/api/campaigns`, total leads attached, launch new campaigns. |
| **Contacts** | Phonebook directory from `/api/contacts`, search, add contact, direct call & chat buttons. |
| **WhatsApp Blast** | Bulk marketing broadcaster with target audience selector (`leads_all`, `leads_fresh`, etc.), merge tags (`{name}`, `{phone}`), preset templates, and history logs. |
| **WhatsApp Direct**| 1-on-1 instant messenger with pre-filled consultation templates and direct app deep-linking (`https://wa.me/...`). |
| **Attendance** | Shift stopwatch timer, Clock In / Clock Out, Break tracker, and recent punch records from `/api/attendance`. |
| **Call Recordings**| Audio call logs from `/api/recordings`, inline audio streaming playback with play/pause and duration tags. |

---

## 🛠️ How to Run & Test

### Run locally on Expo:
```bash
cd Mobile_APP
npx expo start
```

1. Install **Expo Go** from Google Play Store or Apple App Store on your phone.
2. Scan the terminal QR code with your phone camera (iOS) or Expo Go app (Android).
3. The app will bundle and run live on your mobile device!

### Web preview (Optional):
```bash
npx expo start --web
```

### Build Android Standalone APK:
```bash
npx eas-cli login
npx eas-cli build -p android --profile preview
```

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Mobile App Integration Fix --- Recordings & Attendance
Backend API: https://telecommunication-l3oz.onrender.com/api
Objective
Connect the mobile app to the existing CRM backend and website. In
Recordings, users should select a folder, choose audio files, and
upload them so the files and their metadata appear and play in the
website's Call Recordings section. The mobile app's Attendance
screens must use the same backend data and rules as the existing
website.
1. Inspect Before Editing
Inspect the mobile framework, API client, authentication/session flow,
Recordings screen, file picker, Attendance screens, and backend
routes/controllers/services/models. Find the exact recording and
attendance endpoints, request fields, response formats, authentication
requirements, and audio-storage provider.
Do not invent endpoint paths. Do not break the existing website.
Reuse current routes and data models wherever possible.
2. Backend Connection
- Configure the API base URL in one environment/config setting.
- Avoid duplicate or missing /api path segments.
- Reuse the existing authentication mechanism.
- Handle timeouts, offline/network errors, 401, 403, and server
  errors.
- Never bundle backend secrets or log access tokens.
- Verify connectivity from a physical mobile device.
3. Recordings Workflow
Open Recordings
  → Select Folder / Audio
  → Request required OS permission
  → List accessible audio files
  → User selects file(s)
  → Validate file type/size
  → Upload through existing recording endpoint
  → Backend stores audio durably and saves metadata
  → Website Call Recordings list refreshes
  → Verify playback
File picker and upload rules
- Use the platform's native document picker. On Android, prefer the
  system picker/Storage Access Framework over broad storage access.
- Use the selected file URI/stream; do not assume a folder path is
  directly readable or send a local path instead of audio bytes.
- Confirm supported formats and file-size limits from backend
  code/configuration.
- Match the existing API's exact multipart field names and content
  type; do not guess.
- Show filenames, upload progress/status, success/failure, and retry
  controls.
- Avoid loading large audio files fully into memory when streaming is
  supported.
- Prevent duplicate uploads on repeated taps/retries.
- Reuse the existing durable storage provider. Do not store audio only
  on the phone or a temporary server filesystem.
Website verification
Use the response's recording ID/metadata if available, refresh the
existing recordings list, and verify both metadata and audio playback. A
database record alone does not prove that the audio was stored and can
play.
4. Attendance Integration
- Use the real existing attendance endpoints and exact payloads.
- Display real backend data, not mock or hardcoded production data.
- Reuse existing check-in/check-out, late attendance, location/device,
  and mandatory-attendance rules only where they exist in the current
  system.
- Prevent duplicate actions from rapid taps or retries.
- Refresh status/history after successful actions.
- Keep the backend as the source of truth for attendance records and
  timestamps.
- Handle denied permissions, offline state, expired sessions, and
  validation errors.
- If a required operation has no endpoint, implement it using existing
  backend conventions and add tests/documentation.
5. Security
- Derive the acting user from the authenticated session/token; do not
  trust a client-supplied user ID.
- Enforce authorization on the backend, not just by hiding UI buttons.
- Ensure users can access only recordings and attendance allowed by
  their permissions.
- Use the existing refresh/re-login flow for expired sessions; avoid
  infinite retries.
- Never fabricate location/device data or bypass attendance
  validation.
6. Mobile UI
Provide clear navigation, loading/empty states, permission explanations,
readable errors, upload progress, per-file results, and retry controls.
Disable duplicate submissions while an operation is running. Do not show
raw stack traces to users.
7. Testing Checklist
Recordings
- [ ] Select a folder and upload one audio file.
- [ ] Upload multiple selected files.
- [ ] Cancel the picker without a crash.
- [ ] Handle denied access, unsupported formats, and oversized files.
- [ ] Test a large file, offline upload, timeout, and retry.
- [ ] Verify retries do not create unwanted duplicates.
- [ ] Confirm metadata and audio are stored.
- [ ] Confirm the recording appears and plays on the website.
- [ ] Confirm unauthorized access is rejected.
Attendance
- [ ] Load real attendance data for the logged-in user.
- [ ] Test all supported attendance actions.
- [ ] Confirm mobile and website data are consistent.
- [ ] Test repeated taps, retries, expired sessions, and validation
  errors.
- [ ] Test required location/device permissions on a physical device.
- [ ] Confirm users cannot access another employee's restricted
  attendance.
Release
- [ ] Remove mock data from production screens.
- [ ] Ensure no secrets are bundled in the app.
- [ ] Build/lint/tests pass.
- [ ] Test on a physical device against the deployed backend.
- [ ] Confirm website login, recordings, and attendance still work.
8. Definition of Done
1. The app connects to the configured backend.
2. Folder selection returns usable audio file URIs/streams.
3. Audio uploads through the existing API.
4. The backend stores audio durably and saves metadata.
5. Recordings appear and play on the website.
6. Attendance uses real backend data and existing rules.
7. Authentication, permissions, errors, and retries work.
8. Physical-device tests pass without breaking the website.
Required Completion Report
After implementation, report: - Files changed. - Exact recording and
attendance endpoints used. - Request/response format for each
endpoint. - Audio storage destination. - Tests run and results. -
Remaining blockers with exact errors and reproduction steps.
Do not claim a feature works unless tested. If an endpoint, permission,
or storage configuration is missing, state that explicitly rather than
inventing a replacement.



# Mobile Audio Folder Sync + Full CRUD --- README

## Goal

Implement a **folder-based audio sync system**, not a manual one-file
upload flow.

When a user selects an accessible folder in the mobile app, the app
should scan the folder, identify all supported audio files, and sync
them into the existing CRM backend. The same recording library must then
be accessible from both the mobile app and the existing website. Users
must have the appropriate **Create, Read, Update, and Delete (CRUD)**
operations for recordings, subject to permissions.

**Backend API base URL:**
`https://telecommunication-l3oz.onrender.com/api`

> Inspect the current repository first. Reuse the existing recording,
> authentication, storage, and attendance APIs where possible. Do not
> invent endpoint paths or break the running website.

## 1. Required User Workflow

``` text
Mobile App → Recordings → Select Folder
                         ↓
                 Request OS permission
                         ↓
              Scan selected folder recursively
                         ↓
             Find supported audio files
                         ↓
            Show file list and sync status
                         ↓
             Sync selected folder contents
                         ↓
          Backend stores audio + metadata
                         ↓
        Shared recording library is updated
                   ↙             ↘
             Mobile App        CRM Website
```

Folder selection is the starting point. The app should discover and
process **all supported audio files inside the selected folder**, not
require the user to pick each audio file one by one. Before syncing,
show the detected file count and let the user confirm. If recursive
subfolder scanning is supported by the OS picker, include subfolders;
otherwise explain the limitation clearly.

## 2. Folder Scanning and Sync Rules

-   Use the native folder/document picker appropriate for the mobile
    framework and OS.
-   On Android, use the Storage Access Framework where applicable.
    Respect scoped-storage restrictions and URI permissions.
-   A selected folder may expose content through document URIs rather
    than ordinary filesystem paths. Use the URI/stream APIs correctly.
-   Filter by supported audio MIME types/extensions confirmed from the
    backend's actual accepted formats.
-   Display filename, size, duration if available, modified date if
    available, and sync status.
-   Do not upload unsupported files or silently ignore errors. Show a
    summary of skipped files and reasons.
-   Handle empty folders, permission denial, inaccessible files, and
    revoked URI access.
-   Do not scan the entire phone. Only process the folder explicitly
    selected by the user.
-   Avoid loading every audio file into memory at once.
-   Support large folders with bounded concurrency, progress updates,
    pause/cancel where practical, and retry for failed items.
-   Do not create duplicate records each time the same folder is
    scanned. Use the backend's existing IDs or a stable deduplication
    strategy supported by the data model (for example, source
    identifier + file fingerprint/size/modified time). Do not rely on
    filename alone as a globally unique identifier.
-   Provide a final sync report: discovered, synced, already synced,
    skipped, and failed counts.

## 3. Shared Backend and Website Library

The mobile app and website must use the same backend recording records
and durable audio storage:

``` text
Mobile Folder Scanner ─┐
                       ├→ Existing Recording API → Auth/Validation
Website Recording UI ──┘                           ↓
                                      Audio Storage + Metadata DB
                                                   ↓
                                    Mobile App + Website Library
```

-   Inspect existing backend routes, models, and storage provider before
    implementation.
-   Store audio using the project's existing **durable** storage
    provider; do not depend on temporary server disk or app-local
    storage for shared recordings.
-   Save metadata required by the existing website, such as recording
    ID, original filename, content type, size, storage reference,
    uploader, created time, and supported call/employee references.
-   Do not fabricate call IDs, employee IDs, call dates, or attendance
    links. Attach metadata only when it can be reliably identified.
-   If existing website recordings are linked to call records, preserve
    that relationship and display imported folder audio as an imported
    recording/source where appropriate.
-   After sync, refresh the website library and verify that the audio
    can actually play.
-   Keep existing website recording retrieval and playback behavior
    compatible.

## 4. Recording CRUD

Implement or repair these operations using the existing backend's
conventions and exact routes:

### Create

-   Sync supported audio files from the selected folder.
-   Validate file type/size and authorization on the backend.
-   Store audio durably and create metadata records.
-   Deduplicate repeat scans and retries.

### Read

-   List recordings in the mobile app and website from the same backend.
-   Support pagination for large libraries, search/filtering where
    appropriate, and audio playback.
-   Display useful metadata and sync/import status.
-   Enforce user/organization permissions on list and playback requests.

### Update

-   Allow authorized users to edit supported metadata such as display
    title, category, notes, or call/employee association **only if these
    fields are supported by the current data model and business rules**.
-   Do not modify the actual audio bytes when editing metadata.
-   If replacing audio is a supported requirement, implement it as a
    separate explicit action with validation and safe storage
    replacement.
-   Reflect changes in both mobile and website views.

### Delete

-   Allow authorized users to delete a recording through the backend.
-   Clarify whether deletion means archive/soft delete or permanent
    delete, based on current CRM rules.
-   Ensure storage cleanup and metadata updates remain consistent. Avoid
    leaving orphaned audio objects.
-   Confirm the deleted item disappears from both app and website.
-   Protect against deleting a recording the current user is not
    authorized to manage.

Every CRUD operation must be authenticated, authorized, validated, and
tested on the backend. UI-only restrictions are not sufficient.

## 5. Attendance Must Continue Working

The existing website already has Attendance. Keep it working and connect
the mobile app to the existing attendance endpoints and rules.

-   Use actual backend attendance data, not mock data.
-   Preserve the existing check-in/check-out and any current
    device/location/mandatory-attendance validation.
-   Do not invent attendance records from audio file names or recording
    timestamps.
-   Keep recording sync separate from attendance actions unless the
    existing CRM explicitly links them.
-   Test that changes do not break website attendance or the mobile
    attendance screens.

## 6. API and Security Requirements

-   Use `https://telecommunication-l3oz.onrender.com/api` as the
    configured base URL.
-   Discover actual endpoint paths from backend source code; document
    HTTP methods, request fields, response formats, and auth
    requirements.
-   Do not duplicate `/api` in URL construction.
-   Reuse existing login/session/token handling.
-   The backend derives the acting user from authentication; never trust
    a client-supplied uploader/user ID as proof of identity.
-   Enforce tenant/organization and role permissions server-side.
-   Validate file content/type, size, metadata, and access rights.
-   Use safe filenames and avoid path traversal.
-   Handle `401`, `403`, `404`, `409` duplicate/conflict, `413`
    too-large, `415` unsupported type, `429` rate limiting, and `5xx`
    failures appropriately.
-   Do not expose storage secrets or private API keys in the app.
-   Add rate limits and bounded upload concurrency where appropriate.
-   Use idempotency/deduplication for retry-safe sync.
-   Log operational errors without logging tokens or sensitive content.

## 7. UI Requirements

The Recordings screen should include:

-   **Select Folder** action.
-   Selected folder label (as permitted by the OS).
-   Scan progress and discovered audio count.
-   Audio file list with name, size, and status.
-   **Sync Folder** / **Sync Again** action.
-   Overall progress and per-file status: Pending, Syncing, Synced,
    Already Synced, Skipped, Failed.
-   Pause/cancel/retry controls where supported.
-   Recording library with playback and permitted metadata
    editing/deletion.
-   Search/filter/pagination for large libraries.
-   Empty state and understandable permission/error messages.
-   Sync summary after completion.

## 8. Testing Checklist

### Folder scan and sync

-   [ ] Select a folder containing multiple supported audio files.
-   [ ] Confirm all supported files in the selected folder are
    discovered.
-   [ ] Test nested subfolders where supported.
-   [ ] Confirm files outside the selected folder are untouched.
-   [ ] Handle empty folders, unsupported files, denied access, and
    revoked permissions.
-   [ ] Test large folders and large audio files.
-   [ ] Test offline interruption, timeout, app restart, and retry.
-   [ ] Verify repeated scans do not create duplicates.
-   [ ] Confirm sync progress and summary counts are accurate.

### Shared library and CRUD

-   [ ] Synced files appear in the mobile recording library.
-   [ ] The same files appear on the website.
-   [ ] Audio playback works from both app and website.
-   [ ] Metadata updates are reflected in both clients.
-   [ ] Delete/archive is reflected in both clients and storage remains
    consistent.
-   [ ] Unauthorized users cannot list, play, update, or delete
    restricted recordings.

### Attendance and release

-   [ ] Existing mobile attendance flows use real backend data.
-   [ ] Website attendance still works unchanged.
-   [ ] Build, lint, and automated tests pass.
-   [ ] End-to-end tests pass on a physical device against the deployed
    backend.

## 9. Definition of Done

Complete only when:

1.  Selecting a folder scans all accessible supported audio files within
    it.
2.  Folder contents sync to the existing backend automatically after
    user confirmation.
3.  Repeat scans are safe and do not create duplicates.
4.  Both mobile app and website use the same durable audio library.
5.  Recording Create, Read, Update, and Delete work with correct
    permissions.
6.  Audio playback works from both clients.
7.  Existing attendance and website functionality remain intact.
8.  Tests and real-device verification pass.

## 10. Required Implementation Report

After coding, report: - Files changed. - Mobile framework and
folder-picker implementation used. - Exact existing/new API endpoints
and HTTP methods. - Deduplication strategy. - Audio storage provider and
metadata model. - CRUD behavior, including delete/archive semantics. -
Tests executed and their actual results. - Any OS limitation or missing
backend configuration.

Do not report success based only on compilation. Do not invent
endpoints, claim untested behavior works, or replace the existing
working website implementation.
