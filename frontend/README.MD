File Structure
Is there a recommended way to structure React projects?
React doesn’t have opinions on how you put files into folders. That said there are a few common approaches popular in the ecosystem you may want to consider.

Grouping by features or routes
One common way to structure projects is to locate CSS, JS, and tests together inside folders grouped by feature or route.

common/
  Avatar.js
  Avatar.css
  APIUtils.js
  APIUtils.test.js
feed/
  index.js
  Feed.js
  Feed.css
  FeedStory.js
  FeedStory.test.js
  FeedAPI.js
profile/
  index.js
  Profile.js
  ProfileHeader.js
  ProfileHeader.css
  ProfileAPI.js
The definition of a “feature” is not universal, and it is up to you to choose the granularity. If you can’t come up with a list of top-level folders, you can ask the users of your product what major parts it consists of, and use their mental model as a blueprint.

Grouping by file type
Another popular way to structure projects is to group similar files together, for example:

api/
  APIUtils.js
  APIUtils.test.js
  ProfileAPI.js
  UserAPI.js
components/
  Avatar.js
  Avatar.css
  Feed.js
  Feed.css
  FeedStory.js
  FeedStory.test.js
  Profile.js
  ProfileHeader.js
  ProfileHeader.css
Some people also prefer to go further, and separate components into different folders depending on their role in the application. For example, Atomic Design is a design methodology built on this principle. Remember that it’s often more productive to treat such methodologies as helpful examples rather than strict rules to follow.

Avoid too much nesting
There are many pain points associated with deep directory nesting in JavaScript projects. It becomes harder to write relative imports between them, or to update those imports when the files are moved. Unless you have a very compelling reason to use a deep folder structure, consider limiting yourself to a maximum of three or four nested folders within a single project. Of course, this is only a recommendation, and it may not be relevant to your project.

Don’t overthink it
If you’re just starting a project, don’t spend more than five minutes on choosing a file structure. Pick any of the above approaches (or come up with your own) and start writing code! You’ll likely want to rethink it anyway after you’ve written some real code.

If you feel completely stuck, start by keeping all files in a single folder. Eventually it will grow large enough that you will want to separate some files from the rest. By that time you’ll have enough knowledge to tell which files you edit together most often. In general, it is a good idea to keep files that often change together close to each other. This principle is called “colocation”.

As projects grow larger, they often use a mix of both of the above approaches in practice. So choosing the “right” one in the beginning isn’t very important.

React JS Advance-Level Folder Structure
How to run the project

npm i
and

npm start
Before using This project install latest versions of following packages

Axios
Bootstrap - React Strap - MUI - AntD - Tailwind
React Icons
React Router Dom Latest React Router v6
Other Required packages
In the project I have just set Up most used folder structure:

React JS Advanced Folder Structure
.
├── public
|     └── index.html
├── src
    ├── assets
    |     ├── audios
    |     ├── icons
    |     ├── images
    |     └── videos
    ├── components
    |     ├── Button
    |     |     ├── index.jsx
    |     |     └── button.module.css
    |	  ├── inputs
    |     |     ├── index.jsx
    |     |     └── inputs.module.css
    |	  ├── Modal
    |     |     ├── index.jsx
    |     |     └── modal.module.css
    |	  └── Tooltip
    |           ├── index.jsx
    |           └── tooltip.module.css
    |     └── index.js
    ├──  db
    |     ├── productsData.js
    |     └── userData.js
    ├── layout
    |     ├── Header
    |     |     ├── index.jsx
    |     |     └── header.module.css
    |     ├── Navbar.jsx
    |     |     ├── index.jsx
    |     |     └── navbar.module.css
    |     ├── Breadcrumbs.jsx
    |     |     ├── index.jsx
    |     |     └── breadcrumbs.module.css
    |     └── Footer.jsx
    |           ├── index.jsx
    |           └── footer.module.css
    |     └── index.js
    ├── pages
    |     ├── Home
    |     |     ├── index.jsx
    |     |     └── home.module.css
    |     ├── Login
    |     |     ├── index.jsx
    |     |     └── login.module.css
    |     ├── Signup
    |     |     ├── index.jsx
    |     |     └── signup.module.css
    |     └── About
    |           ├── index.jsx
    |           └── about.module.css
    |     └── index.js
    ├── Routers
    |     └── Routers.js
    ├── store
    |     ├── action.js  
    |     ├── reducers.js  
    |     └── store.js
    ├── services
    |     ├── api.js          // API request functions
    |     └── dataUtils.js    // Data manipulation functions
    ├── utils
    |     ├── constants
    |     |     ├── Strapi.js
    |     |     └── Firebase.js
    |     ├── helpers
    |     |     ├── arrays.js
    |     |     └── helpers.js
    |     └── hooks  
    |           └── useIsMobile.js  
    ├── .env
    ├── app.js
    ├── index.css
    ├── index.js
