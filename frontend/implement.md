# Implementation Plan: Meta Leads Module & Dynamic Google Sheets n8n Integration

---

## 1. Executive Summary & Goals

* **Module Name:** `Meta_Leads`
* **Parent Section:** Marketing (`Marketing` → `Meta Leads`)
* **Primary Objective:** 
  1. Add a dedicated **Meta Leads** module in the Marketing navigation bar.
  2. Implement an interactive **Campaign Headings** bar where clicking any campaign immediately filters and displays its corresponding leads.
  3. **Zero Column Alteration / No Loss of Headers:** Dynamically render the exact Google Sheet column headers as they exist in each tab, without stripping, renaming, or hardcoding fields.
  4. Provide a refined, production-ready **n8n Workflow** that solves the data mixing and field-loss flaws in the previous version.

---

## 2. Architecture & Data Flow

```
[ Google Spreadsheet ]
   ├── Tab: Digital Marketing_Leads (Custom Headers: e.g. Ad Name, City, Phone...)
   ├── Tab: SAP_Leads               (Custom Headers: e.g. SAP Module, Experience...)
   ├── Tab: Python_Leads            (Custom Headers: e.g. College, Batch Timing...)
   └── Tab: CyberSecurity_Leads     (Custom Headers: e.g. Qualification, Domain...)
             │
             ▼
   [ n8n Automation Engine ]
   ├── Step 1: Webhook Trigger (`/webhook/Meta_Leads`)
   ├── Step 2: Read each Tab (A:ZZ)
   ├── Step 3: Tag each stream with its `campaign` name while preserving all row fields
   ├── Step 4: Merge 4 streams (`Combine All Tabs`, 4 inputs)
   └── Step 5: HTTP POST to CRM (`/api/meta-leads`) with full dynamic payload
             │
             ▼
   [ CRM Backend API & Database ]
   ├── Route: `/api/meta-leads`
   ├── Storage: `campaign`, `source`, `createdAt`, `rawData` (flexible key-value container)
             │
             ▼
   [ Frontend: Meta Leads UI ]
   ├── Top: Interactive Campaign Navigation Bar (Tabs/Pills with lead counts)
   └── Bottom: Dynamic-Header Table (renders exact Google Sheet columns per campaign)
```

---

## 3. Implementation Form (Step-by-Step Checklist)

### Phase 1: n8n Workflow Configuration
- [ ] Import the updated n8n workflow JSON below into your n8n workspace.
- [ ] Connect your active Google Sheets OAuth2 credential to each of the 4 Read nodes.
- [ ] Verify that each tab name matches your Google Sheet tabs exactly.
- [ ] Set your CRM API token in the HTTP Request node headers.
- [ ] Test the workflow with test execution to verify incoming payloads retain all custom columns.

### Phase 2: Backend API & Database Schema
- [ ] **Data Model:** Create a flexible schema for Meta Leads:
  - `campaign`: String (e.g. `SAP_Leads`, `Python_Leads`)
  - `source`: String (default: `google_sheets_meta`)
  - `rawData`: Mixed / Flexible Object (stores all original sheet column names and values dynamically)
  - `status`: String (default: `New`)
  - `createdAt`: Date
- [ ] **Routes:**
  - `POST /api/meta-leads` — Bulk or single lead ingestion endpoint (used by n8n).
  - `GET /api/meta-leads/campaigns` — Returns list of distinct campaign names with lead counts.
  - `GET /api/meta-leads?campaign=...` — Returns leads filtered by selected campaign.

### Phase 3: Frontend Navigation & UI Assembly
- [ ] **Navbar Integration:** Add `Meta Leads` to the Marketing section dropdown/sidebar in the application navigation.
- [ ] **Campaign Selector Bar:** Build interactive campaign selector cards/tabs across the top:
  - `All Campaigns`
  - `Digital Marketing_Leads`
  - `SAP_Leads`
  - `Python_Leads`
  - `CyberSecurity_Leads`
- [ ] **Dynamic Table Engine:**
  - Read object keys from the active campaign's `rawData`.
  - Dynamically generate table `<th />` headers matching the exact sheet columns.
  - Implement horizontal scroll, keyword search, and pagination.

---

## 4. Production-Ready n8n Workflow Specification

This workflow resolves all previous flaws:
1. **Preserves Tab Identity:** Each tab branch has a tagging node adding `campaign: "<Tab_Name>"` before merging.
2. **Zero Loss of Column Headings:** Transmits the full `$json` object inside `rawData` instead of cherry-picking fields.
3. **Correct Merge Sizing:** Merge node inputs adjusted to 4 inputs.
4. **Target Endpoint:** Configured for `/api/meta-leads`.

