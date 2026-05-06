// ═══════════════════════════════════════
// UACS — Unified Authority Communication System
// Express Server Entry Point — Supabase Edition
// ═══════════════════════════════════════

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Public routes ───────────────────────────────────────
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'UACS Backend', db: 'supabase', timestamp: new Date().toISOString() });
});

// Twilio Webhook (Must be public)
app.use('/api/webhooks', webhooksRouter);

// ─── Protected routes ────────────────────────────────────
app.use('/api/messages',   authenticate, messagesRouter);
app.use('/api/translate',  authenticate, translateRouter);
app.use('/api/dispatch',   authenticate, dispatchRouter);
app.use('/api/audit',      authenticate, auditRouter);
app.use('/api/recipients', authenticate, recipientsRouter);
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
  // Verify Supabase connection on startup
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