|
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
Folders include
Public
Assests
Components
db
layout
Pages
Routes
services
store
utils
Constants
helpers
hooks
.env.example / .env.development
.eslintrc.cjs
.prettierrc.cjs
.jsonconfig.json
.gitignore
package.json
.vite.config.js
Public
Public mainly contain root file index.html which help to run react project.

Assests
In Assets folder you can put following things.

Images
Video
Icons
CSS
Components
Component will have all the components which are reuseable anywhere in website. Like - Button - Cards - DropDownBtn - inputs - Modal - Popups - Toast - Tooltip - Text/Heading/Title - Skeleton - Spiner/Loader

Constants
Constants folder have Tokens, logins, and those details which we don't want to share with public. Like Env files are used to store sensitive credentials such as API keys. An environment variable supports storing the API link at one location so that we do not need to change the Link in each file manually.

const API_BASE_URL = 'https://api.example.com';
const MAX_ITEMS_PER_PAGE = 10;
db
Here we provide JSON Formate of data in frontend in React APP.

products data
users data
Helpers
Helpers used to store utility functions and modules that provide various helper functionalities. These functions are usually small, reusable, and not directly tied to the main business logic of your application.

Array to Object
Object to Array
Date Formatting
Number Formatting
Validation
Api Request
Helper Functions Details

Layout
This is just a special folder for placing any layout based components.

Header
Footer
Breadcrumbs
Navbar
Sidebar
Pages
Pages will have all the pages which we will use in website.

Routes
Router will have all the Routes in website. Where we are going and where we want to go.

Services
In Services we put configuration file, like when you are using google firebase then your firebase config file will be in services folder.

The "services" folder is often used to contain code related to making *API requests and managing data from external sources. This folder helps separate the concerns of your application by isolating data fetching and manipulation logic from the components that render the UI.

// services/apiService.js
import axios from 'axios';

export function fetchUserData(userId) {
  return axios.get(`/api/users/${userId}`);
}
Store
"store" folder in a React application typically refers to a directory where you manage your application's state using state management libraries like

Redux
Redux Toolkit
Zustand
Context Api
Mobx
|-- store/
|   |-- actions.js        // Redux action creators
|   |-- reducers.js       // Redux reducers
|   |-- store.js          // Redux store configuration
Utils
Utils folder is a common convention in many software projects, including React applications, for storing utility functions and helper modules that provide general-purpose functionality across different parts of the application.

constants
helpers
hooks
Example:

// utils/stringUtils.js
export function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// utils/dateUtils.js
export function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
}
.env.development
Env files are used to store sensitive credentials such as API keys.

REACT_APP_API_URL=http://localhost:3001
REACT_APP_DEBUG_MODE=true
.env.example
Env files are used to store sensitive credentials such as API keys.

REACT_APP_API_KEY=
REACT_APP_API_URL=
.eslintrc.cjs
ESLint, which is a popular tool for linting and enforcing coding style and best practices in JavaScript code. The .eslintrc.cjs file is written in CommonJS module format and is used to configure ESLint for your project.

.gitignore
.gitignore file contain all those files,folders name which user want to skip to push online. If you don't want to push any specific file/folder then you should put their name in .gitignore