```json
{
  "name": "Meta Leads - Multi-Campaign Google Sheets Sync",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "Meta_Leads",
        "options": {}
      },
      "id": "37674129-7e79-400e-8c48-3557dc2b920a",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.2,
      "position": [-160, 416]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'Digital Marketing_Leads'!A:ZZ",
        "options": {}
      },
      "id": "c3b18d95-cc93-46f2-a8fb-f0795feb6270",
      "name": "Read - Digital Marketing",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [160, 160],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "campaign_tag_dm",
              "name": "campaign",
              "value": "Digital Marketing_Leads",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "id": "a1111111-1111-1111-1111-111111111111",
      "name": "Tag - Digital Marketing",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [440, 160]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'SAP_Leads'!A:ZZ",
        "options": {}
      },
      "id": "feccae78-fda0-41f7-9149-a0f876e2c5c6",
      "name": "Read - SAP Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [160, 320],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "campaign_tag_sap",
              "name": "campaign",
              "value": "SAP_Leads",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "id": "a2222222-2222-2222-2222-222222222222",
      "name": "Tag - SAP Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [440, 320]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'Python_Leads'!A:ZZ",
        "options": {}
      },
      "id": "bed451e4-c0ec-4e74-9c82-d94e19961d91",
      "name": "Read - Python Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [160, 480],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "campaign_tag_python",
              "name": "campaign",
              "value": "Python_Leads",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "id": "a3333333-3333-3333-3333-333333333333",
      "name": "Tag - Python Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [440, 480]
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'CyberSecurity_Leads'!A:ZZ",
        "options": {}
      },
      "id": "5c281f54-6337-4d67-bada-c9081624078d",
      "name": "Read - CyberSecurity Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [160, 640],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account"
        }
      }
    },
    {
      "parameters": {
        "assignments": {
          "assignments": [
            {
              "id": "campaign_tag_cyber",
              "name": "campaign",
              "value": "CyberSecurity_Leads",
              "type": "string"
            }
          ]
        },
        "options": {}
      },
      "id": "a4444444-4444-4444-4444-444444444444",
      "name": "Tag - CyberSecurity Leads",
      "type": "n8n-nodes-base.set",
      "typeVersion": 3.4,
      "position": [440, 640]
    },
    {
      "parameters": {
        "numberInputs": 4
      },
      "id": "78b5c18c-9a0c-450e-92eb-21273ef53882",
      "name": "Combine All Tabs",
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3.2,
      "position": [780, 400]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://telecommunication-l3oz.onrender.com/api/meta-leads",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_CRM_TOKEN_HERE"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { campaign: $json.campaign, source: 'google_sheets_meta', rawData: $json } }}",
        "options": {}
      },
      "id": "676b1d29-9d7e-45e0-bd4e-5a230216587a",
      "name": "Sync Lead to CRM",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1080, 400],
      "disabled": false
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [
        [
          { "node": "Read - Digital Marketing", "type": "main", "index": 0 },
          { "node": "Read - SAP Leads", "type": "main", "index": 0 },
          { "node": "Read - Python Leads", "type": "main", "index": 0 },
          { "node": "Read - CyberSecurity Leads", "type": "main", "index": 0 }
        ]
      ]
    },
    "Read - Digital Marketing": {
      "main": [[{ "node": "Tag - Digital Marketing", "type": "main", "index": 0 }]]
    },
    "Tag - Digital Marketing": {
      "main": [[{ "node": "Combine All Tabs", "type": "main", "index": 0 }]]
    },
    "Read - SAP Leads": {
      "main": [[{ "node": "Tag - SAP Leads", "type": "main", "index": 0 }]]
    },
    "Tag - SAP Leads": {
      "main": [[{ "node": "Combine All Tabs", "type": "main", "index": 1 }]]
    },
    "Read - Python Leads": {
      "main": [[{ "node": "Tag - Python Leads", "type": "main", "index": 0 }]]
    },
    "Tag - Python Leads": {
      "main": [[{ "node": "Combine All Tabs", "type": "main", "index": 2 }]]
    },
    "Read - CyberSecurity Leads": {
      "main": [[{ "node": "Tag - CyberSecurity Leads", "type": "main", "index": 0 }]]
    },
    "Tag - CyberSecurity Leads": {
      "main": [[{ "node": "Combine All Tabs", "type": "main", "index": 3 }]]
    },
    "Combine All Tabs": {
      "main": [[{ "node": "Sync Lead to CRM", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

---

## 5. Frontend UI/UX Design Specification: Meta Leads Module

---

### A. Design System Tokens (Harmonized with Existing `Campaigns.jsx`)

The Meta Leads module directly shares the **White, Blue, Orange & Emerald** design token system (`T`) established in the core Campaigns module:

```
Theme Tokens:
├── Base Surfaces:
│   ├── T.white: '#ffffff'
│   ├── T.bg: '#f8fafc'              (Page canvas background)
│   ├── T.bgCard: '#ffffff'          (Card and table background)
│   ├── T.border: '#e2e8f0'          (Standard card/table borders)
│   └── T.borderSoft: '#f1f5f9'      (Subtle dividers)
│
├── Typography & Contrast:
│   ├── T.text: '#1e293b'            (Primary dark slate)
│   ├── T.textSecondary: '#475569'   (Body text)
│   ├── T.muted: '#64748b'           (Secondary labels & captions)
│   └── T.subtle: '#94a3b8'          (Placeholder & helper text)
│
├── Brand Accents & Interactive:
│   ├── Blue Accent (Primary Sync & Navigation):
│   │   ├── T.blue: '#2563eb'        (Primary buttons, active tabs, links)
│   │   ├── T.blueHover: '#1d4ed8'   (Button hover states)
│   │   ├── T.blueLight: '#eff6ff'   (Active tab background & badges)
│   │   └── T.blueBorder: '#bfdbfe'  (Active tab border outline)
│   │
│   ├── Orange Accent (Action & Alerts):
│   │   ├── T.orange: '#ea580c'      (Highlight indicators, callouts)
│   │   ├── T.orangeLight: '#fff7ed' (Tag background)
│   │   └── T.orangeBorder: '#fed7aa'
│   │
│   ├── Emerald Accent (Live Sync & Success):
│   │   ├── T.emerald: '#10b981'     (Live sync status, WhatsApp action)
│   │   ├── T.emeraldLight: '#ecfdf5'
│   │   └── T.emeraldBorder: '#a7f3d0'
│   │
│   └── Amber & Rose (Warnings & Errors):
│       ├── T.amber: '#f59e0b' / T.amberLight: '#fffbeb'
│       └── T.rose: '#f43f5e' / T.roseLight: '#fff1f2'
```

---

### B. React Icons Catalog

Every UI element is assigned a designated icon from standard React Icon packages (`react-icons/fi`, `react-icons/ri`, `react-icons/fa`, `react-icons/si`):

| UI Component | React Icon Symbol | Package | Visual Purpose |
| :--- | :--- | :--- | :--- |
| **Page Title Badge** | `<RiMegaphoneLine />` | `react-icons/ri` | Campaign header badge |
| **Module Hub Icon** | `<RiFolderChartLine />` | `react-icons/ri` | Meta Leads marketing icon |
| **Meta Platform Icon** | `<SiMeta />` / `<SiFacebook />` | `react-icons/si` | Meta source badge |
| **All Campaigns Tab** | `<FiTarget />` | `react-icons/fi` | Comprehensive view pill |
| **Campaign Heading Tab** | `<FiLayers />` | `react-icons/fi` | Individual category tabs |
| **Active Selection** | `<FiCheck />` | `react-icons/fi` | Checkmark on active pill/dropdown |
| **Global Search** | `<FiSearch />` | `react-icons/fi` | Search input adornment |
| **Live Sync Button** | `<FiRefreshCw />` | `react-icons/fi` | Spin animation during live Google Sheets pull |
| **Export Data** | `<FiDownload />` | `react-icons/fi` | CSV/Excel export trigger |
| **Column Manager** | `<FiFilter />` / `<FiColumns />` | `react-icons/fi` | Dynamic column visibility toggle |
| **Sort Glyph** | `<FiChevronDown />` | `react-icons/fi` | Table column sort indicator |
| **WhatsApp Action** | `<FaWhatsapp />` | `react-icons/fa` | Direct green WhatsApp blast/chat |
| **Direct Call Action** | `<FiPhoneCall />` | `react-icons/fi` | Primary blue tele-caller trigger |
| **Direct Email Action** | `<FiMail />` | `react-icons/fi` | Mailto client trigger |
| **Deep Inspect / View** | `<FiEye />` | `react-icons/fi` | Open row in slide-over drawer |
| **Google Sheet Link** | `<FiArrowUpRight />` | `react-icons/fi` | Jump directly to origin Google Sheet |
| **Time & Ingestion** | `<FiClock />` | `react-icons/fi` | Ingestion timestamp marker |
| **Total Inflow** | `<FiUsers />` | `react-icons/fi` | Lead count counter icon |

---

### C. Visual Layout Wireframe (Same Existing Campaign Style)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Navbar: CRM Telecommunication  |  Dashboard  |  [Marketing ▾]  |  Sales  |  Finance  |  👤 Profile     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  Marketing  /  Campaigns  /  Meta Leads Hub (Google Sheets Dynamic Sync)
  
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📢 HEADER SECTION (Matching Campaigns.jsx Header Layout)                                               │
│                                                                                                        │
│  [<RiFolderChartLine />]  Meta Leads Ingestion Hub                       [ ⟳ FiRefreshCw Sync Now ]    │
│  Multi-tab Google Sheets sync with dynamic zero-loss column mapping     [ ⤓ FiDownload Export CSV ]   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 TOP METRIC CARDS (White Cards, T.border, Circular Progress / Accented Badges)                       │
│ ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────┐│
│ │ [<FiUsers />] Total    │  │ [<FiLayers />] Active   │  │ [<FiActivity />] Today │  │ [<FiClock />]  ││
│ │ 1,248 Leads            │  │ 4 Campaign Tabs         │  │ +84 Ingested           │  │ 5 mins ago 🟢  ││
│ │ (T.blue Light Badge)   │  │ (T.orange Light Badge)  │  │ (T.emerald Light Badge)│  │ Live & Synced  ││
│ └────────────────────────┘  └────────────────────────┘  └────────────────────────┘  └────────────────┘│
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🗂️ INTERACTIVE CAMPAIGN HEADINGS (Same Pill Filter Styling as Campaigns.jsx)                           │
│                                                                                                        │
│  [ <FiTarget /> All Campaigns (1,248) ]                                                                │
│  [ <FiLayers /> Digital Marketing_Leads (342) ]  ◄── ACTIVE (T.blue bg, T.blueBorder, T.blue text)    │
│  [ <FiLayers /> SAP_Leads (184) ]                                                                      │
│  [ <FiLayers /> Python_Leads (420) ]                                                                   │
│  [ <FiLayers /> CyberSecurity_Leads (302) ]                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🛠️ TOOLBAR (Search, Columns Filter, Actions)                                                          │
│  [ <FiSearch /> Search any lead, mobile, city, or custom sheet attribute... ]                         │
│  [ <FiFilter /> Columns (All) <FiChevronDown /> ]   [ Clear Filter ]                                   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📋 DYNAMIC ZERO-LOSS TABLE (White bg, T.border, Crisp Typography, Row Actions)                         │
│                                                                                                        │
│  [#] │ [Sheet Column 1 <FiChevronDown />] │ [Sheet Column 2]  │ [Sheet Column 3]  │ Quick Actions      │
│ ─────┼────────────────────────────────────┼───────────────────┼───────────────────┼────────────────────│
│  01  │ John Doe                           │ +91 98765 43210   │ Cloud SAP-MM      │ [WhatsApp] [Call]  │
│      │                                    │                   │                   │ [<FiEye /> View]   │
│  02  │ Sarah Smith                        │ +91 91234 56789   │ Python Full Stack │ [WhatsApp] [Call]  │
│      │                                    │                   │                   │ [<FiEye /> View]   │
│                                                                                                        │
│  * Table renders dynamically: Whatever columns exist in that Google Sheet tab are shown with 0 loss!   │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📄 FOOTER PAGINATION                                                                                   │
│  Showing 1 - 25 of 342 leads       Rows per page: [ 25 ▾ ]               ‹  1  [2]  3  4  5  ›         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### D. Component Details & Interactive Behavior

#### 1. Interactive Campaign Heading Pills (Tabs)
* **Styling:** Follows the exact pill buttons from `Campaigns.jsx`.
* **Inactive State:** 
  * `background: T.white`, `border: 1px solid T.border`, `color: T.muted`.
  * Hover: `border: 1px solid T.blueBorder`, `color: T.blue`, `background: T.blueLight`.
* **Active State:** 
  * `background: T.blueLight`, `border: 1px solid T.blueBorder`, `color: T.blue`, font-weight 600.
  * Tag counter inside the pill has `background: T.blue`, `color: T.white`, rounded-full.
* **Click Interaction:** 
  * Instantly loads that campaign's leads and recalculates column headers dynamically from the sheet data without reloading the page.

#### 2. Dynamic Zero-Loss Data Table
* **Header Rendering:** Reads `Object.keys(lead.rawData)`.
  * Every original Google Sheet column header appears with bold typography (`T.text`), clean slate background (`#f8fafc`), and `FiChevronDown` sort indicator.
