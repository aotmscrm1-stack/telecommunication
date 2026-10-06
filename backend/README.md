# AOTMS Telecommunication CRM — Enterprise Backend API

A high-performance, modular, and enterprise-grade Node.js/Express backend built for Telecommunication CRM systems.

---

## 📱 Meta WhatsApp Cloud API & `@chat-adapter/whatsapp` Adapter Architecture

> ✅ **Chat SDK & `@chat-adapter/whatsapp` Adapter — INTEGRATED**  
> ✅ **Direct Meta Graph API (`axios`) & Adapter Layer (`src/integrations/whatsapp/`) — USED**  
> ✅ **HMAC-SHA256 (`X-Hub-Signature-256`) Webhook Security — VERIFIED**

Our CRM utilizes the official `@chat-adapter/whatsapp` adapter alongside direct Meta Graph API integration (`v22.0`) to handle WhatsApp Business Cloud API communication.

### Environment Configuration:
```env
WHATSAPP_ACCESS_TOKEN=your_meta_system_user_access_token
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token
WHATSAPP_WABA_ID=your_whatsapp_business_account_id
WHATSAPP_API_URL=https://graph.facebook.com
```

### Enabled Production Features in CRM:
- ✅ **Template Messages**: Submit, sync, and send pre-approved Meta WhatsApp templates.
- ✅ **Interactive Reply Buttons**: Send interactive button messages (up to 3 quick-reply buttons).
- ✅ **List Messages**: Send structured multi-section interactive list messages.
- ✅ **Rich Media Attachments**: Upload and send images, documents, audio, video, and stickers.
- ✅ **Read Receipts & Typing Indicators**: Mark inbound messages as read (`markAsRead`) and display typing status (`startTyping`).
- ✅ **Inbound Webhooks & HMAC Verification**: Real-time webhook processing with `X-Hub-Signature-256` HMAC-SHA256 verification.
- ✅ **Delivery & Read Status**: Track real-time message delivery (`sent`, `delivered`, `read`, `failed`).
- ✅ **Automated Lead Workflow**: Inbound replies automatically transition lead status to `pending` and trigger real-time WebSocket updates.

---

## 🏛 System Architecture & Directory Tree

