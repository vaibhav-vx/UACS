// ═══════════════════════════════════════
// UACS Expiry Cron Job — Supabase version
// Runs every 60 seconds to expire active messages
// ═══════════════════════════════════════

import cron from 'node-cron';
import { dbSelect, dbUpdate, dbInsert } from '../database/db.js';

async function processExpiredMessages() {
  try {
    const now = new Date().toISOString();

    // Find all active messages where expires_at has passed
    const sb = (await import('../database/db.js')).getSupabase();
    const { data: expiredMessages, error } = await sb
      .from('messages')
      .select('*')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lte('expires_at', now);

    if (error) throw new Error(error.message);
    if (!expiredMessages || expiredMessages.length === 0) return;

    console.log(`[UACS EXPIRY] Found ${expiredMessages.length} expired message(s)`);

    for (const msg of expiredMessages) {
      console.log(`[UACS EXPIRY] Message ID ${msg.id} — action: ${msg.expiry_action?.toUpperCase() || 'FLAG'}`);

      // Mark as expired
      await dbUpdate('messages', msg.id, { status: 'expired' });

      const channels = msg.channels ? JSON.parse(msg.channels) : [];
      let notes = 'Message expired (action: flag). Marked visually as expired.';
      if (msg.expiry_action === 'delete') {
        notes = `Message expired (action: delete). Title: "${msg.title}"`;
      } else if (msg.expiry_action === 'replace') {
        notes = `Message expired (action: replace). Replacement: "${msg.expiry_message || 'N/A'}". Channels: ${channels.join(', ')}`;
      }

      await dbInsert('audit_log', {
        message_id:   msg.id,
        action:       'expired',
        performed_by: 'System',
        channel:      msg.expiry_action === 'replace' ? channels.join(',') : null,
        notes:        notes,
      });
    }

    // --- Clean up expired tokens from blocklist ---
    const { error: blocklistError } = await sb
      .from('token_blocklist')
      .delete()
      .lte('expires_at', now);
      
    if (blocklistError) {
      console.error('[UACS EXPIRY] Error cleaning blocklist:', blocklistError.message);
    }
  } catch (err) {
    console.error('[UACS EXPIRY] Error:', err.message);
  }
}

export function startExpiryJob() {
  cron.schedule('* * * * *', processExpiredMessages);
  console.log('[UACS EXPIRY] ✅ Cron job started — checking every 60 seconds');
  
  // Delay run once on startup to prevent immediate network connection timeout issues
  setTimeout(processExpiredMessages, 3000);
}

export default { startExpiryJob };