* **Quick Contact Action Cluster (Inside Table Row):**
  * `<FaWhatsapp />` Icon Button: Green (`#25D366`), clicking opens WhatsApp chat directly with the lead's number.
  * `<FiPhoneCall />` Icon Button: Blue (`T.blue`), initiates calling via CRM tele-calling pipeline.
  * `<FiEye />` Icon Button: Opens the Lead Detail Slide-Over Drawer.

#### 3. Lead Detail Slide-Over Drawer
* Emerges smoothly from the right (480px width, `bg: T.white`, subtle backdrop overlay).
* **Header:** Displays Lead Name + Campaign Badge (`T.blueLight` pill) + Ingestion Time (`FiClock`).
* **Complete Sheet Data Grid:** Renders every single key-value pair from the Google Sheet row cleanly in two-column cards, ensuring zero custom fields are missed.
* **Footer Actions:**
  * Primary Button: `[ Convert to Active CRM Lead ]` (`background: T.blue`, `hover: T.blueHover`).
  * Secondary Button: `[ <FiArrowUpRight /> Open in Google Sheet ]` (`background: T.bg`, `border: T.border`).

#### 4. Action & Sync Bar
* **Sync Button:** Uses `T.blue` background with `<FiRefreshCw />`. When clicked, it rotates smoothly with a CSS spin animation while the n8n sync is executing.
* **Export Button:** Uses `T.white` background, `border: T.border`, `<FiDownload />` icon, exporting the active campaign table with all original Google Sheet headers intact.