```
backend/
│
├── docs/
│   ├── api/                     # API documentation & endpoints
│   ├── architecture/            # Architecture blueprints
│   └── workflows/               # Automated background workflow docs
│
├── logs/                        # Server runtime log storage
│
├── src/
│   │
│   ├── app/
│   │   ├── app.js               # Express application initialization & middleware
│   │   ├── server.js            # HTTP Server listener & entry point
│   │   ├── routes.js            # Master route aggregator
│   │   └── providers.js         # DB connection, websockets & background task providers
│   │
│   ├── config/
│   │   ├── env.js               # Environment variables configuration
│   │   ├── database.js          # MongoDB connection initializer
│   │   ├── redis.js             # Redis cache client configuration
│   │   ├── officeConfig.js      # Office geofencing coordinates & work hours
│   │   └── services.js          # Telephony, Meta WhatsApp & FCM credentials
│   │
│   ├── core/
│   │   ├── errors/              # Custom ApiError classes (BadRequest, Auth, NotFound)
│   │   ├── middleware/          # Basic Auth, JWT, Rate Limiter & Global Error Handlers
│   │   ├── logger/              # Structured Logger utility
│   │   ├── response/            # Standardized ApiResponse formatter
│   │   ├── validation/          # Zod schema validation engine & schemas
│   │   ├── security/            # Password hashing & JWT generation helpers
│   │   └── utils/               # Phone normalization, Cloudinary & reverse geocoding
│   │
│   ├── modules/
│   │   ├── auth/                # Authentication controllers, routes & Zod validation
│   │   ├── users/               # User management & roles
│   │   ├── organizations/       # Workspace preferences & company settings
│   │   ├── roles/               # Role permission templates
│   │   ├── permissions/         # Role-based access control (RBAC) guards
│   │   ├── dashboard/           # Dashboard analytics & performance reports
│   │   ├── tasks/               # Tasks, Todos, and Follow-ups
│   │   ├── marketing/
│   │   │   ├── leads/           # Lead management, custom fields, stages & bulk import
│   │   │   ├── campaigns/       # Email & WhatsApp marketing campaigns
│   │   │   ├── contacts/        # Contacts & phone blocklist
│   │   │   ├── whatsapp-blast/  # WhatsApp broadcast lists & bulk messaging
│   │   │   ├── whatsapp/        # Meta WhatsApp inbox & message templates
│   │   │   ├── leaderboard/     # Leaderboards & learning courses
│   │   │   └── reports/         # Marketing performance analytics
│   │   ├── finance/
│   │   │   ├── offer-letters/   # Offer letter generator
│   │   │   ├── payslips/        # Employee payslip documents
│   │   │   ├── quotations/      # Price quotations
│   │   │   ├── invoices/        # Invoices, billing & payment records
│   │   │   └── fee-receipts/    # Fee receipts
│   │   ├── management/
│   │   │   ├── departments/     # Department hierarchy management
│   │   │   ├── attendance/      # Attendance records & geofenced check-ins
│   │   │   └── live-tracking/   # Real-time GPS location tracking & call logs
│   │   ├── communication/
│   │   │   ├── calls/           # AI Calling, transcription & call audit logs
│   │   │   ├── email/           # Email CRM & log manager
│   │   │   ├── whatsapp/        # Meta WhatsApp Cloud API webhooks
│   │   │   └── instagram/       # Instagram DM integration adapter
│   │   ├── notifications/       # Push notifications & FCM integration
│   │   ├── automation/          # Custom actions & workflow engine
│   │   └── audit/               # System audit logging
│   │
│   ├── integrations/
│   │   ├── calling/             # Knowlarity, CallerDesk, Maqsam telephony adapters
│   │   ├── whatsapp/            # Meta WhatsApp service (Direct Graph API)
│   │   ├── instagram/           # Instagram API service adapter
│   │   ├── email/               # Email service integration
│   │   ├── storage/             # Cloudinary asset storage adapter
│   │   └── payment/             # Payment gateway integration
│   │
│   ├── database/
│   │   ├── connection.js        # MongoDB Mongoose connection manager
│   │   ├── indexes.js           # Collection index initializers
│   │   └── seed/                # DB seeding scripts
│   │
│   ├── jobs/
│   │   ├── queues/              # Job queue manager
│   │   ├── workers/             # Task overdue & reminder background workers
│   │   └── schedulers/          # Periodic job schedulers
│   │
│   ├── events/
│   │   ├── publishers/          # Event publishers & event bus instance
│   │   └── subscribers/         # Event listeners & subscribers
│   │
│   └── types/
│       ├── auth.js              # Auth JSDoc type definitions
│       ├── api.js               # API Response interface types
│       └── common.js            # Common domain types
│
├── tests/
│   ├── unit/                    # Unit test suites
│   ├── integration/             # Integration tests
│   └── e2e/                     # End-to-end tests
│
├── scripts/                     # Maintenance & data migration scripts
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

---

## ⚡ Zod Validation Engine

All untrusted incoming request data (req.body, req.query, req.params) is validated using **Zod**, a TypeScript-first schema validation library.

### Concept & Usage

1. **Defining Zod Schemas** (`src/core/validation/schemas.js`):
   ```javascript
   const { z } = require('zod');

   const loginSchema = z.object({
     email: z.string().email('Invalid email address format'),
     password: z.string().min(6, 'Password must be at least 6 characters long'),
   });
   ```

2. **Express Middleware Validation** (`src/core/validation/validation.js`):
   ```javascript
   const validate = (schema, target = 'body') => {
     return (req, res, next) => {
       const result = schema.safeParse(req[target]);
       if (!result.success) {
         return res.status(400).json({
           success: false,
           message: 'Validation failed',
           errors: result.error.issues.map(issue => ({
             field: issue.path.join('.'),
             message: issue.message,
           }))
         });
       }
       req[target] = result.data;
       next();
     };
   };
   ```

3. **Applying in Routes** (`src/modules/auth/auth.js`):
   ```javascript
   router.post('/login', validate(loginSchema), login);
   ```

---

## 🔐 Authentication Modes

The backend supports dual authentication modes:
1. **Basic Auth (`basic-auth`)**:
   - Parses standard HTTP `Authorization: Basic <base64(email:password)>` headers.
   - Validates credentials against the MongoDB User repository using timing-safe password verification.
2. **Bearer JWT Token**:
   - Parses `Authorization: Bearer <jwt_token>` for session-based SPA client requests.

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start in development mode (with nodemon auto-reload)
npm run dev

# Start in production mode
npm start
```
