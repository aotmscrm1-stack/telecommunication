# AOTMS CRM & Telecommunication Platform — Production VPS & Docker Implementation

Complete, verified production deployment guide and Docker containerization blueprint for the AOTMS Enterprise Telecommunication & CRM Platform on the **NVMe 4 VPS** (Public IP: `129.121.171.204`, 2 vCPU, 4 GB DDR5 RAM, 100 GB NVMe).

---

## 1. Existing Project Architecture Analysis (Verified from Codebase)

The codebase has been thoroughly audited across all modules. Below is the verified discovery:

### A. Frontend (`/frontend`)
- **Framework & Bundler**: React 18.2.0, Vite 5.0.8, React Router DOM 6.21.1.
- **API Resolution**: `frontend/src/services/api.js` automatically resolves `import.meta.env.VITE_API_URL` or defaults to `'/api'` in production. All HTTP requests are routed without CORS friction when served under the same origin.
- **WebSocket Resolution**: `frontend/src/services/trackingSocketClient.js` resolves `import.meta.env.VITE_SOCKET_URL` or defaults to `window.location.origin` (WSS) in production.
- **Single Page Application Routing**: Client-side routing with `react-router-dom` requires Nginx `try_files $uri $uri/ /index.html` fallback to prevent 404 errors on page reloads.

### B. Backend (`/backend`)
- **Runtime & Framework**: Node.js v20+, Express 4.18.2, HTTP server with Socket.io 4.8.3.
- **Entry Point**: `src/app/server.js` listens on `process.env.PORT || 5000`.
- **Initialization Pipeline (`src/app/providers.js`)**:
  1. Connects to MongoDB via Mongoose.
  2. Attaches WebSocket Server (`/ws`) and Tracking Socket.io Server (`/socket.io/`).
  3. Launches background workers (`taskOverdueChecker`, `taskReminderChecker` every 5 minutes).
  4. Runs database schema migration checks.
- **Health Check Endpoint**: `GET /api/health` ➔ returns HTTP 200 `{ status: 'ok', app: 'AOTMS Backend Enterprise' }`.
- **Master Route Prefix**: `src/app/routes.js` mounted at `/api`.
- **Static Endpoints**:
  - `GET /download-apk` ➔ Serves `uploads/app-release.apk` for field staff.
  - `GET /uploads/*` ➔ Static file serving with HTTP Range headers for call recording seeking.

### C. Real-Time Communication & WebSockets
- **Live Location Tracking**: `src/modules/management/live-tracking/trackingSocket.js` authenticates sockets via JWT in the handshake header/query, tracks geofencing against office coordinates, and emits live GPS updates.
- **Native WebSocket**: `src/app/websocket.js` provides lightweight `/ws` connections.

### D. Database & External Services
- **Database**: MongoDB Atlas Cloud (`MONGODB_URI` / `MONGO_URI`). In production, `ALLOW_MEMORY_DB_FALLBACK=false` prevents accidental in-memory fallback.
- **Call Recordings**: Handled via Multer disk storage buffer (`uploads/recordings`), then directly uploaded to **Cloudinary** (`uploadAudioToCloudinary`) for scalable object storage. Audio stream endpoint `/api/recordings/stream/:filename` streams or redirects to secure Cloudinary URLs.
- **Push Notifications (FCM)**: `src/modules/notifications/fcmService.js` uses `firebase-admin v14`. Supports `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_BASE64` environment variables, avoiding baking physical JSON keys into Docker images.

### E. Mobile App (`/Mobile_APP`)
- **Stack**: React Native 0.86, Expo 57, Axios, Expo Location, Expo Notifications.
- **API Target**: Configured in `Mobile_APP/src/api/client.js` (`API_BASE_URL`). Update from development Render URL to production domain: `https://crm.academyoftechmasters.com/api`.

---

## 2. Target Container Architecture & Resource Budget

### Hardware Capacity (NVMe 4 VPS)
- **vCPU**: 2 Cores
- **RAM**: 4 GB DDR5
- **Storage**: 100 GB NVMe SSD
- **Expected Concurrency**: ~25 Office Employees + Field Staff