---

## Phase 5: Meta Leads Campaign Employee Assignment & Restricted Visibility Engine

### 1. Business Logic & Workflow Architecture
1. **Admin Campaign Assignment Flow:**
   * Inside the Meta Leads Ingestion Hub (`/marketing/meta-leads`), Admins/Managers have an **"Assign Members"** (`<FiUserPlus />` or `<FiShield />`) control linked to each Google Sheet Campaign tab (e.g., `Digital Marketing_Leads`, `SAP_Leads`, `Python_Leads`, `CyberSecurity_Leads`).
   * Clicking opens an **Employee Assignment Modal** displaying all active CRM staff with their complete profile cards (Avatar, Full Name, Designation, Department, Email).
   * Supports flexible assignment:
     * **Single Member Assignment:** Assign 1 specific tele-caller/executive to a campaign.
     * **Multiple Members Assignment:** Assign 2 or more tele-callers to share a high-volume campaign.
   * Clicking **"Confirm Assignment"** commits the association to the database and dispatches an audit log event.

2. **Automatic Role-Based Lead Visibility Flow:**
   * **Admins & Executives (MD, CEO, CTO, Admin, Superadmin, HR):**
     * See the complete dashboard: All campaign tabs (`Digital Marketing_Leads`, `SAP_Leads`, `Python_Leads`, `CyberSecurity_Leads`), total aggregated leads, and the assignment settings button.
   * **Assigned Employees / Tele-callers:**
     * Upon loading `/marketing/meta-leads`, the system automatically resolves `req.user._id`.
     * The backend queries the assignment ledger. If the employee is assigned to `SAP_Leads`, the API returns **ONLY** `SAP_Leads` data.
     * The frontend automatically hides unassigned tabs, hides the "All" tab, and directly loads the employee's assigned campaign.
     * The employee has zero visibility of unassigned campaigns (no leaking of student leads from other departments).
     * If an employee is not yet assigned to any campaign, a dedicated empty state displays: *"No campaigns assigned to your profile yet. Please contact your CRM Administrator."*

