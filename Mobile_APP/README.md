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
