# Audio Conversation Deletion — Implementation Plan

## 1. Objective

Implement secure, complete deletion for audio conversations in the CRM.

When an authorized user deletes an audio conversation from the frontend:
1. The backend verifies authentication and permission.
2. The associated audio asset is deleted from Cloudinary.
3. The associated conversation/transcription document is deleted from MongoDB.
4. The frontend removes the item only after the backend confirms success.
5. The API returns a clear success or failure response.

**Important:** Never delete Cloudinary assets directly from the frontend. Keep Cloudinary credentials and deletion logic on the backend.

## 2. Expected Architecture

```text
Website / Mobile App
        |
        | DELETE /api/audio-conversations/:id
        v
Node.js Backend
        |-- Authenticate and authorize the requester
        |-- Find the MongoDB conversation document
        |-- Read the exact Cloudinary public_id
        |-- Delete the Cloudinary asset
        |-- Delete the MongoDB document
        |-- Return a structured result
        v
Frontend updates the list after confirmed success
```

The website and mobile app must use the same backend API.

## 3. Data Requirements

Inspect the existing MongoDB schema/model first. Reuse existing fields where possible. Each conversation record should reliably identify its asset, for example:

- `_id`: MongoDB conversation ID
- `userId` / `ownerId`: owner or tenant according to the existing authorization model
- `audioUrl`: Cloudinary URL
- `cloudinaryPublicId`: exact Cloudinary `public_id`
- `resourceType`: Cloudinary resource type, if required by the upload configuration
- `transcript`: transcription text, if stored
- `createdAt`: recording date

Do not guess `public_id` from a URL if the exact value can be saved during upload. If the existing schema uses different names, follow it and document the mapping.

## 4. Backend Implementation

### Endpoint

`DELETE /api/audio-conversations/:id`

Use the project's existing route conventions, authentication middleware, validation, and error format. Do not create a duplicate endpoint if an equivalent endpoint already exists.

### Deletion flow

1. Validate the MongoDB ID.
2. Authenticate the requester.
3. Fetch the conversation record.
4. Confirm permission to delete it (owner, authorized manager/admin, and tenant checks as applicable).
5. Read the exact Cloudinary `public_id` and resource type from the saved record.
6. Delete the Cloudinary asset using the official Cloudinary server-side SDK and server-side environment credentials.
7. Handle the result carefully:
   - **Deleted:** continue.
   - **Not found:** treat as already absent only if the response is unambiguous and policy allows it; continue to remove the stale MongoDB record.
   - **Provider/configuration/permission/transient error:** do not claim full success. Preserve the MongoDB record so deletion can be retried and return a clear error.
8. After Cloudinary deletion is confirmed or the asset is confirmed already absent, delete the MongoDB conversation document.
9. Return a structured success response.
10. Log the outcome without exposing secrets or sensitive audio/transcript content.

If the record has no associated Cloudinary asset, define an explicit policy: allow deleting a metadata-only record or return a validation error. Document the choice.

## 5. Failure Handling and Reliability

Cloudinary and MongoDB do not share a distributed transaction. Design for partial failures.

- **Cloudinary deletion fails:** retain the MongoDB record and return an error; allow a safe retry.
- **Cloudinary asset is already missing:** remove the stale MongoDB record only after verifying the asset is genuinely absent.
- **Cloudinary deletion succeeds but MongoDB deletion fails:** report incomplete cleanup and provide a reliable retry/reconciliation path. Never tell the user both systems were cleaned.
- Make repeated DELETE requests safe and idempotent where possible.
- If needed, add a deletion status or cleanup-job mechanism for retrying partial failures. Keep the implementation minimal and explain the trade-off.
- Do not delete the MongoDB record first if doing so would lose the only saved `public_id`.

## 6. Frontend Implementation

Inspect the existing audio conversation list, details view, and delete button.

- Show a confirmation dialog with the conversation title/identifier where available.
- Prevent duplicate clicks while deletion is in progress.
- Call the backend DELETE endpoint; never call the Cloudinary Admin API from the browser.
- Remove the item from the list only after the backend confirms complete deletion.
- On failure, keep the item visible and show a clear, actionable error.
- Refresh or invalidate the relevant conversation list and counters after success.
- Ensure the same behavior works on the website and any mobile client using the shared API.
- Avoid logging audio URLs, credentials, or transcript contents unnecessarily.

Suggested confirmation text:

