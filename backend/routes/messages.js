// ═══════════════════════════════════════
// UACS Messages Routes
// Uses universal db adapter (SQLite or Supabase)
// ═══════════════════════════════════════

import { Router } from 'express';
import { dbSelect, dbGetById, dbGetOne, dbInsert, dbUpdate, dbDelete, dbCount } from '../database/db.js';
import { translateToMultiple } from '../integrations/translateApi.js';
import { sendBulkSMS } from '../integrations/smsGateway.js';
import { postTweet } from '../integrations/twitterApi.js';
import twilio from 'twilio';

const router = Router();
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

function parseMsg(msg) {
  if (!msg) return null;
  return {
    ...msg,
    channels:     msg.channels     ? JSON.parse(msg.channels)     : [],
    languages:    msg.languages     ? JSON.parse(msg.languages)    : [],
    translations: msg.translations  ? JSON.parse(msg.translations) : {},
  };
}

// ─── GET /api/messages/stats ───────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [active, expired, draft, pending, all] = await Promise.all([
      dbCount('messages', { status: 'active' }),
      dbCount('messages', { status: 'expired' }),
      dbCount('messages', { status: 'draft' }),
      dbCount('messages', { status: 'pending' }),
      dbSelect('messages', {}, { orderBy: 'created_at', ascending: false, limit: 1000 }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const totalToday = all.filter(m => (m.created_at || '').startsWith(today)).length;

    // Expiring within next hour
    const nowPlus1h = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const expiringSoon = all.filter(m =>
      m.status === 'active' && m.expires_at && m.expires_at <= nowPlus1h
    ).length;

    res.json({ totalToday, active, expiringSoon, expired, draft, pending, history: all });
  } catch (err) {
    console.error('[UACS MESSAGES] Stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/messages/emergency ──────────────────────
router.post('/emergency', async (req, res) => {
  try {
    const { master_content, target_zone } = req.body;
    if (!master_content) return res.status(400).json({ error: 'master_content is required' });

    const title = 'EMERGENCY BROADCAST';
    const channels = ['sms', 'twitter', 'radio', 'tv', 'website'];
    const languages = ['hi', 'mr', 'ta', 'te', 'en'];
    const expires_at = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const newMsg = await dbInsert('messages', {
      title,
      master_content,
      urgency: 'critical',
      target_zone: target_zone || null,
      channels: JSON.stringify(channels),
      languages: JSON.stringify(languages),
      translations: '{}',
      status: 'pending',
      sent_by: req.user?.name || 'Unknown',
      expires_at,
      expiry_action: 'replace',
      expiry_message: 'The emergency situation has been resolved. All clear.',
    });

    const translations = await translateToMultiple(master_content, ['hi', 'mr', 'ta', 'te']);
    translations['en'] = master_content;
    await dbUpdate('messages', newMsg.id, { translations: JSON.stringify(translations) });

    const msgObj = { ...newMsg, channels, languages, translations };

    // Dispatch to SMS
    try {
      const recipientList = await dbSelect('recipients', { active: true }, { orderBy: 'created_at', ascending: false, limit: 5000 });
      const zoneFiltered = target_zone && target_zone !== 'All Zones' && target_zone.trim()
        ? recipientList.filter(r => {
            if (!r.zone) return true;
            const targetZoneBase = target_zone.split('(')[0].trim().toLowerCase();
            const recipZoneBase = r.zone.split('(')[0].trim().toLowerCase();
            return recipZoneBase === targetZoneBase || targetZoneBase.includes(recipZoneBase) || recipZoneBase.includes(targetZoneBase);
          })
        : recipientList;
      if (zoneFiltered.length > 0) {
        await sendBulkSMS(zoneFiltered, msgObj);
      }
    } catch (smsErr) {
      console.error('[UACS MESSAGES] Emergency SMS dispatch error:', smsErr.message);
    }

    // Mark active for instant dashboard update
    await dbUpdate('messages', newMsg.id, {
      status: 'active',
      sent_at: new Date().toISOString(),
      approved_by: req.user?.name || 'System'
    });

    res.status(201).json(msgObj);
  } catch (err) {
    console.error('[UACS MESSAGES] Emergency error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/messages/safety/direct ──────────────────
router.post('/safety/direct', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Anonymous';
    const zone = req.user?.zone || 'Unknown';

    const report = await dbInsert('safety_reports', {
      message_id: null,
      user_id: userId,
      user_name: userName,
      zone: zone,
      status: 'assistance',
      lat: lat || null,
      lng: lng || null,
      emergency_contact_notified: false,
      assisted: false,
    });
    res.json(report);
  } catch (err) {
    console.error('[UACS SAFETY] Direct SOS error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/messages/safety/recent ───────────────────
router.get('/safety/recent', async (req, res) => {
  try {
    const reports = await dbSelect('safety_reports', {}, { orderBy: 'created_at', ascending: false, limit: 10 });
    res.json(reports);
  } catch (err) {
    console.error('[UACS SAFETY] Recent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/messages/safety/stats ────────────────────
router.get('/safety/stats', async (req, res) => {
  try {
    const reports = await dbSelect('safety_reports', {}, { limit: 5000 });
    const stats = {
      safe: reports.filter(r => r.status === 'safe').length,
      assistance: reports.filter(r => r.status === 'assistance').length,
    };
    res.json(stats);
  } catch (err) {
    console.error('[UACS SAFETY] Stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/messages/safety/:id/assist ───────────────
router.put('/safety/:id/assist', async (req, res) => {
  try {
    const report = await dbGetById('safety_reports', req.params.id);
    if (!report) return res.status(404).json({ error: 'Safety report not found' });
    await dbUpdate('safety_reports', req.params.id, { assisted: true });
    const user = await dbGetById('users', report.user_id);
    if (user && user.email) {
      try {
        const twilioPhone = '+91' + user.email.replace(/\D/g, '');
        await twilioClient.messages.create({
          body: `UACS: A rescue team has been dispatched to assist you. Help is coming.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: twilioPhone,
        });
      } catch (smsErr) { console.error('[UACS SOS] SMS error:', smsErr.message); }
    }
    res.json({ success: true, message: 'Citizen marked as assisted' });
  } catch (err) {
    console.error('[UACS SAFETY] Assist error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/messages ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filters = status ? { status } : {};
    const messages = await dbSelect('messages', filters, { orderBy: 'created_at', ascending: false, limit: Number(limit) });
    res.json(messages.map(parseMsg));
  } catch (err) {
    console.error('[UACS MESSAGES] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/messages ────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, master_content, urgency, target_zone, channels, languages, expires_at, lat, lng, radius, status } = req.body;
    const newMsg = await dbInsert('messages', {
      title, master_content, urgency,
      target_zone: target_zone || null,
      channels: JSON.stringify(channels || []),
      languages: JSON.stringify(languages || []),
      status: status || 'draft',
      sent_by: req.user?.name || 'Unknown',
      expires_at: expires_at || null,
      lat: lat || null,
      lng: lng || null,
      radius: radius || null
    });
    res.status(201).json(parseMsg(newMsg));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/messages/:id/safety ─────────────────────
router.post('/:id/safety', async (req, res) => {
  try {
    const { status, lat, lng } = req.body;
    const report = await dbInsert('safety_reports', {
      message_id: req.params.id,
      user_id: req.user?.id,
      user_name: req.user?.name || 'Anonymous',
      zone: req.user?.zone || 'Unknown',
      status, lat, lng, assisted: false
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/messages/:id/approve ─────────────────────
router.put('/:id/approve', async (req, res) => {
  try {
    const updated = await dbUpdate('messages', req.params.id, { status: 'pending', approved_by: req.user?.name });
    res.json(parseMsg(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/messages/:id/expire ──────────────────────
router.put('/:id/expire', async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = await dbUpdate('messages', req.params.id, { 
      status: 'expired', 
      expiry_reason: reason || 'Manual expiry' 
    });
    res.json(parseMsg(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/messages/:id/extend ──────────────────────
router.put('/:id/extend', async (req, res) => {
  try {
    const { expires_at } = req.body;
    const updated = await dbUpdate('messages', req.params.id, { expires_at });
    res.json(parseMsg(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/messages/:id/performance ──────────────────
router.get('/:id/performance', async (req, res) => {
  try {
    const msg = await dbGetById('messages', req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    const reports = await dbSelect('safety_reports', { message_id: req.params.id });
    const audit = await dbSelect('audit_log', { message_id: req.params.id });
    res.json({
      title: msg.title,
      dispatched_at: audit.find(a => a.action === 'dispatched')?.timestamp,
      total_responses: reports.length,
      safe_count: reports.filter(r => r.status === 'safe').length,
      sos_count: reports.filter(r => r.status === 'assistance').length,
      assisted_count: reports.filter(r => r.assisted).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/messages/:id ─────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const msg = await dbGetById('messages', req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(parseMsg(msg));
  } catch (err) {
    console.error('[UACS MESSAGES] GET/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/messages/:id ─────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const updated = await dbUpdate('messages', req.params.id, req.body);
    res.json(parseMsg(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/messages/:id ──────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await dbDelete('messages', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