.prettierrc.cjs
.prettierrc.cjs file is a configuration file used for Prettier, which is a widely used code formatting tool. Prettier helps ensure consistent and automatic code formatting across your codebase. The .prettierrc.cjs file is written in CommonJS module format and is used to configure Prettier's behavior for your project.

File Format & Naming
Configuration Setup
Export Configuration
module.exports = {
  printWidth: 80,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'es5',
};
jscongig.json
File Purpose
Configuration Setup:
JSON Format
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
package.json
package.json file is core to the Nodejs ecosystem and is a fundamental part of understanding and working with Node. js , npm , and even modern JavaScript . This file is used as a manifest, storing information about applications, modules, packages, and more.

vite.config.js
File Purpose: The vite.config.js file allows you to customize various aspects of your Vite project, including configuration options for the development server, build process, and plugin settings.

Configuration Setup: Inside the vite.config.js file, you export an object containing the configuration options for your Vite project. This object can include settings related to the development server, build process, plugins, and more.

JavaScript Format: The vite.config.js file is written in JavaScript, and it's named vite.config.js. It should be placed in the root directory of your Vite project.

// vite.config.js
export default {
  server: {
    port: 3000
  },
  build: {
    minify: true
  },
  plugins: [/* your plugins here */]
};
@import

export default defineConfig({
  resolve: {
    alias: {
      '@': '/src',
      '@page': '/src/page'
    }
  },
  plugins: [react()],
})
2nd Method

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path';

const alias = {
  // eslint-disable-next-line no-undef
  '@': resolve(__dirname, './src'),
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias,
  },
})


# Frontend Architecture & File Structure

This document details the standardized folder layout, import aliases, and modular architecture implemented across `frontend/src/` adhering to the React enterprise guidelines defined in `FileStructure.md`.

---

## 1. Directory Tree Overview