> Delete this audio conversation permanently? The linked audio recording in Cloudinary and the conversation/transcript record in MongoDB will be deleted. This action cannot be undone.

## 7. Environment and Security

- Reuse existing Cloudinary configuration if available.
- Keep `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in backend environment variables.
- Never expose `CLOUDINARY_API_SECRET` in frontend environment variables or mobile app bundles.
- Validate IDs and enforce authorization and tenant boundaries on every delete request.
- Do not rely on hiding a frontend button as authorization.
- Avoid logging secrets or signed/private URLs.
- Check whether the asset is stored as an `image`, `video`, or `raw` Cloudinary resource; use the matching `resource_type` for deletion. Follow the existing upload configuration.
- Only delete the asset linked to the authorized conversation. Do not delete unrelated database records or Cloudinary assets.

## 8. Testing Plan

Use disposable records/assets in a development or test environment.

1. Authorized user deletes a conversation: Cloudinary asset and MongoDB record are both removed.
2. Refresh the page: the deleted conversation does not reappear.
3. Verify the Cloudinary asset is no longer available according to its access configuration.
4. Unauthorized user attempts deletion: request is rejected; neither system is modified.
5. Invalid conversation ID: clear validation error; no deletion.
6. Nonexistent MongoDB record: appropriate 404/idempotent response; no unrelated asset deletion.
7. Cloudinary credentials/provider error: MongoDB record remains available for retry.
8. Cloudinary asset already missing: stale record is cleaned up according to the defined policy.
9. MongoDB deletion fails after Cloudinary succeeds: partial failure is reported and can be reconciled/retried.
10. Double-click/repeated DELETE: no unrelated records/assets are affected.
11. Other users' conversations, transcripts, and audio files remain unchanged.
12. Run frontend build, backend tests, and relevant regression checks.

## 9. Acceptance Criteria

- Frontend deletion calls the shared backend API.
- The exact linked Cloudinary asset is deleted using its saved `public_id`.
- The corresponding MongoDB conversation document, transcript, and metadata are deleted after successful Cloudinary cleanup.
- Failures are surfaced accurately; no false success messages.
- Authorization prevents cross-user and cross-tenant deletion.
- Website and mobile app remain compatible.
- No unrelated records/assets are deleted.
- Test and build results are reported honestly.

## 10. Required Final Report

After implementation, report:
1. Root cause / existing implementation found.
2. Files changed.
3. API route and response behavior.
4. Cloudinary deletion method and resource type used.
5. MongoDB fields used to locate the asset.
6. How partial failures and retries are handled.
7. Test cases passed/failed, including authorization and provider-failure tests.
8. Build/test output and remaining limitations.

**Execution instruction:** First inspect the current audio upload, Cloudinary integration, MongoDB model, routes, and frontend delete flow. Then implement the smallest safe change consistent with the existing codebase. Do not invent file paths, duplicate existing routes, change unrelated modules, or claim tests passed unless they were actually run.


------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Fix Call Recordings Audio Playback — Permanent Solution

## Project Context
We have a CRM application with:
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Audio Storage: Cloudinary
- Deployment: Render
- Backend API: `https://telecommunication-l3oz.onrender.com/api`

## Current Problem
The Call Recordings page displays:

`⚠️ File not found on server — Retry`

MongoDB contains recording metadata and transcripts, but some legacy audio files are missing.

Example MongoDB fields:
- `originalName`
- `storedName`
- `filePath`
- `url`
- `cloudinaryUrl: null`
- `cloudinaryPublicId: null`
- `transcript`
- `transcriptStatus: "done"`

The local recording file is missing, Render's filesystem is ephemeral, and the legacy recordings were not uploaded to Cloudinary. The transcript remains available in MongoDB.

## Objective
Implement a reliable, production-ready audio recording storage and playback system for both the website and mobile app, using the same backend APIs.

### 1. Inspect Before Modifying
- Inspect the existing `CallRecording` Mongoose model, recording upload flow, transcription pipeline, Cloudinary configuration, streaming routes, authentication, and frontend audio player.
- Reuse the existing architecture and conventions.
- Identify every place where recordings are created, uploaded, retrieved, streamed, or deleted.
- Do not assume that all existing recordings are missing; verify each recording's actual storage status.

