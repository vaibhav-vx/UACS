# 🚨 Unified Authority Communication System (UACS)

<div align="center">
  <img src="https://img.shields.io/badge/UACS-Emergency_Command_Center-3b82f6?style=for-the-badge" alt="UACS Header" />
  <img src="https://img.shields.io/badge/Status-Live_Production-22c55e?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Security-JWT_RBAC-eb4034?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/Architecture-Dual_Portal_Loop-purple?style=for-the-badge" alt="Architecture" />
</div>
<br/>
<div align="center">
  <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" alt="React" />
  <img src="https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="NodeJS" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
</div>

<br />

> **The Unified Authority Communication System (UACS)** is a mission-critical, enterprise-grade emergency communication platform. It bridges the gap between administrative authorities and citizens during disasters. Developed as a High-Stakes Command & Control Center, UACS unifies multi-channel alert dispatching, real-time GIS situational awareness, and automated citizen safety coordination.

---

## 💡 The Innovation: "Closing the Rescue Loop"

Traditional emergency broadcasting systems are fundamentally one-way (Authority ➔ Citizen). **UACS introduces a closed, two-way loop:**

1. **Admin Dispatches**: One critical message is sent across multiple languages and channels (SMS, Social Media, etc.) instantly.
2. **Citizen Responds**: Citizens receive the alert and can confirm safety or request help (with live GPS coordinates).
3. **Authority Acts**: The SOS Response Center triages distress signals, alerts rescue teams, and **notifies the citizen** that help is en route via SMS.
4. **Accountability**: Every expired alert requires a "Reason for Closure," creating total transparency.

---

## 🏗️ Core Architecture & Features

The project is built on a **Dual-Portal Architecture** serving both the general public and administrative authorities.

### 🔒 Unified Authentication Gateway
- **Official Government Identity:** Features clear branding to maintain trust.
- **Role-Based Access Control (RBAC):** Distinct roles for Citizens, Admins, and Field Ops.
- **Accessibility:** Global language switcher and light/dark theme toggle accessible from login.

### 🏛️ Admin Command Suite (Portal 1)
Designed for crisis managers and operators to maintain control during emergencies.
- **Dashboard (`DashboardPage`):** Live metrics, active alerts, and "Safety Response Analytics" tracking live "Marked Safe" vs "Need Assistance".
- **Composer & Dispatch (`ComposerPage`):** Multi-channel, multi-language broadcasting interface.
- **Approvals (`ApprovalPage`):** Hierarchical approval workflow before alerts go live.
- **Auditing (`AuditLogPage`):** Immutable timeline of the message lifecycle and system events.
- **Templates & Recipients (`TemplatesPage`, `RecipientsPage`):** Target audience management and quick-launch templates.
- **SOS Response (`SOSResponsePage`):** A real-time emergency coordination queue tracking Priority 1 distress signals.
- **Live Simulation (`SimulationPage`):** Tools for running drills and testing workflows.

### 👥 Citizen Safety Portal (Portal 2)
Focused on rapid action, safety protocols, and real-time situational awareness.
- **Live Situation Map (`MapPage`):** A full-scale Leaflet map visualizing alerts across the country, showing safety points and active zones.
- **SOS Panic Button:** "Hold-to-confirm" logic to prevent false positives, tightly integrated with geolocation.
- **Evacuation Routing (`EvacuationPage`):** Real-time routing to nearest Emergency Assembly Points (EAPs).
- **Survival Guide (`SurvivalGuidePage`):** Interactive, offline-ready disaster protocols.
- **Family Coordination (`FamilyPage`):** Keep track of emergency contacts and loved ones.
- **Notifications (`NotificationsPage`):** Centralized feed of all relevant active alerts.

---

## 🛠️ Technical Stack

### Frontend (React + Vite)
- **Framework:** React 19 + Vite
- **Routing:** React Router DOM v7
- **Styling:** Tailwind CSS v4 + custom Glassmorphism aesthetic
- **Maps:** Leaflet & React-Leaflet
- **i18n:** React-i18next (English, Hindi, Marathi, Tamil, Telugu)
- **Icons:** Lucide-React

