// ═══════════════════════════════════════
// UACS — Unified Authority Communication System
// Express Server Entry Point — Supabase Edition
// ═══════════════════════════════════════

import express from 'express';
import cors from 'cors';
// Load environment variables first
import './config.js';

// Routes
import authRouter       from './routes/auth.js';
import messagesRouter   from './routes/messages.js';
import translateRouter  from './routes/translate.js';
import dispatchRouter   from './routes/dispatch.js';
import auditRouter      from './routes/audit.js';
import recipientsRouter from './routes/recipients.js';
import webhooksRouter   from './routes/webhooks.js';
import cgaRouter        from './routes/cga.js';

// Middleware
import { authenticate } from './middleware/auth.js';
import {
  helmetConfig, apiLimiter, authLimiter, otpLimiter,
  dispatchLimiter, cgaLimiter, sanitizeBody,
} from './middleware/security.js';

// Database
import { getSupabase, dbSelect } from './database/db.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── CORS ────────────────────────────────────────────────
const allowedOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^https?:\/\/.*\.vercel\.app$/,
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser (Postman etc.)
    const ok = allowedOrigins.some(p => (typeof p === 'string' ? p === origin : p.test(origin)));
    cb(ok ? null : new Error('CORS policy: origin not allowed'), ok);
  },
  credentials: true,
}));
app.use(helmetConfig);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(sanitizeBody());           // strip null-bytes & trim all string fields
app.use(apiLimiter);               // 120 req/min global ceiling

// ─── Public routes ───────────────────────────────────────
// Auth: strict rate-limit (5 attempts / 15 min), OTP has its own tighter limit
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/demo',     authLimiter);
app.use('/api/auth/otp',      otpLimiter);
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UACS Backend', db: 'supabase', timestamp: new Date().toISOString() });
});

// Twilio Webhook (Must be public)
app.use('/api/webhooks', webhooksRouter);

// ─── Protected routes ────────────────────────────────────
app.use('/api/messages',   authenticate, messagesRouter);
app.use('/api/translate',  authenticate, translateRouter);
app.use('/api/dispatch',   authenticate, dispatchLimiter, dispatchRouter);
app.use('/api/audit',      authenticate, auditRouter);
app.use('/api/recipients', authenticate, recipientsRouter);
app.use('/api/cga/verify', cgaLimiter);    // extra CGA verify limiter before auth
app.use('/api/cga',        authenticate, cgaRouter);

// ─── Users list ──────────────────────────────────────────
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const users = await dbSelect('users', {}, { orderBy: 'created_at', ascending: true });
    res.json(users.map(({ password: _, ...u }) => u)); // never expose password
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Boot ────────────────────────────────────────────────
async function boot() {
  // CRITICAL: JWT_SECRET must be set — refuse to start with the insecure default
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('[UACS] ❌ FATAL: JWT_SECRET is missing or too short (must be ≥ 32 chars). Set it in .env');
    process.exit(1);
  }
  try {
    getSupabase(); // will throw if creds are missing
    console.log('[UACS] ✅ Supabase connection verified');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  // Start expiry cron
  try {
    const { startExpiryJob } = await import('./cron/expiryJob.js');
    startExpiryJob();
  } catch (err) {
    console.warn('[UACS] Expiry job not started:', err.message);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  UACS Backend — Supabase Edition');
    console.log(`  Running on http://localhost:${PORT}`);
    console.log('  Press Ctrl+C to stop');
    console.log('═══════════════════════════════════════');
    console.log('');
  });
}

boot();
export default app;