### 2. Permanent Cloudinary Upload
- Ensure every new recording is uploaded to Cloudinary before it is considered successfully stored.
- Use the correct Cloudinary resource type and MIME type for the actual audio format.
- Save the following fields in MongoDB after a successful upload:
  - `cloudinaryUrl`
  - `cloudinaryPublicId`
  - `cloudinaryResourceType`
  - `originalName`
  - `storedName`
  - `size`
  - `mimeType`
  - `recordedAt`
  - `user`
  - `lead` and `phone`, when available
  - `transcript` and `transcriptStatus`
- Store the Cloudinary URL and public ID accurately. Do not fabricate asset IDs or URLs.
- Handle upload failures safely. Do not report a recording as successfully stored when its audio upload failed.
- Avoid duplicate uploads and duplicate MongoDB records when requests are retried.
- Ensure recordings uploaded from both the mobile app and website follow the same storage workflow.

### 3. Audio Playback
- Update the existing recording retrieval and streaming APIs to support Cloudinary-hosted audio and any valid legacy local files.
- Prefer the verified Cloudinary asset when `cloudinaryUrl` exists.
- If a valid local file exists for a legacy recording, continue supporting it.
- Never repeatedly proxy a missing recording back to the same Render service.
- Return meaningful HTTP status codes and error messages when an audio asset is genuinely unavailable.
- Preserve authentication and existing role/ownership authorization.
- Support browser audio playback, including HTTP Range requests if required by the existing streaming implementation.
- Ensure the frontend uses the correct playback URL and handles loading, playback errors, and retry states correctly.

### 4. Legacy Recordings
- Check each existing MongoDB recording against local storage and Cloudinary.
- If the original audio file exists somewhere, recover it and upload it to Cloudinary, then update the existing MongoDB document.
- Preserve the existing `_id`, transcript, user association, recording date, and other metadata during migration.
- Do not create duplicate recording documents.
- If the audio binary is genuinely missing everywhere, do not invent or reconstruct an audio file from the transcript.
- Preserve the transcript and metadata. Mark the audio as unavailable using an appropriate schema field or status, such as `fileAvailable: false`.
- Display a clear message such as `Audio unavailable — transcript preserved` instead of an endless Retry loop.

### 5. Frontend Changes
Inspect and update:
- `frontend/src/modules/communication/call-recordings/CallRecordings.jsx`
- `frontend/src/services/api.js`
- Any related transcript modal or audio player components.

Requirements:
- Play Cloudinary-backed recordings correctly.
- Show a loading state while audio is loading.
- Show Retry only when retrying can reasonably help.
- If the audio file is permanently missing, show an unavailable status without repeatedly retrying.
- Keep the transcript accessible even when audio is unavailable.
- After a successful deletion, update the UI without requiring a full page reload.
- Do not break existing recording filters, pagination, transcript display, or role-based access.

### 6. Secure Deletion
- When a user deletes a recording, verify authorization on the backend.
- Delete the actual Cloudinary asset using the correct `public_id` and `resource_type`.
- Delete the MongoDB record only according to the application's established deletion policy and after handling Cloudinary failures safely.
- Do not silently delete the database record if the Cloudinary deletion fails.
- Make repeated deletion requests safe and handle already-missing assets correctly.
- Do not delete unrelated Cloudinary assets.

### 7. Mobile and Website Compatibility
- Both clients must use the same backend API and MongoDB records.
- Do not depend on local frontend files or a particular device's filesystem for playback.
- Use a stable Cloudinary-backed URL or an authenticated backend streaming endpoint as appropriate.
- Verify CORS, authentication, and access permissions for both clients.

### 8. Error Handling and Logging
Add useful, non-sensitive logs for:
- Upload success or failure
- Cloudinary asset identifiers
- MongoDB save/update failures
- Playback failures
- Missing legacy assets
- Deletion failures

Never log API secrets, access tokens, or sensitive credentials.

### 9. Required Testing
Test and report the actual results for:
1. Upload a new recording from the website.
2. Upload a new recording from the mobile app.
3. Confirm the Cloudinary asset exists.
4. Confirm MongoDB contains the correct Cloudinary metadata.
5. Play the recording from the website.
6. Play the same recording from the mobile app.
7. Refresh and redeploy/restart the backend, then verify playback still works.
8. Verify transcript access when audio is unavailable.
9. Test a valid legacy local recording.
10. Test a legacy recording whose audio file is missing.
11. Test upload failure, playback 404, unauthorized access, and deletion failure.
12. Delete a recording and verify the Cloudinary asset and MongoDB record are handled consistently.
13. Run the frontend production build and relevant backend tests.