---

### 2. Database Schema (`MetaCampaignAssignment`)

* **File Location:** `backend/src/database/models/MetaCampaignAssignment.js`
* **Schema Definition:**
  ```javascript
  const mongoose = require('mongoose');

  const metaCampaignAssignmentSchema = new mongoose.Schema({
    campaign: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true // e.g. 'SAP_Leads', 'Python_Leads'
    },
    assignedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }, { timestamps: true });
  ```

---

### 3. Backend API Specifications

#### A. `GET /api/meta-leads/assignments`
* **Access:** Admin / Manager / Executive only (`protect`, `authorize`).
* **Purpose:** Returns the current employee assignment list mapped by campaign.
* **Response:**
  ```json
  {
    "success": true,
    "assignments": [
      {
        "campaign": "SAP_Leads",
        "assignedUsers": [
          { "_id": "usr_1", "name": "Rahul Sharma", "email": "rahul@crm.com", "designation": "Telecaller", "avatar": "" }
        ],
        "assignedBy": { "name": "Admin" },
        "updatedAt": "2026-10-15T22:00:00.000Z"
      }
    ]
  }
  ```

#### B. `POST /api/meta-leads/assignments`
* **Access:** Admin / Manager / Executive only.
* **Payload:**
  ```json
  {
    "campaign": "SAP_Leads",
    "userIds": ["usr_1", "usr_2"]
  }
  ```