### Container Layout
```
                                 [ Internet / Clients ]
                                           │
                                  Ports 80 / 443 (TLS)
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │             Nginx Gateway               │
                      │       Let's Encrypt SSL Termination     │
                      │              Port 80 / 443              │
                      │          Memory Limit: ~128 MB          │
                      └────────────────────┬────────────────────┘
                                           │
                         Private Docker Network: `aotms-network`
                                           │
                      ┌────────────────────┴────────────────────┐
                      ▼                                         ▼
        ┌───────────────────────────┐             ┌───────────────────────────┐
        │     Frontend Service      │             │      Backend Service      │
        │   `nginx:alpine` Static   │             │    `node:20-alpine` App   │
        │    Internal Port: 80      │             │    Internal Port: 5000    │
        │   Memory Limit: ~128 MB   │             │   Memory Limit: ~1.5 GB   │
        └───────────────────────────┘             └─────────────┬─────────────┘
                                                                │
                                            ┌───────────────────┴───────────────────┐
                                            ▼                                       ▼
                               [ MongoDB Atlas (Cloud) ]               [ Cloudinary Object Store ]
                                  (External Database)                     (Call Recordings Audio)
```

### Memory Allocation Breakdown
| Service / Process | Allocation Limit | Typical Active Usage |
| :--- | :--- | :--- |
| **Ubuntu Host OS & Kernel** | 512 MB | ~380 MB |
| **Nginx Gateway (Proxy + SSL)** | 128 MB | ~35 MB |
| **Frontend Static (nginx:alpine)** | 128 MB | ~25 MB |
| **Backend API (Node 20 + Sockets)** | 1,536 MB (1.5 GB) | ~350 MB – 650 MB |
| **Docker Engine & Logging** | 256 MB | ~120 MB |
| **System Buffer & Page Cache** | Remainder (~1.4 GB) | High speed NVMe disk cache |
| **Total** | **4,096 MB (4 GB)** | **~1.2 GB utilized (2.8 GB headroom)** |

> **Single Backend Decision**: Running 1 unified backend container is optimal for 25 employees. It prevents duplicate cron job execution (task reminders and overdue checks) while utilizing only ~15% of the 2 vCPUs.

---

## 3. Docker Implementation Blueprint

### A. Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
# Multi-stage production backend
FROM node:20-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for Docker health check
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create uploads directory with correct permissions
RUN mkdir -p /app/uploads/recordings && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/app/server.js"]
```

### B. Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Stage 1: Build React Vite Bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Serve static files with lightweight Nginx
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Clean default html
RUN rm -rf ./*

# Copy built dist files
COPY --from=builder /app/dist .

# Copy custom frontend nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### C. Frontend Nginx Configuration (`frontend/nginx.conf`)
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression for high-speed delivery
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # SPA Fallback: Send all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets long-term caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Disable access logs for favicon & robots
    location = /favicon.ico { log_not_found off; access_log off; }
    location = /robots.txt  { log_not_found off; access_log off; }
}
```

### D. Production Docker Compose (`compose.yaml`)
```yaml
services:
  # ── 1. FRONTEND SERVICE ──────────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: aotms-frontend
    restart: always
    networks:
      - aotms-network
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 256M

  # ── 2. BACKEND API & SOCKETS SERVICE ─────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: aotms-backend
    restart: always
    env_file:
      - ./backend/.env
    networks:
      - aotms-network
    volumes:
      - backend-uploads:/app/uploads
    deploy:
      resources:
        limits:
          cpus: '1.50'
          memory: 1536M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  # ── 3. NGINX GATEWAY & SSL TERMINATION ────────────────────────────────────
  nginx-gateway:
    image: nginx:alpine
    container_name: aotms-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
      - backend-uploads:/var/www/uploads:ro
    networks:
      - aotms-network
    depends_on:
      frontend:
        condition: service_started
      backend:
        condition: service_healthy
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

networks:
  aotms-network:
    driver: bridge

volumes:
  backend-uploads:
    driver: local
```