```
frontend/
├── jsconfig.json               # Path alias mapping (@/* -> src/*)
├── vite.config.js              # Vite bundler configuration & @ alias
├── package.json
├── tailwind.config.js
└── src/
    ├── app/                    # Application root composition
    │   ├── App.jsx             # Main App layout & route provider wrapper
    │   ├── config.js           # App-level environment & runtime configs
    │   ├── guards.jsx          # Auth & Role routing guards
    │   ├── providers.jsx       # Global context providers tree
    │   └── routes.jsx          # Route definitions
    │
    ├── assets/                 # Static images, media, branding & styles
    │   ├── styles/             # Global CSS stylesheets (variables.css, utilities.css, globals.css)
    │   ├── CRM.png
    │   ├── aotms-global-logo.png
    │   └── ...
    │
    ├── components/             # Reusable UI & shared widgets
    │   ├── ui/                 # Atomic UI primitives (Button, Card, Modal, Slider)
    │   │   └── index.js        # Barrel export for @/components/ui
    │   ├── common/             # Common shared elements (e.g. StatusBadge)
    │   ├── dashboard/          # Dashboard sub-components
    │   ├── Attendance/         # Attendance modal components
    │   ├── LeadDetails/        # Lead details view components
    │   ├── Finance/            # Invoice / PDF / A4 templates
    │   ├── tracking/           # Live tracking map component
    │   └── index.js            # Unified barrel export for @/components
    │
    ├── layouts/                # Role-based & view layouts
    │   ├── AdminLayout/        # Administrator layout wrapper
    │   ├── EmployeeLayout/     # Employee layout wrapper
    │   ├── ManagerLayout/      # Manager layout wrapper
    │   ├── AuthLayout/         # Authentication views layout
    │   ├── PublicLayout/       # Marketing & public layout
    │   ├── components/         # Shared layout parts (Sidebar, Header, Topbar, Breadcrumbs)
    │   └── index.js            # Barrel export for @/layouts
    │
    ├── modules/                # Feature-driven business modules
    │   ├── communication/      # Call recordings, Email CRM, Blast
    │   ├── dashboard/          # Role-based dashboard views
    │   ├── developer/          # Access tokens, API integrations, Maps showcase
    │   │   └── maps/           # Map showcase & controls dashboard (moved from src/Maps)
    │   ├── finance/            # Fee receipts, Invoices, Offer letters, Payslips, Quotations
    │   ├── management/         # Attendance records, Departments, Live Employee Tracking
    │   ├── marketing/          # Campaigns, Digital calendar, Leads, Reports, Leaderboard
    │   └── tasks/              # Tasks management
    │
    ├── pages/                  # Page-level route views
    │   ├── auth/               # Login, Sign up, Reset password, Verification
    │   ├── landing/            # Landing page hero, pricing, features, footer
    │   ├── errors/             # 403, 404, 500 pages
    │   ├── Billing.jsx
    │   ├── CustomActions.jsx
    │   ├── Fields.jsx
    │   ├── MyPreferences.jsx
    │   ├── PermissionTemplates.jsx
    │   ├── Profile.jsx
    │   ├── WorkspacePreferences.jsx
    │   └── index.js            # Barrel export for @/pages
    │
    ├── services/               # External APIs, sockets, and data clients
    │   ├── api/                # Axios client, endpoints, interceptors, error handling
    │   ├── auth/               # Authentication service functions
    │   ├── notifications/      # Real-time and push notifications
    │   ├── storage/            # Local/session storage utilities
    │   ├── api.js              # Central API gateway
    │   ├── geoTracker.js       # Geolocation tracking engine
    │   ├── trackingSocketClient.js # Live tracking web socket
    │   └── index.js            # Barrel export for @/services
    │
    ├── permissions/            # RBAC definitions & Route guards
    │   ├── roles.js            # Core roles: ADMIN, MANAGER, EMPLOYEE
    │   ├── permissions.js      # Granular permission flags
    │   ├── routePermissions.js # Route permission mapping
    │   ├── permissionGuard.jsx # Declarative permission guard component
    │   └── index.js            # Barrel export for @/permissions
    │
    ├── hooks/                  # Custom React hooks
    │   ├── useBreakpoint.js
    │   ├── useDebounce.js
    │   ├── usePagination.js
    │   ├── usePermissions.js
    │   ├── useTheme.js
    │   └── index.js            # Barrel export for @/hooks
    │
    ├── context/                # React Contexts
    │   ├── AuthContext.jsx
    │   ├── SidebarContext.jsx
    │   └── index.js            # Barrel export for @/context
    │
    ├── constants/              # System constants and enum maps
    │   ├── routes.js
    │   ├── status.js
    │   ├── trackingConfig.js   # Geolocation & office coordinates config (moved from src/config)
    │   └── index.js            # Barrel export for @/constants
    │
    ├── utils/                  # Helper utilities and data transforms
    │   ├── cn.js               # Tailwind class merger utility (clsx + twMerge, moved from src/lib)
    │   ├── dateFormat.js
    │   ├── emailTemplateUtils.js
    │   ├── excelTemplate.js
    │   ├── numberToWords.js
    │   ├── permissions.js
    │   └── index.js            # Barrel export for @/utils
    │
    └── types/                  # Data structures & mock schema definitions
        ├── api.js
        ├── auth.js
        ├── common.js
        └── user.js
```

---

## 2. Standardized Import Conventions

With the addition of `jsconfig.json` and barrel exports, imports can be written concisely and clearly:

```javascript
// Components & UI
import { Button, Card, ConfirmModal } from '@/components/ui';
import { StatusBadge, LiveMap } from '@/components';

// Layouts
import { AdminLayout, Breadcrumbs, Topbar } from '@/layouts';

// Hooks & Context
import { useAuth, useSidebar } from '@/context';
import { useDebounce, usePagination } from '@/hooks';

// Services & Utils
import { api, getEmployees } from '@/services';
import { formatDate, numberToWords } from '@/utils';
import { ROLES, PermissionGuard } from '@/permissions';
```


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


# Google Sheets All Tabs → CRM Render Backend (n8n)

## Included sheet tabs
- Digital Marketing_Leads
- SAP_Leads
- Python_Leads
- CyberSecurity_Leads

