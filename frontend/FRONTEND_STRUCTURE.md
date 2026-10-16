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