* **Behavior:** Atomically upserts the campaign record using `findOneAndUpdate({ campaign }, { assignedUsers, assignedBy, updatedAt }, { upsert: true, new: true })`.

#### C. `GET /api/meta-leads/campaigns` (Role-Filtered)
* **Access:** All authenticated users (`protect`).
* **Behavior:**
  * Checks if `isExecutiveOrAdminUser(req.user)`.
  * If **Admin**: Aggregates and returns all campaigns as usual.
  * If **Employee**: Fetches assigned campaigns for `req.user._id`:
    ```javascript
    const userAssignments = await MetaCampaignAssignment.find({ assignedUsers: req.user._id });
    const allowedCampaigns = userAssignments.map(a => a.campaign);
    ```
    Aggregates only leads matching `{ campaign: { $in: allowedCampaigns } }`.

#### D. `GET /api/meta-leads` (Row-Level Security Enforcement)
* **Access:** All authenticated users (`protect`).
* **Behavior:**
  * Non-admin users are strictly locked to `allowedCampaigns`.
  * If a tele-caller attempts to pass `?campaign=CyberSecurity_Leads` when only assigned to `SAP_Leads`, the backend returns `403 Forbidden` or an empty list, preventing URL manipulation.

---

### 4. Frontend UI/UX Architecture (`MetaLeads.jsx`)

#### A. Campaign Toolbar Enhancements (Admin View)
* Next to the Campaign Tabs, render an **"Assign Members"** button:
  * Icon: `<FiUserPlus />`
  * Shows mini avatar stack of currently assigned users for the active tab.
  * Click triggers the Assignment Modal.

#### B. Employee Assignment Modal (`AssignMembersModal.jsx`)
* **Header:**
  * Title: "Assign Campaign Access"
  * Campaign Badge: Active Sheet Tab (e.g. `[ SAP_Leads ]` pill)
  * Close Icon (`<FiX />`)
* **Search & Filter Bar:**
  * `<FiSearch />` input for fast search by employee name, email, or designation.
  * Designation filter chips (e.g., "All", "Tele-callers", "Marketing").
* **Employee Profile Cards Grid:**
  * Each card includes:
    * **Profile Avatar:** User photo or styled circle with initials.
    * **Name & Status:** Full name with green active dot.
    * **Designation & Department:** e.g. "Telecaller • Sales Dept".
    * **Email:** Subtle slate text.
    * **Selection Indicator:** Clean checkbox that highlights card border in `T.blue` (`#2563eb`) with smooth transition.
  * Multi-select and single-select supported seamlessly.
* **Footer Actions:**
  * Summary Counter: e.g. *"2 Employees selected"*
  * `[ Cancel ]` button.
  * `[ Confirm Assignment ]` button: Primary Blue (`#2563eb`), with loading spinner when saving.

#### C. Tele-caller User Experience (Restricted Mode)
* When a tele-caller logs in:
  1. The page only renders the tabs assigned to them.
  2. The "Assign Members" button is hidden.
  3. The first assigned campaign is automatically selected by default.
  4. Empty State: If no campaigns are assigned, displays a friendly notice with contact info for the system admin.



# Meta Leads Campaign Assignment UI — Design Specification

## 1. Overview

Design a professional, responsive CRM interface for assigning employees to individual Meta Lead campaigns.

**Theme**
- Background: White
- Primary actions: Blue (`#2563EB`)
- Active status indicators: Green
- Text: Dark charcoal
- Borders: Light grey
- Style: Clean, spacious, modern CRM dashboard