### Backend (Node.js + Express)
- **Runtime:** Node.js (v18+)
- **API Architecture:** RESTful Endpoints (`routes/` module)
- **Authentication:** JWT with Bcrypt hashing
- **Database Integration:** Supabase (PostgreSQL) via `supabase-js`
- **Cron Jobs:** Node-Cron for scheduled events (e.g., message expiry)
- **3rd-Party Integrations:** Twilio (SMS & Webhooks), Translation Services

---

## 🗄️ Database Schema & API Services

### PostgreSQL (Supabase)
1. **`users`**: RBAC accounts with GPS zones and departments.
2. **`messages`**: Core alert payloads, translation details, targeting radius, and lifecycle states.
3. **`recipients`**: Target population demographic data.
4. **`safety_reports`**: Live distress signals mapped to active messages.
5. **`audit_log`**: Immutable trail of every system action.

### Core Backend Routes
- `/api/auth/*` - Login, registration, token refresh.
- `/api/messages/*` - Alert CRUD, fetching active/expired alerts.
- `/api/dispatch/*` - Multi-channel sending logic.
- `/api/recipients/*` - Target audience query and management.
- `/api/audit/*` - Fetching system logs.
- `/api/webhooks/*` - Handling inbound events from Twilio and other providers.
- `/api/translate/*` - Internal routing to translation AI/services.

---

## 📂 Comprehensive Project Structure

```text
uacs-project/
├── backend/
│   ├── cron/              # Automated tasks (expiryJob.js)
│   ├── database/          # Supabase SQL schemas and clients
│   ├── middleware/        # JWT Authentication checks
│   ├── routes/            # Core API Endpoints (auth, dispatch, audit, etc.)
│   ├── scripts/           # DB Provisioning (provision_admin.js)
│   ├── utils/             # Helper functions
│   └── server.js          # Express Entry Point
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI (AlertBanner, SituationMapCard, etc.)
│   │   ├── context/       # Theme and Global State Contexts
│   │   ├── i18n/          # Translation dictionaries
│   │   ├── pages/         # 17+ Modular UI Pages (Dashboard, SOS, Evacuation, etc.)
│   │   └── utils/         # Helpers & constants
│   ├── index.html         # Vite HTML entry
│   └── vite.config.js     # Bundler configuration
│
├── .env.example           # Reference for environment variables
└── vercel.json            # Vercel deployment configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18 or later
- **Supabase**: Active project & database
- **Twilio**: Account SID, Auth Token, and a Phone Number

### 2. Environment Configuration
Create a `.env` file in the root of your project using `.env.example` as a template:
```env
# Backend / DB Settings
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_service_key
JWT_SECRET=your_super_secret_jwt_string

# Twilio SMS Gateway
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Frontend (If any public variables are needed)
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Database Setup
Navigate to the `backend/database/supabase_schema.sql` file (or similar SQL schema file). Execute this script inside your Supabase SQL Editor to instantly provision all tables, policies, constraints, and default admin users.

You can also run the provisioning script:
```bash
node backend/scripts/provision_admin.js
```

### 4. Running Locally (Monorepo)

**Start the Backend:**
```bash
cd backend
npm install
npm run dev
```
*(Runs on `http://localhost:5000`)*

**Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*(Runs on Vite's default dev port, proxying to backend)*

---

## 🌐 Deployment

The repository is configured for immediate deployment on **Vercel** via the included `vercel.json`. It maps frontend routes correctly and proxies `/api/*` endpoints to the `backend/server.js` serverless function.

---

## 🤝 Contributing
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 📜 Vision for the Future
UACS is built on the fundamental philosophy that **information is a survival tool**. By unifying siloed communication channels and guaranteeing a closed-loop feedback system, we turn chaos into coordinated, trackable, and accountable action.