Each tab reads columns A:ZZ. Confirm these exact tab names exist; edit/remove/add reader nodes if your spreadsheet has other tabs.

## Import
1. In n8n, choose Workflows → Import from File.
2. Import `google_sheets_all_tabs_render_crm.json`.
3. Open each `Read - ...` node and select your working Google Sheets OAuth credential. The credential ID in an exported workflow may not exist in another n8n instance.
4. Run the workflow and inspect each Read node and `Combine All Tabs`.

## Important backend configuration
The HTTP Request URL starts with your supplied Render API base:
`https://telecommunication-l3oz.onrender.com/api`

The exact lead-create route was not provided, so the URL intentionally ends in:
`/REPLACE_WITH_REAL_LEAD_ENDPOINT`

Also replace `Bearer REPLACE_WITH_CRM_TOKEN` and map the body to the exact fields expected by your backend. The CRM node is disabled until configured, to prevent accidental failed imports.

## Notes
- `A:ZZ` reads columns A through ZZ, not every tab automatically; each tab has its own reader node.
- This starter workflow does not deduplicate leads. Add backend-side idempotency/deduplication before importing production data.
- The five tab names are based on the names supplied in the conversation; add nodes for any other tabs.


n8n workflow :
{
  "name": "Google Sheets All Leads to CRM - Render Backend",
  "nodes": [
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'Digital Marketing_Leads'!A:ZZ",
        "options": {}
      },
      "id": "c3b18d95-cc93-46f2-a8fb-f0795feb6270",
      "name": "Read - Digital Marketing_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        176
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'Digital Marketing_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'SAP_Leads'!A:ZZ",
        "options": {}
      },
      "id": "feccae78-fda0-41f7-9149-a0f876e2c5c6",
      "name": "Read - SAP_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        336
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'SAP_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'Python_Leads'!A:ZZ",
        "options": {}
      },
      "id": "bed451e4-c0ec-4e74-9c82-d94e19961d91",
      "name": "Read - Python_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        512
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'Python_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "authentication": "oAuth2",
        "sheetId": "1NK3yVkkKxAOjgTCL46nEaC1lzpOxnn1vCeTAY9nX2Jg",
        "range": "'CyberSecurity_Leads'!A:ZZ",
        "options": {}
      },
      "id": "5c281f54-6337-4d67-bada-c9081624078d",
      "name": "Read - CyberSecurity_Leads",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 1,
      "position": [
        496,
        704
      ],
      "alwaysOutputData": false,
      "executeOnce": false,
      "notesInFlow": true,
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "Z78t7YLL8GqHco4o",
          "name": "Google Sheets account 6"
        }
      },
      "notes": "Reads all columns A:ZZ from the 'CyberSecurity_Leads' tab. After import, select the Google Sheets credential that has access to this spreadsheet."
    },
    {
      "parameters": {
        "numberInputs": 5
      },
      "id": "78b5c18c-9a0c-450e-92eb-21273ef53882",
      "name": "Combine All Tabs",
      "type": "n8n-nodes-base.merge",
      "typeVersion": 3.2,
      "position": [
        1024,
        352
      ],
      "notesInFlow": true,
      "notes": "Combines rows from the five configured sheet tabs. If your n8n version uses a different Merge node UI, set Mode to Append and connect each Read node to a separate input."
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://telecommunication-l3oz.onrender.com/api/REPLACE_WITH_REAL_LEAD_ENDPOINT",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer REPLACE_WITH_CRM_TOKEN"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { name: $json.name || $json.Name || $json['Full Name'] || '', email: $json.email || $json.Email || '', phone: $json.phone || $json.Phone || $json.mobile || '', source: 'google_sheets', company: $json.company || $json.Company || '' } }}",
        "options": {}
      },
      "id": "676b1d29-9d7e-45e0-bd4e-5a230216587a",
      "name": "Create Lead in CRM1",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        1472,
        400
      ],
      "notesInFlow": true,
      "disabled": true,
      "notes": "Disabled intentionally until the real lead-create endpoint, authentication, and request schema are confirmed. Replace the endpoint suffix and token, then map fields to your backend's expected schema."
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "Meta_Leads",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.2,
      "position": [
        -96,
        416
      ],
      "id": "37674129-7e79-400e-8c48-3557dc2b920a",
      "name": "Webhook",
      "webhookId": "d64b82cd-b8b1-4934-bb84-b90268fd084f"
    }
  ],
  "pinData": {},
  "connections": {
    "Combine All Tabs": {
      "main": [
        [
          {
            "node": "Create Lead in CRM1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read - Digital Marketing_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Read - SAP_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 1
          }
        ]
      ]
    },
    "Read - Python_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 2
          }
        ]
      ]
    },
    "Read - CyberSecurity_Leads": {
      "main": [
        [
          {
            "node": "Combine All Tabs",
            "type": "main",
            "index": 3
          }
        ]
      ]
    },
    "Webhook": {
      "main": [
        [
          {
            "node": "Read - Digital Marketing_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - SAP_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - Python_Leads",
            "type": "main",
            "index": 0
          },
          {
            "node": "Read - CyberSecurity_Leads",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1",
    "binaryMode": "separate"
  },
  "versionId": "c837c550-54ea-4c4a-9bf7-f0a1968c42fa",
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "ac53766b75ba98327cb8367953362c144cd1e7b33149a3b252d1556380af54e8"
  },
  "nodeGroups": [],
  "id": "Cf3Wiu05i5DH1X7q",
  "tags": []
}

---

# AOTMS CRM — Daily Activity & Telecaller Workspace Implementation

## Executive Summary
This document summarizes the complete implementation of the **Daily Activity & Telecaller Workspace** and the safe retirement of the legacy Tasks & TODO module as defined in `todo.md`.

---

## 1. Daily Activity & Telecaller Workspace Architecture

### 1.1 Overview
The Daily Activity system replaces the legacy task tracker with a role-based, department-validated workspace that tracks employee productivity, shift attendance, calling metrics, and daily achievements.

### 1.2 Frontend Routes & Navigation
- **Workspace Route**: `/daily-activity` (aliases: `/daily-activities`, `/:userId/daily-activity`)
- **Protected Layout**: Sidebar includes `Daily Activity` with an emerald calendar icon (`#10b981`).
- **Legacy Fallbacks**: All previous routes (`/tasks`, `/task`, `/todos`, `/todo`, `/follow-ups`, `/followups`) seamlessly redirect to `/daily-activity` without broken links.

### 1.3 Key Components
1. **Interactive Monthly Calendar** (`frontend/src/modules/daily-activities/ActivityCalendar.jsx`):
   - Monthly navigation and date status indicator dots (Submitted, Draft, Needs Correction, Missing).
   - Jump to Today functionality.
2. **Department-Specific Activity Forms** (`DepartmentActivityForm.jsx`):
   - **Telecalling**: Metrics (Attempted, Connected, Unanswered, Interested, Follow-ups, Conversions), lead call outcome tracking with dynamic follow-up scheduling, blockers, remarks.
   - **Developer**: Module name, Task ID, Features Implemented, PR Link, Blockers, Status.
   - **Management**: Key Activities, Decisions, Risk/Escalations, Follow-up Owner.
   - **Trainer**: Batch/Course, Session Topic, Attendance Count, Topics Covered.
3. **Activity History Table** (`ActivityHistoryTable.jsx`):
   - Paginated historical logs of personal daily activity submissions.
4. **Follow-Up Tracker** (`FollowUpTracker.jsx`):
   - Live view of today's and upcoming lead call follow-ups with instant lead profile links.
5. **Admin Review & Overview** (`AdminActivityOverview.jsx`):
   - Multi-filter overview for Admins/Managers to inspect, approve, or request corrections with mandatory notes.

---

## 2. Backend API Contract (`/api/daily-activities`)

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/daily-activities` | Authenticated Employee | Save or update draft for requested date |
| `GET` | `/api/daily-activities?date=YYYY-MM-DD` | Owner / Authorized Admin | Fetch daily report for specific date |
| `GET` | `/api/daily-activities/calendar?month=YYYY-MM` | Owner / Authorized Admin | Get status marker dots for full calendar month |
| `POST` | `/api/daily-activities/:id/submit` | Report Owner | Formally submit report for management review |
| `GET` | `/api/daily-activities/history` | Authenticated Employee | Paginated personal activity submission history |
| `GET` | `/api/daily-activities/follow-ups` | Authenticated Telecaller | Call follow-ups due today and upcoming |
| `GET` | `/api/daily-activities/admin/overview` | Admin / Authorized Manager | Multi-filter organization overview |
| `GET` | `/api/daily-activities/:id` | Owner / Admin | Detailed single report inspection |
| `PATCH` | `/api/daily-activities/:id/review` | Admin / Authorized Manager | Approve or request correction with remarks |

---

## 3. Legacy Tasks/TODO Module Retirement & Database Cleanup

### 3.1 Unmounted & Removed Modules
- **Frontend Components**: Removed `frontend/src/modules/tasks/`, `components/dashboard/Task/`, and `components/dashboard/Todo/`.
- **Backend Endpoints**: Unmounted `/api/tasks` and `/api/todos` (returns 404).
- **Backend Files Removed**:
  - `backend/src/modules/tasks/tasks.js`
  - `backend/src/modules/tasks/todos.js`
  - `backend/src/database/models/Task.js`
  - `backend/src/database/models/Todo.js`
- **Attendance Modal Cleaned**: Permanently excised "Step 2/2: Todo Required" modal and multi-assignee Todo form from `MandatoryAttendanceModal.jsx`. Single-step Attendance clock-in restored.

### 3.2 Database Migration & Permanent Backups
- **JSON Backups Preserved**:
  - `backend/backups/tasks_backup.json` (11 documents preserved)
  - `backend/backups/todos_backup.json` (71 documents preserved)
- **Collections Cleaned**:
  - `tasks` collection dropped from MongoDB Atlas.
  - `todos` collection dropped from MongoDB Atlas.

### 3.3 Protected & Preserved Modules
- **`/api/followups`**: Fully active, isolated, and powered directly by the `FollowUp` schema for CRM lead calling and follow-up scheduling.
- **Background Jobs**: `taskReminderChecker.js` and `taskOverdueChecker.js` continue uninterrupted.
- **Digital Marketing**: `/digital-calendar` and its underlying schemas/routes remain 100% untouched.

---

## 4. Verification & Validation Metrics
- **Frontend Production Build**: `vite build` completed with **Exit code 0** (0 errors).
- **Backend Regression Suite**: `scripts/comprehensive_validation.js` completed with **20/20 PASSED** (0 failures).

---

## 5. Department-Specific Workspaces & UI/UX Refinements

### 5.1 Digital Marketing Department & Digital Calendar
- **Digital Department Workspace Routing**: Because the Digital Marketing team already has the interactive, dedicated **Digital Calendar** (`/digital-calendar`), **Daily Activity** is permanently hidden and excluded from their navigation (Sidebar and Navbar).
- Direct visits and post-login redirections for Digital Marketing staff automatically land on `/digital-calendar`.
- **Digital Calendar Typography Overhaul**: Permanently removed harsh bold weights (`font-black`, `font-extrabold`, and `font-bold`) across the entire `DigitalCalendar.jsx` module, transitioning to clean, refined `font-medium` and `font-semibold` tokens.

### 5.2 Developer Department
- **Removed Calling Features**: Completely hid the **Follow-up Call Tracker** widget from the Developer view so that their activity history table spans full width cleanly.
- **Form Typography & Information Hints**: Removed bold styling from inputs and added clear, informative placeholder guidance for project deliverables, task IDs, git pull requests, blockers, and next-day plans.

### 5.3 Telecalling Department
- **Calling Performance Metrics Redesign**: Replaced heavy bold number inputs with balanced, responsive counters with informative tooltips and placeholders (*"Total calls"*, *"Answered"*, *"No reply"*, *"Positive"*, *"Callbacks"*, *"Confirmed"*).



