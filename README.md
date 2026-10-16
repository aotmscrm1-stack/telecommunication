# AOTMS Telecommunication CRM — Enterprise Master Documentation

Complete architectural, operational, and UI/UX design implementation guide for the **AOTMS Telecommunication Enterprise CRM Ecosystem** across the Web Portal, Mobile Application, and Cloud Backend.

---

## 📑 Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Meta Leads & Campaign Assignment Engine (UI/UX Deep-Dive)](#2-meta-leads--campaign-assignment-engine-uiux-deep-dive)
3. [Design System & UI/UX Principles](#3-design-system--uiux-principles)
4. [Role-Based Access Control (RBAC) & Permission Architecture](#4-role-based-access-control-rbac--permission-architecture)
5. [Audio Call Recordings Hub & English Chatting (Telugish) AI Transcription](#5-audio-call-recordings-hub--english-chatting-telugish-ai-transcription)
6. [Cross-Platform Mobile Application (React Native & Expo)](#6-cross-platform-mobile-application-react-native--expo)
7. [API Endpoints & Integration Reference](#7-api-endpoints--integration-reference)
8. [Setup, Deployment & Operational Runbook](#8-setup-deployment--operational-runbook)

---

## 1. Executive Summary & System Architecture

The **AOTMS Telecommunication CRM** is an enterprise-grade platform uniting tele-calling, lead management, marketing campaign assignment, WhatsApp messaging, attendance clocking, and call recording analytics.

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    Client Layer                        │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                ┌──────────────────────────┴──────────────────────────┐
                                ▼                                                     ▼
                 ┌─────────────────────────────┐                       ┌─────────────────────────────┐
                 │   Web CRM Portal (React)    │                       │  Mobile App (React Native)  │
                 │  Vite • TailwindCSS • Framer│                       │  Expo • Lucide • SVG Icons  │
                 └──────────────┬──────────────┘                       └──────────────┬──────────────┘
                                │                                                     │
                                └──────────────────────────┬──────────────────────────┘
                                                           │
                                                           ▼
                               ┌────────────────────────────────────────────────────────┐
                               │             Node.js / Express Backend Engine           │
                               │  REST API • WebSocket • JWT • Multer • Audio Streaming │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                 ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                 ▼                                         ▼                                         ▼
  ┌─────────────────────────────┐           ┌─────────────────────────────┐           ┌─────────────────────────────┐
  │    MongoDB Atlas Cluster    │           │     OpenAI Whisper & AI     │           │     Meta WhatsApp Cloud     │
  │  Users • Leads • Campaigns  │           │  Audio STT • Telugish Chat  │           │   Cloud API • Webhook HMAC  │
  └─────────────────────────────┘           └─────────────────────────────┘           └─────────────────────────────┘
```

---

## 2. Meta Leads & Campaign Assignment Engine (UI/UX Deep-Dive)

The **Meta Leads Hub (`/meta-leads`)** connects inbound Google Sheets / Meta Lead Ad campaigns with dynamic column recognition and strict role-based visibility.

### 2.1 The Core Concept: "Click Campaign Heading to View Specific Leads"
* **Administrator View**:
  * Sees **"All Campaigns"** tab plus every individual campaign heading found across the database.
  * Heading text: *"Click Campaign Heading to View Specific Leads:"*.
  * Action button: **"Manage Campaign Access"** opens the Member Assignment Modal.
* **Employee / Telecaller / Marketing View**:
  * Global *"All Campaigns"* tab is strictly hidden to prevent cross-campaign data leaks.
  * Heading text dynamically switches to: **"Your Assigned Campaigns:"**.
  * Displays **ONLY** the campaign headings specifically assigned to that logged-in user in MongoDB.
  * Clicking an assigned campaign tab filters and displays **only the leads belonging to that specific campaign**.

### 2.2 UI/UX Interaction Flow
```
[Admin Opens Modal] ──► [Selects Employee Cards] ──► [Clicks Confirm]
                                                            │
                                                            ▼ (Stored in MongoDB)
[Employee Logs In] ◄── [Sees Assigned Heading Tabs] ◄── [Backend Filters Allowed Tabs]
         │
         ▼
[Clicks Campaign Heading] ──► [Instant Reactive Table Filter] ──► [Views & Calls Lead]
```

### 2.3 UI Component Hierarchy & Interaction States
* **Interactive Pill Buttons**:
  * **Default State**: Clean white surface (`#ffffff`), 1px subtle border (`#e2e8f0`), muted typography (`#64748b`), and soft gray badge with lead count.
  * **Hover State**: Light sky-blue outline (`#bfdbfe`), slight elevation, and cursor pointer.
  * **Selected / Active State**: Soft sky-blue glass tint (`#eff6ff`), vibrant blue border (`#2563eb`), bold royal blue text (`#2563eb`), and blue pill badge with white text.
  * **Assigned Avatar Stack**: Compact avatars embedded directly on the campaign pill showing active callers assigned to that campaign.
* **Zero-Assigned Empty State (Fail-Safe UX)**:
  * When an employee has 0 assigned campaigns, the portal displays a dedicated zero-state card:
    * Soft blue circular icon badge with team illustration.
    * Title: *"No campaigns assigned yet"*.
    * Description: *"You don't currently have access to a Meta Leads campaign. Please contact your system administrator to assign campaigns to your profile."*
* **Dynamic Table (Columns A through ZZ)**:
  * Automatically inspects JSON keys from raw sheet ingestion and generates readable headers.
  * Debounced instant search (350ms) across name, phone, email, and city.
  * 1-Click **"Convert to CRM Lead"** button to transition a cold lead into an active sales lead.

---

## 3. Design System & UI/UX Principles

The user interface follows a modern **Clean Enterprise** design philosophy combining high-contrast usability with premium glassmorphism accents.

### 3.1 Color Palette
| Token | Hex Value | Application |
| :--- | :--- | :--- |
| **Brand Blue** | `#0284c7` / `#2563eb` | Primary navigation, active pills, call-to-action buttons, icons. |
| **Accent Orange** | `#f97316` | Status alerts, pending actions, attention badges, hover glow. |
| **Success Emerald**| `#10b981` | Converted leads, punch-in attendance, successful sync alerts. |
| **Error Rose** | `#f43f5e` / `#dc2626` | Playback errors, failed validations, destructive actions. |
| **Surface Pure** | `#ffffff` | Primary cards, modal dialogues, table containers. |
| **Surface Soft** | `#f8fafc` | Background canvas, secondary tabs, muted badges. |
| **Text Primary** | `#0f172a` / `#1e293b` | Main headings, customer names, phone numbers. |
| **Text Secondary**| `#64748b` | Subheadings, timestamps, designators, metadata. |

### 3.2 Typography & Motion
* **Typeface**: `Inter`, `-apple-system`, `system-ui`.
* **Tabular Figures**: Formatted with `fontVariant: ['tabular-nums']` for all audio timers, call durations, and counters to prevent jitter.
* **Micro-Animations (Framer Motion)**:
  * Page entry: Fade-in with subtle y-translation (`y: 10` to `y: 0`, duration: `0.25s`).
  * Card Hover: `scale: 1.015`, subtle drop-shadow elevation.
  * Button Tap: `scale: 0.95` for immediate tactile responsiveness.

---

## 4. Role-Based Access Control (RBAC) & Permission Architecture

Access control is enforced at both the **API Middleware Level** (`auth.js`) and the **Frontend Route/Navigation Level** (`permissions.js` & `routes.jsx`).

### 4.1 Permission Matrix
| Role / Designation | Dashboard | Meta Leads | All Leads | Campaigns | Email CRM | Call Recordings | Attendance | Delete Action |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **CEO / MD / CTO** | ✅ Full | ✅ All | ✅ All | ✅ All | ✅ Full | ✅ Full | ✅ All | ✅ Allowed |
| **HR (Human Resources)**| ✅ Full | ✅ All | ✅ All | ✅ All | ✅ Full | ✅ Full | ✅ All | ❌ Hidden |
| **Manager** | ❌ (Tasks) | ✅ All | ✅ All | ✅ All | ✅ Assigned | ✅ Full | ✅ Team | ✅ Allowed |
| **Marketing Executive**| ❌ (Tasks) | 🔒 If Assigned | ❌ Hidden | ❌ Hidden | ✅ Assigned | ❌ | ✅ Self | ❌ Hidden |
| **Telecaller / Sales** | ❌ (Tasks) | 🔒 If Assigned | ❌ Hidden | ❌ Hidden | ✅ Assigned | ❌ | ✅ Self | ❌ Hidden |
| **Developer / Trainer**| ❌ (Tasks) | ❌ Blocked | ❌ Blocked | ❌ Blocked | ✅ Assigned | ❌ | ✅ Self | ❌ Hidden |

---

### 4.2 Dynamic Google Sheet / Meta Leads Assignment Architecture: What is What?

The visibility of the Google Sheet / Meta Leads module in the employee portal is strictly governed by **real MongoDB campaign assignments** configured in the Admin Panel (`MetaCampaignAssignment`), rather than static designations.

#### What is What? (Core Components & MongoDB Models)

| Component | Architecture Role | File / Collection | What it Does |
| :--- | :--- | :--- | :--- |
| **`MetaCampaignAssignment`** | Single Source of Truth | MongoDB Collection `meta_campaign_assignments` | Stores `{ campaign: String, assignedUsers: [ObjectId], assignedBy: ObjectId }`. Links specific employees directly to specific Google Sheet tabs/campaigns. |
| **`MetaLead`** | Data Record | MongoDB Collection `meta_leads` | Stores synchronized Google Sheet rows with `campaign`, `rawData` (Google Sheet row cells), and conversion status (`Fresh`, `Converted`). |
| **Assignment API** | Admin Controller | `backend/src/modules/marketing/meta-leads/metaLeads.js` | Endpoint `POST /api/meta-leads/assignments` saves or modifies employee assignments from the Admin Member Assignment Modal. |
| **Dynamic Access Check** | Real-Time Verification API | `GET /api/meta-leads/my-assignment-status` | Evaluates if the authenticated employee has `assignedUsers: req.user._id` across any active campaign. Returns `{ hasAccess: Boolean, assignedCount: Number, assignedCampaigns: [] }`. |
| **Campaign-Level API Guard** | Backend Enforcement | `metaLeads.js` (`GET /`, `POST /:id/convert`, `GET /campaigns`) | Blocks unassigned employees with `403 Forbidden` if they try to query or convert leads outside of their assigned campaigns. |
| **Dynamic Navbar Visibility** | Client UI Integration | `Navbar.jsx` & `AuthContext.jsx` | Omits the "Marketing" module / "Meta Leads" link completely from the navigation bar if `hasAccess === false`. |
| **Route Protection Guard** | Client URL Blocker | `MetaLeadsRoute` in `routes.jsx` | If an unassigned employee attempts to type `/meta-leads` or `/marketing/meta-leads` directly in their browser address bar, the guard redirects them immediately to `/tasks`. |

#### Assignment Lifecycle & Security Flow

```
[ Admin in Member Assignment Modal ]
                   │
                   ▼
       POST /api/meta-leads/assignments
  { campaign: "CyberSecurity_Leads", userIds: ["67..."] }
                   │
                   ▼
     [ MongoDB: MetaCampaignAssignment ]
                   │
       ┌───────────┴────────────────────────────┐
       ▼                                        ▼
[ Backend API Layer ]                 [ Frontend Client Layer ]
- GET /my-assignment-status:          - AuthContext loads assignment state
  Returns hasAccess = true/false      - If false: "Marketing" is HIDDEN from Navbar
- GET /api/meta-leads:                - If direct URL typed: Redirect to /tasks
  Enforces query.campaign in assigned - If true: Shows ONLY assigned campaign tabs
- Returns 403 on unassigned sheets
```

#### Assignment Rules & Security Guarantees:
1. **Module Visibility**: Appears in employee portal **only** when an Admin assigns the employee to at least 1 campaign.
2. **Instant Revocation**: If the Admin deselects/removes an employee from all campaigns, the module vanishes on next refresh or route check, and direct access is blocked.
3. **No Cross-Campaign Leakage**: Employees only see tabs and lead records for campaigns where their `_id` exists in `assignedUsers`. General/Unassigned sheets are completely inaccessible.
4. **General Leads & Campaigns Hidden**: For marketing employees, the generic `/leads` (All Leads) and `/campaigns` routes remain hidden from top navigation to prevent confusion with Meta Leads.

---

## 5. Audio Call Recordings Hub & English Chatting (Telugish) AI Transcription

The **Call Recordings Hub (`/recordings`)** tracks, plays, and transcribes voice recordings synced from telecallers' mobile devices.

### 5.1 Resilient Audio Streaming Architecture
* **HTTP 206 Byte-Range Streaming**: Enables real-time scrubbing and seeking through recordings without downloading the entire audio file.
* **Local-to-Cloud Auto-Proxy**: When running locally, missing local audio files are seamlessly proxied from the production Render cloud storage, eliminating broken playback.
* **Client-Side Fallback & Retry**: The audio player monitors `<audio onError>` events. If the primary stream URL fails, it automatically falls back to the remote cloud endpoint before displaying a retry banner with an **"Open Link"** direct stream button.

### 5.2 "English Chatting Language" Audio-to-Text Pipeline (Telugish / Romanized Script)
1. **Audio Speech-to-Text**: Audio is passed to OpenAI Whisper (`gpt-4o-mini-transcribe` / `whisper-1`).
2. **Phonetic Chatting Script Converter**: An automated GPT-4o-mini transliteration pipeline detects Telugu or Indic script and converts it into casual English chatting text (like WhatsApp/SMS conversations).
   * **Spoken Audio**: Native Telugu dialogue
   * **Standard Whisper Output**: `పెదవే పలికిన మాటల్లోనే తీయని మాటే అమ్మ`
   * **Converted English Chatting Output**: `Pedave palikina maatallone teeyani maate amma...`
   * **Casual Conversation Example**: `"Hi em chestunnavu, ela unnavu?"`

---

## 6. Cross-Platform Mobile Application (React Native & Expo)

Built with **React Native** and **Expo**, the mobile app provides telecallers with on-the-go CRM functionality synchronized with the web portal.

### 6.1 Core Mobile Capabilities
* **Offline-Resilient Auth**: Secure JWT storage using `@react-native-async-storage/async-storage`.
* **Lead Calling & Followups**: One-touch phone dialing (`tel:`) and instant WhatsApp chat opening (`wa.me`).
* **Background Recording Upload**: Detects audio files (`.m4a`, `.mp3`, `.wav`, `.amr`, `.3gp`) and syncs them to the CRM with employee and lead attribution.
* **Attendance Shift Clock**: Live stopwatch, Punch In, Punch Out, and break tracking.

---

## 7. API Endpoints & Integration Reference

### 7.1 Meta Leads (`/api/meta-leads`)
* `GET /api/meta-leads/campaigns` — Returns campaigns with lead counts (automatically filtered for assigned employees).
* `GET /api/meta-leads` — Returns paginated leads with dynamic Google Sheets columns and keyword search.
* `POST /api/meta-leads/assignments` — Saves employee assignment to a campaign (Admin/Manager only).
* `POST /api/meta-leads/:id/convert` — Converts a Meta Lead into an active CRM sales lead.
* `POST /api/meta-leads/sync` — Triggers real-time n8n webhook sync.

### 7.2 Call Recordings (`/api/recordings`)
* `GET /api/recordings` — Lists all recordings with caller profile and matched lead data.
* `GET /api/recordings/stream/:filename` — Streams audio with HTTP 206 Partial Content byte ranges and remote cloud fallback.
* `POST /api/recordings` — Uploads call recording audio (`multipart/form-data`) with auto-match to phone numbers.
* `POST /api/recordings/:id/transcribe` — Transcribes audio with OpenAI Whisper and converts output into English chatting format.

### 7.3 Leads Management (`/api/leads`)
* `GET /api/leads` — Returns CRM leads with status, source, and search filters.
* `POST /api/leads` — Creates a new lead.
* `PUT /api/leads/:id` — Updates lead profile, stage, or assignment.
* `GET /api/leads/realtime-kpis` — Returns real-time KPI metrics for dashboard analytics.

---

## 8. Setup, Deployment & Operational Runbook

### 8.1 Prerequisites
* **Node.js**: v18+ or v20+ LTS
* **MongoDB**: Atlas Cluster (v6.0+)
* **Expo CLI**: `npx expo` for mobile testing

### 8.2 Starting the Ecosystem Locally
```bash
# 1. Start the Backend API (Port 5000)
cd backend
npm install
npm run dev

# 2. Start the Frontend Web CRM (Port 3000)
cd frontend
npm install
npm run dev

# 3. Start the Mobile Application (Port 8081)
cd Mobile_APP
npm install
npx expo start
```

---
*© 2026 AOTMS Telecommunication Enterprise CRM. All rights reserved.*