### E. Root Nginx Reverse Proxy Configuration (`nginx/nginx.conf`)
```nginx
# Upstream Definitions
upstream frontend_service {
    server frontend:80;
}

upstream backend_service {
    server backend:5000;
}

# 1. HTTP to HTTPS Auto-Redirect
server {
    listen 80;
    server_name crm.academyoftechmasters.com;

    # Certbot ACME Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# 2. Main Production HTTPS Server
server {
    listen 443 ssl http2;
    server_name crm.academyoftechmasters.com;

    # TLS Certificates (Configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/crm.academyoftechmasters.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.academyoftechmasters.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client payload size (50MB for call recordings & bulk imports)
    client_max_body_size 50M;

    # ── A. FRONTEND SPA ─────────────────────────────────────────────────────
    location / {
        proxy_pass http://frontend_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── B. BACKEND REST API ─────────────────────────────────────────────────
    location /api/ {
        proxy_pass http://backend_service/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }

    # ── C. WEBSOCKETS (SOCKET.IO) ───────────────────────────────────────────
    location /socket.io/ {
        proxy_pass http://backend_service/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # ── D. NATIVE WEBSOCKETS (/ws) ──────────────────────────────────────────
    location /ws {
        proxy_pass http://backend_service/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }

    # ── E. DIRECT APK DOWNLOAD ──────────────────────────────────────────────
    location /download-apk {
        proxy_pass http://backend_service/download-apk;
        proxy_set_header Host $host;
    }

    # ── F. LOCAL RECORDINGS & UPLOADS STREAMING ──────────────────────────────
    location /uploads/ {
        alias /var/www/uploads/;
        autoindex off;
        add_header Accept-Ranges bytes;
        add_header Access-Control-Allow-Origin *;
        expires 7d;
    }
}
```

---

## 4. Production Environment Variables Matrix

### A. Backend (`backend/.env`)
| Variable | Production Value / Description | Required |
| :--- | :--- | :---: |
| `PORT` | `5000` | Yes |
| `NODE_ENV` | `production` | Yes |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/aotms_crm?retryWrites=true&w=majority` | Yes |
| `ALLOW_MEMORY_DB_FALLBACK` | `false` | Yes |
| `JWT_SECRET` | 64-character high-entropy cryptographic hex secret | Yes |
| `FRONTEND_URL` | `https://crm.academyoftechmasters.com` | Yes |
| `PUBLIC_BASE_URL` | `https://crm.academyoftechmasters.com` | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name for voice call storage | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Yes |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Base64-encoded `firebase-adminsdk.json` string (no file path required) | Yes |
| `OPENAI_API_KEY` | OpenAI API key for Whisper speech-to-text transcripts | Optional |
| `RESEND_API_KEY` | Resend API key for automated notifications and reports | Optional |
| `META_WA_ACCESS_TOKEN` | WhatsApp Cloud API permanent system user token | Optional |
| `META_WA_PHONE_NUMBER_ID` | WhatsApp Business Account phone number ID | Optional |
| `META_WA_VERIFY_TOKEN` | Custom verification token string for webhook setup | Optional |

### B. Frontend (`frontend/.env.production`)
| Variable | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `/api` | Relative path routes through Nginx gateway without cross-origin latency |
| `VITE_SOCKET_URL` | `https://crm.academyoftechmasters.com` | Production WebSocket endpoint |

---

## 5. Step-by-Step VPS Provisioning & Deployment Workflow

### Step 1: Initialize Ubuntu VPS & Docker Engine
Run on the clean VPS via SSH:
```bash
# 1. Update OS packages
sudo apt update && sudo apt upgrade -y

# 2. Install essential tools
sudo apt install -y curl git ufw ca-certificates gnupg lsb-release

# 3. Configure UFW Firewall (Only SSH, HTTP, HTTPS)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 4. Install official Docker Engine and Docker Compose Plugin
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository & Setup Directories
```bash
sudo mkdir -p /var/www/aotms
sudo chown -R $USER:$USER /var/www/aotms
cd /var/www/aotms

# Clone codebase
git clone https://github.com/aotmscrm1-stack/telecommunication.git .

