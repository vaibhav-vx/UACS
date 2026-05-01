// ═══════════════════════════════════════
// UACS Dispatch Routes
// Uses universal db adapter (SQLite or Supabase)
// ═══════════════════════════════════════

import { Router } from 'express';
import { dbGetById, dbSelect, dbInsert, dbUpdate } from '../database/db.js';
import { sendBulkSMS } from '../integrations/smsGateway.js';
import { postTweet } from '../integrations/twitterApi.js';

const router = Router();

// ── Simulated channel dispatchers ────────────────────────
async function dispatchToRadio(msg) {
  console.log(`[UACS DISPATCH] Radio: Broadcasting "${msg.title}"`);
  return { success: true, channel: 'radio', message: 'Broadcast queued' };
}
async function dispatchToTV(msg) {
  console.log(`[UACS DISPATCH] TV: Crawl submitted for "${msg.title}"`);
  return { success: true, channel: 'tv', message: 'TV crawl submitted' };
}
async function dispatchToWebsite(msg) {
  const webhookUrl = process.env.CMS_WEBHOOK_URL;
  if (webhookUrl && webhookUrl !== 'your_webhook_here') {
    try {
      const axios = (await import('axios')).default;
      await axios.post(webhookUrl, {
        title: msg.title,
        content: msg.master_content,
        urgency: msg.urgency,
        translations: msg.translations,
        expires_at: msg.expires_at,
      });
      return { success: true, channel: 'website', message: 'Published to CMS' };
    } catch (err) {
      return { success: false, channel: 'website', message: err.message };
    }
  }
  console.log(`[UACS DISPATCH] Website: Published "${msg.title}" to CMS (mock)`);
  return { success: true, channel: 'website', message: 'Published to CMS (mock)' };
}

// ── Retry helper ─────────────────────────────────────────
async function withRetry(fn, retries = 1, delay = 5000) {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay);
    }
    throw err;
  }
}

// ─── POST /api/dispatch/:id ─────────────────────────────
router.post('/:id', async (req, res) => {
  try {
    const raw = await dbGetById('messages', req.params.id);
    if (!raw) return res.status(404).json({ error: 'Message not found' });

    const msg = {
      ...raw,
      channels:     raw.channels     ? JSON.parse(raw.channels)     : [],
      languages:    raw.languages     ? JSON.parse(raw.languages)    : [],
      translations: raw.translations  ? JSON.parse(raw.translations) : {},
    };

    if (msg.channels.length === 0)
      return res.status(400).json({ error: 'No channels selected for dispatch' });

    console.log(`[UACS DISPATCH] Message ${msg.id} → ${msg.channels.join(', ')}`);

    const results = await Promise.all(msg.channels.map(async (channel) => {
      try {
        let result;
        switch (channel.toLowerCase()) {
          case 'sms': {
            // Fetch all active recipients (Supabase uses true not 1)
            const recipientList = await dbSelect('recipients', { active: true }, { orderBy: 'created_at', ascending: false, limit: 5000 });

            // Zone filter
            const zoneFiltered = msg.target_zone && msg.target_zone !== 'All Zones' && msg.target_zone.trim()
              ? recipientList.filter(r => {
                  if (!r.zone) return true;
                  const targetZoneBase = msg.target_zone.split('(')[0].trim().toLowerCase();
                  const recipZoneBase = r.zone.split('(')[0].trim().toLowerCase();
                  return recipZoneBase === targetZoneBase || targetZoneBase.includes(recipZoneBase) || recipZoneBase.includes(targetZoneBase);
                })
              : recipientList;


            if (zoneFiltered.length === 0) {
              result = { success: true, channel: 'sms', message: '0 recipients — no SMS sent', sent: 0, failed: 0 };
            } else {
              console.log(`[UACS DISPATCH] SMS → ${zoneFiltered.length} recipient(s)`);
              // Pass the parsed message object (translations already parsed as object above)
              const report = await withRetry(() => sendBulkSMS(zoneFiltered, msg));
              result = {
                success: report.failed === 0,
                channel: 'sms',
                message: `${report.sent} sent, ${report.failed} failed`,
              };
            }
            break;
          }

          case 'twitter': result = await withRetry(() => postTweet(msg)); break;
          case 'radio':   result = await withRetry(() => dispatchToRadio(msg)); break;
          case 'tv':      result = await withRetry(() => dispatchToTV(msg)); break;
          case 'website': result = await withRetry(() => dispatchToWebsite(msg)); break;
          default:        result = { success: false, channel, message: `Unknown channel: ${channel}` };
        }

        await dbInsert('audit_log', {
          message_id:   msg.id,
          action:       'dispatched',
          performed_by: req.user?.name || 'System',
          channel:      channel.toUpperCase(),
          notes:        result.success ? `Sent: ${result.message}` : `Error: ${result.message}`,
        });

        return { channel, status: result.success ? 'sent' : 'failed', detail: result.message };
      } catch (err) {
        console.error(`[UACS DISPATCH] ${channel} FAILED:`, err.message);
        await dbInsert('audit_log', {
          message_id:   msg.id,
          action:       'dispatched',
          performed_by: req.user?.name || 'System',
          channel:      channel.toUpperCase(),
          notes:        `Error: ${err.message}`,
        }).catch(() => {});
        return { channel, status: 'failed', detail: err.message };
      }
    }));

    // Mark message active
    await dbUpdate('messages', msg.id, {
      status: 'active',
      sent_at: new Date().toISOString(),
    });

    const report = {};
    results.forEach(r => { report[r.channel] = r.status; });

    console.log('[UACS DISPATCH] Done:', JSON.stringify(report));
    res.json({ success: true, messageId: msg.id, report, details: results });
  } catch (err) {
    console.error('[UACS DISPATCH] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