## Important Safety Rules
- Inspect existing code before making changes.
- Do not delete MongoDB collections or existing recordings in bulk.
- Do not clear or overwrite transcripts.
- Do not change unrelated CRM modules.
- Do not expose Cloudinary secrets or bypass authentication.
- Do not claim tests passed unless they were actually executed.
- Do not claim the issue is fixed based only on a successful build.

## Final Deliverable
Provide:
1. Root cause and files changed.
2. Exact upload, database-save, playback, and deletion workflow.
3. Legacy recording migration results, including how many files were recovered and how many remain unavailable.
4. API endpoints changed and relevant MongoDB schema changes.
5. Actual test results with pass/fail status.
6. Any environment variables or deployment configuration required.
7. Any remaining issues or manual steps.

Implement the fix in the existing project, preserve unrelated functionality, and verify end-to-end playback before declaring completion.







------------------------------------------------------------------------
# Feature: HR Counsellor / Telecaller Role with Telecalling Dashboard & Strict Navbar

## 1. Executive Summary & Objective

Implement a specialized **HR Counsellor / Telecaller** role (including User ID `6ab6449b62b25645faae28ed`) under the **HR** Department in the AOTMS CRM.
Telecaller Counsellors represent staff members situated within HR/Admissions whose primary day-to-day workflow is **Telecalling, Lead Follow-ups & Student/Client Engagement**:
- Handling assigned admissions/counselling Meta leads.
- Submitting daily calling performance activities (calls attempted, connected, follow-ups scheduled, conversion outcomes).
- Punching attendance and viewing attendance records.
- Conducting Email CRM communications with assigned contacts.

**Strict Navigation Constraint:**
Telecallers / Counsellors see **ONLY 4 Navbar / Sidebar items**:
1. **Daily Activity** (`/daily-activity`)
2. **Overall Marketing** (`/meta-leads` — showing **ONLY assigned Meta Leads**)
3. **Attendance** (`/:userId/attendance-records` or `/attendance-records`)
4. **Email CRM** (`/:userId/email` or `/email`)

---

## 2. Role & Identity Architecture

### MongoDB User Model (`backend/src/database/models/User.js`)
Target User `6ab6449b62b25645faae28ed`:
- `department`: `'HR'`
- `role`: `'employee'`
- `designation`: `'Counsellor'`
- `displayName`: `'Telecaller Councellor'`
- `approvalStatus`: `'accepted'`

### Role Classification Helpers (`frontend/src/utils/permissions.js` & Backend Middleware)
```javascript
export const isCounsellor = (user) => {
  if (!user) return false;
  const desig = String(user.designation || '').trim().toLowerCase();
  const dName = String(user.displayName || '').trim().toLowerCase();
  const dept = String(user.department || '').trim().toUpperCase();
  return (
    (dept === 'HR' || dept.includes('HR') || dept === 'TELECALLING') &&
    (desig.includes('councellor') || desig.includes('counselor') || dName.includes('councellor') || dName.includes('counselor'))
  );
};

export const isTelecaller = (user) => {
  if (!user) return false;
  if (user?.role === 'admin' || user?.role === 'superadmin' || isCEO(user)) return false;
  const desig = String(user.designation || '').trim().toLowerCase();
  const dName = String(user.displayName || '').trim().toLowerCase();
  const dept = String(user.department || '').trim().toLowerCase();
  const role = String(user.role || '').trim().toLowerCase();
  return (
    role === 'caller' ||
    desig.includes('telecall') || desig.includes('caller') || desig.includes('councellor') || desig.includes('counselor') ||
    dName.includes('telecall') || dName.includes('caller') || dName.includes('councellor') || dName.includes('counselor') ||
    dept.includes('telecall') || dept.includes('caller') ||
    isCounsellor(user)
  );
};
```

---

## 3. Strict Navbar & Navigation Configuration

### Navbar Layout (`frontend/src/components/dashboard/Navbar/Navbar.jsx`)
For Telecaller / Counsellor users (`isTelecaller(user)`):
The Navbar displays **EXCLUSIVELY 4 core headers**:
1. **Daily Activity**: Link to `/daily-activity` with `FaCalendarCheck` icon.
2. **Overall Marketing**: Bullhorn dropdown menu containing the complete Marketing suite:
   - **Leads**: Add Leads (`/leads/new`), All Leads (`/leads`), Campaigns (`/campaigns`)
   - **WhatsApp**: Contact (`/contacts`), WhatsApp Blast (`/whatsapp-blast`), WhatsApp (`/whatsapp`)
   - **Meta Leads**: Link to `/meta-leads` with `Google Sheets` badge (assigned campaigns/leads only)
   - **Performance**: Leaderboard (`/leaderboard`), Report (`/reports`)