## 2. Campaign Dashboard

### Header
- Page title: **Meta Leads**
- Supporting text: Manage campaign leads and employee access.
- Primary action: **Assign Members** with the `FiUserPlus` icon.
- Show the assigned-member avatar stack beside the assignment action.
- Display the number of assigned employees where useful.

### Campaign Tabs
Render campaign tabs for:
- `Digital Marketing_Leads`
- `SAP_Leads`
- `Python_Leads`
- `CyberSecurity_Leads`

Each tab should:
- Be selectable and clearly highlight the active campaign.
- Display the campaign's lead count when available.
- Show the assigned-member avatar stack for the active campaign.
- Load the selected campaign's leads and assignment data.

### Example Layout

```text
Meta Leads                                      [ + Assign Members ]
Manage campaign leads and employee access.       [JA] [SK] [RM]

[ Digital Marketing_Leads ] [ SAP_Leads ] [ Python_Leads ] [ CyberSecurity_Leads ]

Campaign leads table
```

## 3. Assign Members Modal

Component: `AssignMembersModal.jsx`

### Modal Header
- Title: **Assign Campaign Access**
- Show the active campaign as a badge, for example `[ SAP_Leads ]`.
- Add a close button using `FiX`.
- Use a centered white modal, subtle shadow, rounded corners, and dimmed backdrop.

### Search
- Search input with the `FiSearch` icon.
- Placeholder: `Search by name, email, or designation...`
- Filter the employee list as the user types.
- Search should be case-insensitive.

### Designation Filter Chips
Provide:
- **All**
- **Tele-callers**
- **Marketing**

Highlight the active filter with blue styling. Keep inactive filters neutral.

### Employee Profile Cards
Each card should show:
- Profile photo, or initials avatar when no photo exists.
- Full name.
- Green active-status dot when the employee is active.
- Designation and department, such as `Telecaller • Sales Dept`.
- Email address.
- Checkbox for selection.

Card behavior:
- Clicking the card toggles selection.
- Selected cards use a blue border (`#2563EB`) and subtle blue-tinted background.
- Checkbox state must match card selection.
- Add a smooth, brief selection transition.
- Support selecting one or multiple employees.

### Modal Footer
- Show selected count, for example **3 members selected**.
- **Cancel** closes the modal without saving changes.
- **Confirm Assignment** saves the selected campaign members.
- Disable confirmation when nothing has changed or while saving, as appropriate.
- Show a loading spinner and `Saving...` label during the save request.
- Display success or error feedback after the API responds.

### Example Modal Layout

```text
┌────────────────────────────────────────────────────────────────┐
│ Assign Campaign Access                                    [ X ] │
│ Campaign: [ SAP_Leads ]                                        │
├────────────────────────────────────────────────────────────────┤
│ [ Search by name, email, or designation...                  🔍 ]│
│ [ All ] [ Tele-callers ] [ Marketing ]                         │
│                                                                │
│ ┌────────────────────────────┐  ┌────────────────────────────┐ │
│ │ [JA] Jayaveer           [✓]│  │ [SK] Saadiya             [ ]│ │
│ │      ● Active              │  │      ● Active               │ │
│ │      Sr. Software Developer│  │      Jr. Software Developer │ │
│ │      Development Dept      │  │      Development Dept       │ │
│ │      jayaveer@example.com  │  │      saadiya@example.com    │ │
│ └────────────────────────────┘  └────────────────────────────┘ │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ 3 members selected                 [ Cancel ] [ Confirm Assignment ] │
└────────────────────────────────────────────────────────────────┘
```

Names and email addresses above are illustrative placeholders. Load real employee data from the CRM API.

## 4. Admin Experience

Administrators can:
1. View all configured campaign tabs.
2. Select a campaign.
3. See members currently assigned to that campaign.
4. Open **Assign Members**.
5. Search employees and filter by designation group.
6. Select or deselect employees.
7. Confirm and save campaign assignments.
8. See updated avatar stacks after a successful save.

Assignments are campaign-specific. Updating one campaign must not accidentally overwrite assignments for another campaign.

## 5. Tele-caller Restricted Experience

### Assigned Campaigns
- Render only campaigns assigned to the authenticated tele-caller.
- Hide the **Assign Members** button.
- Automatically select the first accessible campaign.
- Do not briefly display unauthorized campaigns while data is loading.
- Ensure the leads table only shows data from an authorized campaign.

### No Assigned Campaigns
Show a friendly empty state:

