## Website Cache Memory & Data Refresh — Investigation Questions

**Problem Statement:**

When a user opens the website, old or cached data may still be displayed. After refreshing the page, new data is triggered or loaded, but old cache data may remain in the browser, Console, or Application Storage.

Please investigate the complete frontend and backend data flow and answer the following questions.

### 1. Cache Investigation
1. Is the website storing old data in browser cache, `localStorage`, `sessionStorage`, `IndexedDB`, or an in-memory state?
2. Are API responses being cached by the browser, service worker, React Query, Axios, or another caching mechanism?
3. Is any old data remaining after logout, login, page navigation, or switching users?
4. Does the browser's Application tab show outdated data in Local Storage, Session Storage, IndexedDB, Cache Storage, or Service Workers?

### 2. Data Refresh & API Investigation
5. When the website opens, does it fetch the latest data from the backend, or does it first display cached data?
6. When new data is added or updated, why might the UI continue to show old data until a page refresh?
7. Are API requests returning fresh responses, or are they returning cached responses? Check the Network tab and response headers.
8. Are React state, `useEffect`, API dependencies, or data-fetching functions preventing the UI from updating automatically?

### 3. Console & Browser Storage
9. Are there any Console errors, warnings, failed API requests, or stale state issues?
10. Is old data being stored in browser storage unnecessarily?
11. Are service workers or HTTP cache headers causing outdated JavaScript, CSS, or API responses to load?
12. Can we identify exactly where the old data is stored and which component or API request uses it?

### 4. Required Fixes
13. Can we update the UI immediately after successful Create, Update, or Delete operations without requiring a manual page refresh?
14. Can we invalidate or refresh only the relevant cached data instead of clearing all browser storage?
15. Can we ensure that one user's cached data is never displayed to another user after login or account switching?
16. Can we implement a reliable cache invalidation and data synchronization strategy without affecting authentication, permissions, or existing functionality?

### Expected Result
- Identify the exact source of stale data.
- Explain why the old data remains after refreshing or navigating.
- Fix the root cause instead of applying unnecessary cache-clearing workarounds.
- Verify the fix using browser DevTools, Network requests, Application Storage, and backend API responses.
- Test Create, Update, Delete, Login, Logout, and account switching.
- Provide the files modified, root cause, fix details, and test results.

**Important:** Do not clear all browser storage or delete existing database data as a first step. Inspect the actual cache mechanism and implement the safest targeted fix. Do not modify unrelated modules.

-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Task: Fix CRM Stale Data, Cache, and User Session Issues

## Objective
Analyze and fix the root causes of stale UI data, outdated browser storage, delayed data synchronization, and cross-user data leakage in the existing CRM application.

**Important:** First inspect the existing codebase and implement fixes based on the actual architecture. Do not rewrite the application or modify unrelated modules.

## 1. Fix User-Specific Local Storage

Inspect `frontend/src/context/AuthContext.jsx`, `frontend/src/services/auth/authService.js`, and all usages of `localStorage`.

Known keys include:
- `aotms_token`
- `aotms_user`
- `aotms_bulk_uploads`
- `wa_active_lead_id`
- Legacy keys: `token`, `user`

Requirements:
- On logout, clear authentication data and only the relevant user-specific temporary or cached data.
- On login or account switching, ensure the previous user's data is never displayed to the new user.
- Scope locally stored user-specific data by authenticated user ID wherever persistence is required.
- Preserve legitimate data that must survive logout, and do not delete unrelated application settings.
- Prevent the previous user's profile from appearing while the new session is being validated.
- Never rely on frontend storage alone for authorization. The backend must validate the authenticated user and permissions.

## 2. Fix Stale Data After Create, Update, and Delete

Inspect all relevant modules, especially:
- Leads
- Dashboard and KPI metrics
- Daily Activity
- Attendance
- Reports
- Contacts and Campaigns
- WhatsApp
- Tasks or follow-ups where applicable

Requirements:
- After a successful Create, Update, or Delete operation, update the relevant UI immediately.
- Use existing parent callbacks, targeted API refetching, or safe optimistic updates as appropriate.
- Synchronize related components when they display the same underlying backend data.
- Ensure status changes, approvals, attendance actions, and form submissions update the UI without requiring a manual page refresh.
- Handle failed requests by reverting optimistic changes or displaying a clear error.
- Prevent duplicate API requests and stale responses from overwriting newer data.

## 3. Fix Data Fetching and React State

Inspect `useEffect`, `useCallback`, component state, dependency arrays, filters, pagination, modals, drawers, and route changes.

Requirements:
- Ensure API requests run when their actual dependencies change.
- Reset or validate pagination and filters when appropriate.
- Avoid stale closures and outdated state references.
- Refresh data when returning to a page if the underlying data may have changed.
- Where useful, implement a lightweight shared data synchronization mechanism consistent with the existing project architecture.
- Do not introduce React Query, Redux, or another major dependency unless it is justified and approved.

## 4. Verify Browser and API Caching

Inspect:
- `frontend/src/services/api.js`
- `frontend/src/services/api/interceptors.js`
- `backend/src/app/app.js`
- `frontend/index.html`

Requirements:
- Verify that GET requests return the latest data when freshness is required.
- Check actual request and response headers in the browser Network tab.
- Confirm whether any CDN, proxy, browser, or backend caching layer affects API responses.
- Do not assume request headers alone guarantee fresh responses; verify the actual behavior.
- Preserve efficient caching for static assets where appropriate.
- Do not add unnecessary timestamps to every request unless needed and compatible with existing API behavior.

## 5. Protect Existing Functionality

- Do not use `localStorage.clear()` as a blanket fix.
- Do not delete MongoDB collections, documents, or user data.
- Do not change database schemas or authentication architecture without demonstrating the need.
- Do not break JWT authentication, refresh-token handling, role-based permissions, or multi-user functionality.
- Do not modify unrelated UI design or business logic.
- Preserve all existing API contracts unless a change is necessary and documented.

## 6. Testing Requirements

Test and report the results for:

1. Login as User A and create or view user-specific data.
2. Logout and login as User B in the same browser.
3. Verify that User A's private or user-specific data does not appear for User B.
4. Create a lead and confirm the Leads list and relevant Dashboard metrics update.
5. Update a lead's status and confirm all relevant views show the updated status.
6. Delete a record and confirm it disappears from the UI.
7. Submit Daily Activity or Attendance data and confirm the relevant views update.
8. Navigate between modules and verify data consistency.
9. Simulate an API failure and verify the UI handles it safely.
10. Verify browser Network, Application Storage, and Console for stale data, unexpected storage persistence, and errors.
11. Run the frontend production build and relevant backend tests.

## 7. Final Report

Provide:
- Root cause identified for each issue.
- Files modified and the purpose of each change.
- Fixes implemented.
- Test cases passed and failed.
- Build and backend test results.
- Any remaining issues or limitations.

**Acceptance Criteria:** The CRM displays current backend data without unnecessary manual refreshes, does not expose one user's locally stored data to another user, preserves authentication and existing functionality, and passes the relevant regression tests.

Start by auditing the existing implementation, then apply targeted fixes and verify them. Do not report a fix as complete unless it has been implemented and tested.