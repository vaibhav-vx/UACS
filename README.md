# 🚨 Unified Authority Communication System (UACS)

![UACS Header](https://img.shields.io/badge/UACS-Emergency_Command_Center-3b82f6?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live_Production-22c55e?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-JWT_RBAC-eb4034?style=for-the-badge)
![Architecture](https://img.shields.io/badge/Architecture-Dual_Portal_Loop-purple?style=for-the-badge)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

The **Unified Authority Communication System (UACS)** is a mission-critical, enterprise-grade emergency communication platform. It bridges the gap between administrative authorities and citizens during disasters. Developed as a **High-Stakes Command & Control Center**, UACS unifies multi-channel alert dispatching, real-time GIS situational awareness, and automated citizen safety coordination.

---

## 💡 The Innovation: "Closing the Rescue Loop"
Traditional emergency broadcasting systems are fundamentally one-way (Authority ➔ Citizen). **UACS introduces a closed, two-way loop:**
1. **Admin Dispatches**: One critical message is sent across 5 languages and 5 channels instantly.
2. **Citizen Responds**: Citizens receive the alert and can confirm safety or request help (with live GPS).
3. **Authority Acts**: The SOS Response Center triages distress signals, alerts rescue teams, and **notifies the citizen** that help is en route via Twilio SMS.
4. **Accountability**: Every expired alert requires a "Reason for Closure," which is shown back to the citizen—creating total transparency.

---

## 🏗️ Dual-Portal Architecture

### 🔒 Unified Authentication Gateway
- **Official Government Identity:** Features clear `🇮🇳 Government of India • Secure Communication Portal • v1.0` branding to maintain trust.
- **Dual-Tab Auth:** Glassmorphic centered interface featuring simple mobile-number based logins and registrations.
- **Accessibility First:** Integrated light/dark theme toggle and global language switcher accessible right from the login screen.

### 🏛️ Admin Command Suite (Portal 1)
- **Live Dashboard:** Clean sidebar navigation with quick access to *Live Simulation, Templates, Compose, Approval, and Recipients*. Features a "Safety Response Analytics" board tracking live "Marked Safe" vs "Need Assistance" metrics.
- **Interactive Situation Map:** A full-scale Leaflet map visualizing alerts across the country. Includes a detailed legend distinguishing between *Critical Alerts, High Alerts, Safety Points, and NASA Global Events* alongside heatmaps.
- **SOS Response Center:** A real-time emergency coordination queue tracking Priority 1 distress signals. Features actionable cards with "Mark Assisted" buttons and tracks whether Emergency Contacts have been successfully notified via Twilio.
- **Precision Composer:** Multi-language (i18next) broadcasting to SMS, Social Media, Radio, and TV from a single interface.
- **Audit Logging:** Immutable timeline of the message lifecycle.

### 👥 Citizen Safety Portal (Portal 2)
- **Emergency Command Center:** Clean UI with an integrated Theme Toggle (Light/Dark mode) featuring soft blue radial glows and glassmorphic card effects.
- **SOS Panic Button 2.0:** "Hold-to-confirm" logic to prevent false positives, tightly integrated with geolocation.
- **National Survival Guide:** Interactive, offline-ready disaster protocols (Earthquakes, Floods, Fire).
- **Evacuation Maps:** Real-time routing to nearest Emergency Assembly Points (EAPs).

---

## 🛠️ Technical Stack

### Frontend Architecture
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS v4 + Glassmorphism aesthetic
- **Routing:** React Router DOM (v7)
- **Maps:** Leaflet & React-Leaflet
- **i18n:** React-i18next (English, Hindi, Marathi, Tamil, Telugu)
- **Icons:** Lucide-React

### Backend Architecture
- **Runtime:** Node.js (v18+) + Express.js
- **Authentication:** JWT (JSON Web Tokens) with Bcrypt password hashing
- **Database:** Supabase (PostgreSQL) with `supabase-js`
- **Cron Jobs:** Node-Cron for message expiry actions
- **Integrations:** Twilio SMS APIs & Webhooks

---

## 🗄️ Database Schema (Supabase)

UACS utilizes a robust, relational PostgreSQL schema managed via Supabase:
1. **`users`**: RBAC accounts (Admin/Field Ops/User) with GPS zones and departments.
2. **`messages`**: Core alert payloads containing multi-lingual content, target radius, and expiry lifecycles.
3. **`recipients`**: Target population data.
4. **`safety_reports`**: Live distress signals (Safe vs. Assistance Needed) mapped to specific active messages.
5. **`audit_log`**: Immutable trail of every system action.

---

## 📂 Project Structure

```text
uacs-project/
├── backend/
│   ├── cron/              # Automated tasks (e.g., expiryJob.js)
│   ├── database/          # Supabase SQL schemas and db clients
│   ├── middleware/        # JWT Authentication checks
│   ├── routes/            # API Endpoints (auth, messages, dispatch, audit)
│   ├── scripts/           # DB Provisioning (provision_admin.js)
│   └── server.js          # Express Entry Point
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI (AlertBanners, Maps, ChannelCards)
│   │   ├── context/       # Theme and Global State Contexts
│   │   ├── i18n/          # Translation dictionaries
│   │   ├── pages/         # Dashboard, SOS Response, Composer, Auth Pages
│   │   └── utils/         # Helpers & constants
│   ├── index.html         # Vite HTML entry
│   └── vite.config.js     # Bundler configuration
│
└── vercel.json            # Vercel deployment & rewriting configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18 or later
- **Supabase**: Active project & database
- **Twilio**: Account SID, Auth Token, and a Phone Number

### 2. Environment Configuration
Create a `.env` file in the root of your project:
```env
# Backend / DB Settings
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_or_service_key
JWT_SECRET=your_super_secret_jwt_string

# Twilio SMS Gateway
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### 3. Installation & Running Locally

The project is structured in a monorepo-style setup.

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

### 4. Database Setup
Navigate to the `backend/database/supabase_schema.sql` file. Execute this script inside your Supabase SQL Editor to instantly provision all tables, policies, constraints, and default admin users.

---

## 🌐 Deployment

The repository is configured for immediate deployment on **Vercel** via the included `vercel.json`. It maps frontend routes correctly and proxies `/api/*` endpoints to the `backend/server.js` serverless function.

---

## 📜 Vision for the Future
UACS is built on the fundamental philosophy that **information is a survival tool**. By unifying siloed communication channels and guaranteeing a closed-loop feedback system, we turn chaos into coordinated, trackable, and accountable action.