**No campaigns assigned yet**

You don't currently have access to a Meta Leads campaign. Please contact your system administrator to request access.

If the CRM provides administrator contact details, display them using trusted backend data. Do not hardcode a personal email address.

## 6. Responsive Behavior

### Desktop
- Display campaign tabs in one row when space permits.
- Use a two-column employee-card grid in the modal.
- Keep modal content scrollable if the employee list is long.
- Keep the footer and confirmation actions visible.

### Tablet
- Allow campaign tabs to scroll horizontally.
- Use a two-column or one-column card grid depending on available width.

### Mobile
- Allow campaign tabs to scroll horizontally.
- Use a one-column employee-card list.
- Make search and filter chips easy to tap.
- Keep Cancel and Confirm actions accessible without horizontal scrolling.
- Avoid clipping the modal beyond the viewport.

## 7. UI States

Implement explicit states for:
- Loading campaign list.
- Loading employees.
- Loading existing assignments.
- Search with no matching employees.
- No campaigns assigned to a tele-caller.
- Saving assignments.
- Assignment save success.
- Assignment save failure.
- API/network failure.
- Empty campaign lead list.

Use real backend responses. Do not display fabricated employee counts, campaign counts, or assignment success messages.

## 8. Suggested React Component Structure

```text
src/
└── modules/
    └── marketing/
        └── meta-leads/
            ├── pages/
            │   └── MetaLeadsPage.jsx
            ├── components/
            │   ├── CampaignTabs.jsx
            │   ├── AssignedMemberAvatars.jsx
            │   ├── AssignMembersModal.jsx
            │   ├── EmployeeSearch.jsx
            │   ├── EmployeeFilterChips.jsx
            │   ├── EmployeeSelectionCard.jsx
            │   └── CampaignAccessEmptyState.jsx
            └── services/
                └── campaignAccessService.js
```

Use the existing project structure if it differs; avoid creating duplicate components that already exist.

## 9. Backend and Authorization Requirements

The UI must be backed by server-side authorization.

Recommended API contract (confirm or adapt to actual backend routes before implementation):

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/meta-leads/campaigns` | Return campaigns the current user may access |
| `GET` | `/api/meta-leads/campaigns/:campaignId/members` | Return employees assigned to a campaign |
| `GET` | `/api/employees?search=&designation=` | Search/filter eligible employees |
| `PUT` | `/api/meta-leads/campaigns/:campaignId/members` | Replace the campaign's assigned-member list |

Example assignment request:

```json
{
  "memberIds": ["employee_id_1", "employee_id_2"]
}
```

Example response:

```json
{
  "campaignId": "campaign_id",
  "memberIds": ["employee_id_1", "employee_id_2"],
  "message": "Campaign access updated"
}
```

These endpoints and response formats are a proposed contract, not a claim that the routes already exist.

### Security Rules
- Only authorized administrators may change campaign assignments.
- Enforce permissions in backend middleware/controllers, not only by hiding frontend controls.
- Tele-callers may read only campaigns assigned to them.
- Validate campaign IDs and employee IDs on the server.
- Confirm selected employees are active and eligible for assignment.
- Scope campaign and lead queries to the authenticated user's permissions.
- Record assignment changes in an audit log when the CRM supports auditing.
- Never trust a client-supplied role or user ID as proof of authorization.

## 10. Acceptance Checklist

- [ ] Campaign tabs load from the backend.
- [ ] Active campaign is visually clear.
- [ ] Admin sees Assign Members with `FiUserPlus`.
- [ ] Avatar stack matches saved assignments.
- [ ] Modal shows the correct campaign badge.
- [ ] Search works by employee name, email, and designation.
- [ ] All, Tele-callers, and Marketing filters work.
- [ ] Employee cards show photo/initials, active status, designation, department, and email.
- [ ] Multi-select and deselect work correctly.
- [ ] Selected cards have a blue border and checked checkbox.
- [ ] Selected count updates immediately.
- [ ] Cancel does not save changes.
- [ ] Confirm Assignment persists changes and shows loading/error/success states.
- [ ] Tele-callers only see assigned campaigns.
- [ ] Tele-callers do not see the Assign Members button.
- [ ] The first assigned campaign is auto-selected.
- [ ] Users with no assignments see the empty state.
- [ ] Backend rejects unauthorized assignment updates and campaign reads.
- [ ] Desktop, tablet, and mobile layouts are usable.
- [ ] No mock data or fake success states are used in production.