# Create nginx, certbot, and uploads directories
mkdir -p nginx certbot/conf certbot/www
```

### Step 3: Issue SSL Certificate via Let's Encrypt (Certbot)
Before running the full HTTPS container, obtain the certificate using standalone Certbot:
```bash
sudo apt install -y certbot

# Ensure port 80 is free, then obtain initial certificate:
sudo certbot certonly --standalone -d crm.academyoftechmasters.com --non-interactive --agree-tos -m admin@academyoftechmasters.com

# Copy or link certificates to Docker directory
mkdir -p /var/www/aotms/certbot/conf/live/crm.academyoftechmasters.com/
sudo cp /etc/letsencrypt/live/crm.academyoftechmasters.com/* /var/www/aotms/certbot/conf/live/crm.academyoftechmasters.com/
sudo chown -R $USER:$USER /var/www/aotms/certbot
```

### Step 4: Configure Production Secrets
```bash
# Create backend .env
nano backend/.env
# (Paste production environment variables from Section 4.A)

# Ensure .env is restricted
chmod 600 backend/.env
```

### Step 5: Validate and Launch with Docker Compose
```bash
cd /var/www/aotms

# 1. Validate Docker Compose configuration
docker compose config

# 2. Build production images
docker compose build --no-cache

# 3. Start services in background
docker compose up -d

# 4. Verify container statuses
docker compose ps

# 5. View live logs
docker compose logs -f --tail=50
```

---

## 6. Verification & Acceptance Testing (All Criteria)

Verify every check before declaring production ready:

| Acceptance Test | Verification Command / Step | Expected Result |
| :--- | :--- | :--- |
| **1. Frontend Build** | `docker compose build frontend` | Succeeded, zero errors |
| **2. Backend Health** | `curl -f http://localhost:5000/api/health` | `{"status":"ok","app":"AOTMS Backend Enterprise"}` |
| **3. Container Status** | `docker compose ps` | All 3 services `Up` (`healthy`) |
| **4. Database Connection** | `docker compose logs backend \| grep "MongoDB Connected"` | `MongoDB Connected: cluster0-shard...` |
| **5. HTTPS & SSL** | `curl -I https://crm.academyoftechmasters.com` | `HTTP/2 200` with valid TLS certificate |
| **6. HTTP ➔ HTTPS Redirect** | `curl -I http://crm.academyoftechmasters.com` | `HTTP/1.1 301 Moved Permanently` |
| **7. WebSocket Connection** | Open CRM in browser ➔ DevTools Network ➔ `WS` tab | Active connection to `/socket.io/?EIO=4&transport=websocket` |
| **8. SPA Route Reload** | Browse to `https://crm.academyoftechmasters.com/recordings` and press F5 | Page reloads cleanly without 404 error |
| **9. Recording Upload/Stream** | Play a call recording in the UI | Audio plays without stuttering via HTTP Range headers |
| **10. Memory & CPU Usage** | `docker stats --no-stream` | Total RAM < 1.5 GB, CPU idle < 5% |
| **11. System Reboot Test** | `sudo reboot` (after reboot: `docker compose ps`) | All containers automatically restarted (`restart: always`) |

---

## 7. Operational Maintenance & Rollback

### A. Deploying New Code Updates
```bash
cd /var/www/aotms

# Pull latest code
git pull origin main

# Rebuild and restart with zero prolonged downtime
docker compose build
docker compose up -d

# Clean up stale images
docker image prune -f
```

### B. Automated SSL Auto-Renewal (Cron)
Add a monthly cron job to auto-renew the certificate:
```bash
sudo crontab -e
# Add line:
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/crm.academyoftechmasters.com/* /var/www/aotms/certbot/conf/live/crm.academyoftechmasters.com/ && docker compose exec nginx-gateway nginx -s reload
```

### C. Fast Rollback Procedure
If a bad deployment occurs:
```bash
cd /var/www/aotms

# 1. Rollback git commit
git log -n 5 --oneline
git checkout <PREVIOUS_STABLE_COMMIT_HASH>

# 2. Rebuild and restart
docker compose up -d --build

# 3. Verify health
docker compose ps
docker compose logs backend --tail=50
```