3. **Attendance**: Link to `/:userId/attendance-records` with `FaCalendarCheck` icon.
4. **Email CRM**: Link to `/:userId/email` with `FaEnvelopeOpenText` icon.

*(Executive/Manager menus like Dashboard, Finance, Management, and Developer tools are completely hidden).*

### Sidebar Layout (`frontend/src/components/Layout/Sidebar.jsx`)
For Telecallers, sidebar items match identically:
- `Daily Activity` (`/daily-activity`)
- **Overall Marketing** (expandable groups):
  - Leads (Add Leads, All Leads, Campaigns)
  - WhatsApp (Contact, WhatsApp Blast, WhatsApp)
  - Meta Leads (`/meta-leads`)
  - Performance (Leaderboard, Report)
- **My Workspace**:
  - `Attendance` (`/:userId/attendance-records`)
  - `Email CRM` (`/:userId/email`)

### Default Route & Guards (`frontend/src/app/routes.jsx`)
- Default landing route: `getDefaultHomeRoute(user)` routes Telecallers directly to `/daily-activity`.
- `MetaLeadsRoute`: Permits Telecallers and Counsellors to view `/meta-leads`.
- `StaffRestrictedRoute`: Permits Telecallers and Counsellors to access Marketing modules (`/leads`, `/campaigns`, `/whatsapp`, `/leaderboard`, `/reports`).
- Admin/Finance/Management routes: Strictly blocked with redirect to `/daily-activity`.

---

## 4. Meta Leads Data Scoping & Assigned Leads Only

### Backend Protection (`backend/src/modules/marketing/meta-leads/metaLeads.js`)
- `isExecutiveOrAdminUser(user)` classifies telecallers, callers, counsellors as restricted staff.
- `GET /api/meta-leads/campaigns`: Returns only campaigns where `MetaCampaignAssignment.assignedUsers` contains the current user's ID.
- `GET /api/meta-leads`: Scopes query to `query.campaign = { $in: allowedCampaigns }`. If no campaigns are assigned, returns 0 leads with `isRestricted: true`.
- If an unauthorized campaign is requested, returns `403 Forbidden`.

### Frontend Experience (`frontend/src/modules/marketing/meta-leads/MetaLeads.jsx`)
- "All Campaigns" tab is hidden for restricted staff.
- Shows "Your Assigned Campaigns:" pills.
- Admin controls (Assign Members, Clear All) are hidden.
- If zero campaigns are assigned, displays clear empty state directing user to contact CRM Admin.

---

## 5. Daily Activity Workspace (`/daily-activity`)

- Counsellors/Telecallers submit daily reports with calling performance fields enabled:
  - Calls Attempted, Calls Connected, Unanswered Calls, Interested Leads, Follow-ups Scheduled, Conversions.
- Daily submissions are sanitized and saved with calling metrics preserved in MongoDB.

---

## 6. Access Control & Security Matrix

| Feature / Route | Admin / CEO | HR Manager | Telecaller / Counsellor | Developer / Trainer |
| :--- | :---: | :---: | :---: | :---: |
| **Navbar Items** | Full Menu (Info, Mkt, Fin, Mgmt, Dev) | Full Menu | **Daily Activity, Overall Marketing, Attendance, Email CRM ONLY** | Info, Email CRM, Attendance |
| **Landing Route** | `/dashboard` | `/dashboard` | **`/daily-activity`** | `/daily-activity` |
| **Meta Leads** | All Campaigns & Leads | All Campaigns | **Assigned Campaigns & Leads ONLY** | Strictly Blocked |
| **Daily Activity** | Overview & Approve | Overview & Approve | **Submit Calling Metrics** | Submit Dev/Trainer Report |
| **Email CRM** | Full Access | Full Access | **Personal Lead Email** | Personal Lead Email |
| **Attendance** | All Staff Records | All Staff Records | **Personal Records & Punch In** | Personal Records & Punch In |
| **Delete Records** | Yes | No | **No (Strictly Disabled)** | No |