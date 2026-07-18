# UACS - Unified Authority Communication System

> A government-grade emergency mass notification platform built to protect citizens during natural disasters by delivering multilingual alerts across SMS, social media, radio, TV, and the web in real time.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Twilio](https://img.shields.io/badge/Twilio-SMS-F22F46?style=flat-square&logo=twilio)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [External APIs](#external-apis)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [User Roles and Journeys](#user-roles-and-journeys)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Dispatch Channels](#dispatch-channels)
- [Security](#security)
- [Deployment](#deployment)
- [Evacuation Assembly Points](#evacuation-assembly-points)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

UACS is a two-way emergency communication command centre that bridges the gap between disaster management authorities and the public. When a cyclone, earthquake, flood, or any disaster strikes, UACS enables:

- **Admins** to compose, translate, approve, and blast emergency alerts to targeted zones across 5 channels simultaneously.
- **Citizens** to receive alerts in their native language via SMS, confirm their safety, or send an SOS when in danger.
- **Rescue teams** to see real-time SOS requests on a map and dispatch help with a single click.

Everything is logged, auditable, and designed to operate under crisis conditions.

---

## Key Features

### For Administrators

| Feature | Description |
| ------- | ------- |
| Message Composer | Craft emergency alerts with urgency level, target zone, channel selection, and expiry timer |
| Auto-Translation | One-click translation to Hindi, Marathi, Tamil, Telugu via Google Translate with MyMemory fallback |
| Approval Workflow | Draft to Pending to Active pipeline with multi-admin review |
| Multi-Channel Dispatch | SMS, Twitter/X, Radio, TV, and CMS/Website simultaneously |
| Zone Targeting | GPS or text-based zone detection across 8+ major Indian cities |
| Emergency Broadcast | One-click critical alert that bypasses the approval queue |
| SOS Response Centre | Live triage of citizens requesting assistance with click-to-dispatch |
| Audit Log | Immutable, CSV-exportable log of every dispatch event |
| Simulation Mode | Full-screen disaster drill for training without live dispatches |
| Template Library | Save and reuse common emergency message templates |
| Recipients Manager | Add/edit phone numbers, filter by zone, send test SMS |

### For Citizens

| Feature | Description |
| ------- | ------- |
| Live Alert Bar | Active alerts appear in-app in the user's native language |
| I'm Safe / SOS | One-tap status update reported to admin dashboard in real time |
| Disaster Map | Live USGS earthquake events + NASA disaster layer + evacuation shelters |
| Evacuation Guide | Nearest assembly points with map and directions |
| Family Safety | Register emergency contacts for automatic notification |
| Message History | Full inbox of past alerts |
| Weather Widget | Real-time temperature, humidity, UV index from Open-Meteo |
| Survival Guide | Offline-style tips for floods, earthquakes, cyclones, and fires |
| Settings | Zone, language, and notification preferences |

---

## System Architecture

```text
+------------------------------------------------------------------+
|                      FRONTEND (React + Vite)                      |
|                                                                    |
|  AuthContext --- JWT ---> Axios API Layer (/api/*)                 |
|       |                          |                                 |
|  ThemeContext              LanguageContext (i18n)                  |
|       |                          |                                 |
|  17 Pages <----- React Router ---+                                 |
|  9 Components (Map, Timer, Badges, Previews...)                   |
+----------------------+-------------------------------------------+
                       | HTTP (Vite proxy in dev / Vercel in prod)
+----------------------v-------------------------------------------+
|                    BACKEND (Node.js + Express)                    |
|                                                                    |
|  Middleware          Routes              Integrations              |
|  - Helmet CSP        - /auth             - Twilio SMS              |
|  - Rate Limiting     - /messages         - Google Translate        |
|  - JWT Verify        - /dispatch         - MyMemory API            |
|  - Sanitize          - /recipients       - Twitter/X API           |
|  - Validate          - /translate                                  |
|                      - /audit            Cron Job                  |
|  DB Layer            - /webhooks         - Expire messages         |
|  Supabase JS                             - Clean JWT blocklist     |
+----------------------+-------------------------------------------+
                       |
+----------------------v-------------------------------------------+
|                     SUPABASE (PostgreSQL)                          |
|  users | messages | recipients | safety_reports | audit_log       |
|  token_blocklist                                                    |
+------------------------------------------------------------------+
```

### Message Lifecycle

```text
[Admin Composes]
      |
      v
 status: draft
      |
      v  (translate)
 translations: { hi, mr, ta, te }
      |
      v  (approve)
 status: pending
      |
      v  (dispatch)
      +--------+-----------+-----------+-----------+
     SMS     Twitter     Radio        TV        Website
   (Twilio)  (X API)   (logged)   (logged)   (webhook)
      |
      v
 status: active  <-- visible to all users
      |
      v  (60s cron checks expires_at)
 status: expired --> audit_log entry
```

---

## Tech Stack

### Backend

| Package | Version | Purpose |
| ------- | ------- | ------- |
| express | 4.x | HTTP server framework |
| @supabase/supabase-js | 2.x | PostgreSQL cloud database |
| jsonwebtoken | 9.x | JWT auth tokens with JTI per token |
| bcryptjs | 2.x | Password hashing |
| twilio | 5.x | SMS dispatch and OTP |
| node-cron | 3.x | Message expiry scheduler |
| helmet | 7.x | HTTP security headers and CSP |
| express-rate-limit | 7.x | Multi-tier rate limiting |
| express-validator | 7.x | Input validation rules |
| axios | 1.x | HTTP client for translate APIs |
| uuid | 9.x | JWT JTI generation |

### Frontend

| Package | Version | Purpose |
| ------- | ------- | ------- |
| react | 19.x | UI framework |
| vite | 5.x | Build tool and dev proxy |
| react-router-dom | 6.x | Client-side routing |
| axios | 1.x | API requests with interceptors |
| react-hot-toast | 2.x | Notification toasts |
| maplibre-gl | 5.x | Interactive WebGL vector maps |
| lucide-react | 0.x | Icon library |
| tailwindcss | 3.x | Utility-first CSS with custom variables |

---

## External APIs

All public APIs listed below are **free and require no API key**.

| API | Endpoint | Data Provided |
| ------- | ------- | ------- |
| USGS Earthquake | earthquake.usgs.gov/earthquakes/feed/v1.0 | Real-time seismic events - magnitude, coordinates, depth |
| NASA EONET | eonet.gsfc.nasa.gov/api/v3/events | Open disaster events - wildfires, volcanoes, storms, floods |
| Open-Meteo | api.open-meteo.com/v1/forecast | Temperature, humidity, UV index, weather code |
| Nominatim | nominatim.openstreetmap.org/reverse | Reverse geocoding for map-click zone detection |
| Google Translate | translate.googleapis.com/translate_a/single | Unofficial free translation endpoint |
| MyMemory API | api.mymemory.translated.net/get | Free translation fallback - 5000 words/day |

**API keys required:**

| API       | Environment Variables                                      | Purpose                   |
| ------- | ------- | ------- |
| Twilio    | TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER | SMS dispatch and OTP      |
| Twitter/X | TWITTER_BEARER_TOKEN                                       | Tweet posting on dispatch |

---

## Project Structure

```text
uacs-project/
├── .env                          Environment variables - never commit
├── .env.example                  Template for all required env vars
├── vercel.json                   Vercel deployment config
│
├── backend/
│   ├── server.js                 Express entry point - CORS, middleware, boot
│   ├── config.js                 dotenv loader
│   ├── database/
│   │   └── db.js                 Supabase client and 7 CRUD helpers
│   ├── middleware/
│   │   ├── auth.js               JWT verify, blocklist check, user hydration
│   │   └── security.js           Helmet, 4 rate limiters, sanitizer, validator
│   ├── routes/
│   │   ├── auth.js               Login, Register, Demo, OTP, Profile, Zones
│   │   ├── messages.js           CRUD, emergency broadcast, safety reports, stats
│   │   ├── dispatch.js           Multi-channel dispatcher with retry logic
│   │   ├── recipients.js         Phone list CRUD and test SMS
│   │   ├── translate.js          On-demand translation endpoint
│   │   ├── audit.js              Log viewer, CSV export, cleanup
│   │   └── webhooks.js           Twilio delivery receipt handler
│   ├── integrations/
│   │   ├── smsGateway.js         Bulk SMS with language routing and deduplication
│   │   ├── translateApi.js       Google -> MyMemory -> prefix fallback chain
│   │   └── twitterApi.js         Twitter/X API v2 tweet posting
│   ├── utils/
│   │   └── zoneMapper.js         GPS bounding box and text regex city detection
│   ├── cron/
│   │   └── expiryJob.js          node-cron: expire messages, clean JWT blocklist
│   └── scripts/
│       ├── provision_admin.js    Create admin user from CLI
│       └── create_vai.js         Seed utility
│
└── frontend/
    └── src/
        ├── main.jsx              React app bootstrap
        ├── App.jsx               Router, sidebar, auth guard, layout shell
        ├── ThemeContext.jsx      Dark/light theme with localStorage persistence
        ├── constants.js          ZONE_COORDS, EAPS - 18 evacuation assembly points
        ├── api/index.js          Axios instance and all API namespace exports
        ├── context/
        │   └── AuthContext.jsx   JWT state, /auth/me bootstrap on load
        ├── i18n/
        │   └── LanguageContext.jsx  5-language i18n - en, hi, mr, ta, te
        ├── components/
        │   ├── AlertBanner.jsx         Urgency banner with pulse animation
        │   ├── ChannelBadge.jsx        Dispatch channel icon badge
        │   ├── ChannelPreviews.jsx     Simulated per-channel message previews
        │   ├── ExpiryTimer.jsx         Countdown timer - green to yellow to red
        │   ├── LanguageCard.jsx        Translated message card per language
        │   ├── MapZonePicker.jsx       MapLibre GL map for zone selection and geocoding
        │   ├── SituationMapCard.jsx    Full live map - USGS, NASA, EAPs
        │   └── UserNotificationBar.jsx Alert bar and I'm Safe or SOS for users
        └── pages/
            ├── LoginPage.jsx           Login, OTP registration, demo mode
            ├── DashboardPage.jsx       Admin command centre and user awareness hub
            ├── ComposerPage.jsx        Compose, translate, schedule alerts
            ├── ApprovalPage.jsx        Review and approve drafted messages
            ├── AuditLogPage.jsx        Full dispatch history with CSV export
            ├── RecipientsPage.jsx      Manage SMS recipient list
            ├── TemplatesPage.jsx       Save and reuse message templates
            ├── SimulationPage.jsx      Full-screen disaster drill simulator
            ├── SOSResponsePage.jsx     SOS triage and rescue coordination
            ├── MapPage.jsx             Live seismic and disaster map for citizens
            ├── EvacuationPage.jsx      Nearest shelters and evacuation routes
            ├── FamilyPage.jsx          Register emergency contacts
            ├── NotificationsPage.jsx   Message history inbox
            ├── ProfilePage.jsx         Update profile, location, language
            ├── SettingsPage.jsx        Notification and zone preferences
            ├── SurvivalGuidePage.jsx   Offline survival tips by disaster type
            └── StatsPage.jsx           System analytics and statistics
```

---

## Database Schema

All tables live in Supabase (PostgreSQL).

```sql
-- User accounts (phone number stored in the email column)
users (
  id, name, email, password, role,
  zone, lat, lng, language, last_login, created_at
)

-- Emergency alerts
messages (
  id, title, master_content, urgency, target_zone,
  channels, languages, translations,
  status, sent_by, approved_by, sent_at,
  expires_at, expiry_action, expiry_message,
  lat, lng, radius, created_at
)

-- SMS dispatch list
recipients (
  id, name, phone, zone, language, lat, lng, active, created_at
)

-- Citizen safety check-ins and SOS requests
safety_reports (
  id, message_id, user_id, user_name, zone, status,
  lat, lng, assisted, emergency_contact_notified, created_at
)

-- Immutable event log
audit_log (
  id, message_id, action, performed_by, channel, notes, timestamp
)

-- Revoked JWT tokens
token_blocklist (id, jti, expires_at)
```

**Message status values:** `draft` > `pending` > `active` > `expired`

**Urgency levels:** `low` | `medium` | `high` | `critical`

**Safety status values:** `safe` | `assistance`

---

## User Roles and Journeys

### Admin Role

```text
Login
  |
  +-- /dashboard      Command centre: active alerts, SOS map, stats
  +-- /compose        Write alert, set zone, channels, expiry, auto-translate
  +-- /approval       Review pending alerts, view channel previews, dispatch
  +-- /recipients     Manage phone list, test SMS per recipient
  +-- /templates      Save and load common message templates
  +-- /sos-center     Triage SOS requests, click Assist to notify citizen
  +-- /audit          Full history, filter by action or channel, export CSV
  +-- /admin/simulation  Full-screen drill mode
```

### Citizen (User) Role

```text
Register with phone and OTP
  |
  +-- /dashboard      Latest active alert in native language, I'm Safe or SOS
  +-- /map            Live earthquake, disaster, and shelter map
  +-- /evacuation     Nearest assembly points and route planning
  +-- /survival       Offline survival guide by disaster type
  +-- /family         Add emergency contacts
  +-- /history        Full message inbox
  +-- /settings       Zone, language, notification preferences
  +-- /profile        Update name and location
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A [Supabase](https://supabase.com) project (free tier works)
- A [Twilio](https://twilio.com) account (trial account works for testing)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/uacs-project.git
cd uacs-project
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in all required values. See the [Environment Variables](#environment-variables) section below.

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Install frontend dependencies

```bash
cd frontend
npm install
```

### 5. Set up the database

Run the SQL migrations from the `database/` folder in your Supabase SQL editor.

### 6. Create your admin account

```bash
cd backend
node provision_admin.js
```

### 7. Start the backend server

```bash
cd backend
npm run dev
```

The backend runs on `http://localhost:5000`.

### 8. Start the frontend dev server

```bash
cd frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies all `/api/*` requests to the backend automatically.

---

## Environment Variables

Create a `.env` file in the project root. All variables are required unless marked optional.

```env

# JWT

JWT_SECRET=your_super_secret_key_at_least_32_chars_long

# Supabase

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Twilio

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Optional: use a Messaging Service instead of a single number

TWILIO_Messaging_Service_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Admin credentials

ADMIN_PHONE=9999999999
ADMIN_PASSWORD=your_admin_password

# Twitter/X (optional)

TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# CMS Webhook (optional)

CMS_WEBHOOK_URL=https://your-cms.com/webhook/alerts

# Server

PORT=5000
NODE_ENV=development

# Frontend (Vite)

VITE_API_URL=/api
```

> Never commit `.env` to version control. The `.gitignore` excludes it by default.

---

## API Reference

All protected routes require the header `Authorization: Bearer <token>`.

### Auth Endpoints

| Method | Endpoint | Auth | Description |
| ------- | ------- | :--: | ----------- |
| POST | /api/auth/login | No | Login with phone and password |
| POST | /api/auth/register | No | Register new user account |
| POST | /api/auth/demo | No | Login as demo user |
| POST | /api/auth/otp/send | No | Send OTP SMS for registration |
| POST | /api/auth/logout | Yes | Revoke current JWT via blocklist |
| GET | /api/auth/me | Yes | Get current user profile |
| PUT | /api/auth/profile | Yes | Update name, location, zone |
| PUT | /api/auth/password | Yes | Change password |
| GET | /api/auth/preferences | Yes | Get language and zone preferences |
| PUT | /api/auth/preferences | Yes | Update preferences and sync to recipients |
| POST | /api/auth/emergency-contact | Yes | Add emergency contact |

### Message Endpoints

| Method | Endpoint | Auth | Description |
| ------- | ------- | :--: | ----------- |
| GET | /api/messages | Yes | List messages, filter by status |
| POST | /api/messages | Yes | Create new message as draft |
| GET | /api/messages/stats | Yes | Dashboard statistics |
| POST | /api/messages/emergency | Yes | One-click emergency broadcast |
| GET | /api/messages/safety/stats | Yes | Safe and SOS count |
| GET | /api/messages/safety/recent | Yes | Last 10 safety reports |
| POST | /api/messages/safety/direct | Yes | Submit direct SOS request |
| GET | /api/messages/:id | Yes | Get single message |
| PUT | /api/messages/:id | Yes | Update message |
| DELETE | /api/messages/:id | Yes | Delete message |
| PUT | /api/messages/:id/approve | Yes | Move message to pending |
| PUT | /api/messages/:id/expire | Yes | Manually expire a message |
| PUT | /api/messages/:id/extend | Yes | Extend message expiry time |
| POST | /api/messages/:id/safety | Yes | Submit I'm Safe or SOS |
| PUT | /api/messages/safety/:id/assist | Yes | Mark citizen as assisted |
| GET | /api/messages/:id/performance | Yes | Response and assist metrics |

### Other Endpoints

| Method | Endpoint | Auth | Description |
| ------- | ------- | :--: | ----------- |
| POST | /api/dispatch/:id | Yes | Dispatch message across all selected channels |
| GET | /api/recipients | Yes | List recipients, filter by zone |
| POST | /api/recipients | Yes | Add recipient |
| PUT | /api/recipients/:id | Yes | Update recipient |
| DELETE | /api/recipients/:id | Yes | Remove recipient |
| POST | /api/recipients/:id/test | Yes | Send test SMS to recipient |
| POST | /api/translate | Yes | Translate text to multiple languages |
| GET | /api/audit | Yes | Audit log with filters |
| GET | /api/audit/export | Yes | Export audit log as CSV |
| DELETE | /api/audit/clear | Yes | Clear entries older than N days |
| GET | /api/users | Yes | List all users, passwords excluded |
| GET | /api/health | No | Health check |
| POST | /api/webhooks/twilio | No | Twilio delivery receipt handler |

---

## Dispatch Channels

| Channel | Integration | Status |
| ------- | ------- | ------- |
| SMS | Twilio API - batches of 10 with 500ms pause, language-aware per recipient | Live |
| Twitter/X | X API v2 - posts urgency-tagged tweet | Live |
| Radio | Logged to audit system, real integration configurable | Simulated |
| TV | Logged to audit system, real integration configurable | Simulated |
| Website/CMS | Webhook POST to CMS_WEBHOOK_URL environment variable | Configurable |

### Zone Targeting Logic for SMS

Recipients are filtered using a three-layer matching algorithm:

1. **Exact match** - zone strings are identical
2. **Substring match** - one zone string contains the other
3. **Token match** - significant words of 3 or more characters match between zones

The values `all`, `all zones`, `all india`, and `general` broadcast to all recipients regardless of zone.

---

## Security

| Layer | Mechanism |
| ------- | ------- |
| Transport | HTTPS enforced with HTTP Strict Transport Security via Helmet |
| Headers | Content Security Policy, X-Frame-Options, X-Content-Type-Options |
| Auth | JWT with unique JTI per token, revoked on logout via token_blocklist table |
| Passwords | bcrypt with salt factor 10 |
| Rate Limiting | Auth: 5 per 15min, OTP: 3 per 15min, API: 120 per min, Dispatch: 10 per 5min |
| Input Sanitization | Strips null bytes and zero-width characters, trims and truncates all strings |
| Prototype Pollution | sanitizeBody skips `__proto__`, `constructor`, and `prototype` keys |
| Validation | express-validator rules on all sensitive endpoints |
| CORS | Regex allowlist - localhost on any port and *.vercel.app only |
| Password Exposure | Passwords stripped from all API responses before sending |

---

## Deployment

### Frontend on Vercel

The `vercel.json` at the root configures rewrites so `/api/*` proxies to your backend:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend.com/api/$1" }
  ]
}
```

Set `VITE_API_URL` in Vercel's environment variables dashboard to your backend URL.

### Backend on Railway or Render

```bash
cd backend
npm start
```

Set all required environment variables in your hosting platform's dashboard.

---

## Evacuation Assembly Points

UACS includes 18 pre-configured evacuation assembly points across India.

| City | Site Name | Capacity | Type |
| ------- | ------- | ------- | ------- |
| Mumbai | Mumbai Central Hub | 5,000 | State Command Center |
| Delhi | Delhi Safe Zone 1 | 8,000 | National Shelter |
| Bangalore | Bangalore Safety Hub | 4,500 | Tech-Response Center |
| Kolkata | Kolkata Rescue Point | 3,500 | East Command |
| Chennai | Chennai Coastal Shelter | 6,000 | Cyclone Response |
| Hyderabad | Hyderabad Safety Plaza | 4,000 | Medical and Food |
| Ahmedabad | Ahmedabad Rescue Hub | 3,000 | Shelter |
| Jaipur | Jaipur Safe Point | 2,500 | Desert Response |
| Lucknow | Lucknow Relief Center | 3,200 | Flood Relief |
| Patna | Patna Safety Center | 2,800 | Shelter |
| Bhopal | Bhopal Central Point | 3,100 | Central Shelter |
| Thiruvananthapuram | Thiruvananthapuram Hub | 2,200 | Coastal Response |
| Chandigarh | Chandigarh Unity Shelter | 2,000 | Regional Hub |
| Guwahati | Guwahati Northeast Point | 1,800 | Hill Response |
| Bhubaneswar | Bhubaneswar Coastal Hub | 2,700 | Odisha Shelter |
| Srinagar | Srinagar Valley Point | 1,500 | Winter Response |
| Dehradun | Dehradun Hill Safety | 1,200 | Eco Shelter |
| Panaji | Panaji Beach Shelter | 1,000 | Medical |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

**UACS - When every second counts, every message matters.**
