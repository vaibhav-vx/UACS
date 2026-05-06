// ═══════════════════════════════════════════════════════════════
// UACS — CivicGuard AI (CGA) Routes
// POST /api/cga/verify   — run full verification pipeline
// GET  /api/cga/claims   — admin: list all claims
// GET  /api/cga/claims/queue — admin: human-review queue
// GET  /api/cga/claims/leaderboard — admin: top 10 viral claims
// PUT  /api/cga/claims/:id/review — admin: approve/update verdict
// POST /api/cga/dispatch — push Truth Card via UACS channels
// ═══════════════════════════════════════════════════════════════

import express             from 'express';
import Anthropic           from '@anthropic-ai/sdk';
import { createWorker }    from 'tesseract.js';
import ExifParser          from 'exif-parser';
import multer              from 'multer';
import crypto              from 'crypto';
import path                from 'path';
import fs                  from 'fs';
import { getSupabase }     from '../database/db.js';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Multer — in-memory storage (no disk writes, process on the fly)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  },
});

// ─── Helpers ─────────────────────────────────────────────────────

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function runOcr(imageBuffer) {
  const worker = await createWorker(['eng', 'hin', 'tam', 'tel', 'mar']);
  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

function extractExif(imageBuffer) {
  try {
    const parser = ExifParser.create(imageBuffer);
    const result = parser.parse();
    const tags   = result.tags || {};
    return {
      date: tags.DateTimeOriginal ? new Date(tags.DateTimeOriginal * 1000).toISOString() : null,
      gps:  tags.GPSLatitude && tags.GPSLongitude
              ? `${tags.GPSLatitude.toFixed(5)}, ${tags.GPSLongitude.toFixed(5)}`
              : null,
      software: tags.Software || null,
    };
  } catch {
    return { date: null, gps: null, software: null };
  }
}

async function getActiveAlertInZone(zone) {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('messages')
      .select('id, title, master_content, target_zone, created_at, expires_at, channels')
      .eq('status', 'active')
      .or(`target_zone.ilike.%${zone}%,target_zone.ilike.%All%`)
      .order('created_at', { ascending: false })
      .limit(5);
    return data || [];
  } catch {
    return [];
  }
}

async function writeAuditLog(userId, action, claimId, details) {
  try {
    const supabase = getSupabase();
    await supabase.from('audit_log').insert({
      user_id:     userId,
      action,
      entity_type: 'cga_claim',
      entity_id:   claimId?.toString(),
      details:     JSON.stringify(details),
      created_at:  new Date().toISOString(),
    });
  } catch (e) {
    console.error('[CGA] Audit log write failed:', e.message);
  }
}

async function callClaude(claimText, activeAlerts, imageBase64 = null, language = 'en') {
  const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu' };
  const langName = LANGUAGE_NAMES[language] || 'English';

  const alertContext = activeAlerts.length > 0
    ? `UACS ACTIVE ALERTS IN THIS ZONE:\n${activeAlerts.map(a =>
        `- Alert ID #MSG-${a.id}: "${a.title}" — ${a.master_content} (Target: ${a.target_zone}, Dispatched: ${new Date(a.created_at).toLocaleString('en-IN')})`
      ).join('\n')}`
    : 'NO ACTIVE UACS ALERTS FOUND IN THIS ZONE.';

  const systemPrompt = `You are CivicGuard AI (CGA), the misinformation intelligence module for UACS (Unified Authority Communication System) — India's national emergency communication platform.

Your task is to verify a civic claim submitted by a citizen or pasted content they received (WhatsApp forward, news, social media).

UACS CROSS-CHECK DATA:
${alertContext}

VERIFICATION PIPELINE:
1. UACS Cross-Check: Does the claim match, contradict, or have no relation to any active UACS alert above?
2. Temporal Analysis: Is this content time-sensitive? Are dates plausible?
3. Content Forensics: Identify red flags — emotional manipulation, urgency pressure, vague authority claims, requests for personal data.
4. Civic Knowledge: Cross-reference with known Indian government schemes, NDMA/IMD protocols, disaster response facts.
5. Fraud Detection: Flag Aadhaar phishing, fake subsidies, fake relief camp info, fake government numbers.

VERDICT OPTIONS (pick exactly one):
- FALSE — factually incorrect
- MISLEADING — partially true but context stripped
- OUTDATED — old policy or event reused
- RECYCLED_IMAGE — photo from different year/event (if image provided)
- FRAUD_ALERT — Aadhaar phishing, fake subsidy, data scam
- CONFIRMED — matches an active official UACS alert

VIRALITY INDEX (VI Score): Rate 0.0–10.0 (how dangerously viral this could be)
- 0–3: Low. Unlikely to spread widely.
- 4–6: Medium. Moderate spread risk.
- 7–8: High. Prioritize countermessaging.
- 9–10: Critical. Matches FRAUD, election claims, or mass panic triggers. Flag for human review.

RESPOND IN VALID JSON ONLY. No markdown, no extra text. Format:
{
  "verdict": "...",
  "vi_score": 0.0,
  "confidence": "high|medium|low",
  "summary": "...(2-3 sentences explaining the verdict in English)...",
  "source_url": "...(official URL or null)...",
  "uacs_alert_match": null | "CONFIRMED" | "CONTRADICTS",
  "uacs_alert_id": null | <number>,
  "flag_human_review": false | true,
  "truth_card": {
    "en": "...(clear, plain-language truth card text in English)...",
    "hi": "...(same truth card in Hindi)...",
    "mr": "...(same truth card in Marathi)...",
    "ta": "...(same truth card in Tamil)...",
    "te": "...(same truth card in Telugu)..."
  }
}`;

  const userContent = imageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text',  text: `Analyze this image and the following claim text (if any):\n\n${claimText || '[No additional text provided — analyze image only]'}\n\nCitizen's preferred language: ${langName}` },
      ]
    : `Analyze this civic claim:\n\n"${claimText}"\n\nCitizen's preferred language: ${langName}`;

  const response = await anthropic.messages.create({
    model:      'claude-opus-4-5',
    max_tokens:  1500,
    system:      systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    // Fallback if Claude wraps in markdown
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Claude returned non-JSON response');
  }
}

// ─── POST /api/cga/verify ─────────────────────────────────────────
// Accepts: text, optional file upload
router.post('/verify', upload.single('image'), async (req, res) => {
  const user = req.user;
  const { claim_text, input_url } = req.body;
  const imageFile = req.file;

  if (!claim_text && !input_url && !imageFile) {
    return res.status(400).json({ error: 'Provide claim_text, input_url, or an image file.' });
  }

  let ocrText    = null;
  let exifData   = { date: null, gps: null, software: null };
  let imageHash  = null;
  let imageB64   = null;
  let inputType  = 'text';

  try {
    // ── STEP 1: Input Ingestion ──────────────────────────────────
    if (imageFile) {
      inputType = 'image';
      imageHash = sha256(imageFile.buffer);
      imageB64  = imageFile.buffer.toString('base64');

      // Parallel OCR + EXIF
      const [ocr, exif] = await Promise.all([
        runOcr(imageFile.buffer),
        Promise.resolve(extractExif(imageFile.buffer)),
      ]);
      ocrText  = ocr;
      exifData = exif;
    } else if (input_url) {
      inputType = 'url';
    }

    const finalText = claim_text || ocrText || input_url || '';
    const userZone  = user?.zone || user?.location || 'General';
    const userLang  = user?.language || 'en';

    // ── STEP 3: UACS Alert Cross-Check ──────────────────────────
    const activeAlerts = await getActiveAlertInZone(userZone);

    // ── STEPS 2, 4, 5, 6: Claude runs the full pipeline ─────────
    const claudeResult = await callClaude(finalText, activeAlerts, imageB64, userLang);

    // ── Save to cga_claims table ─────────────────────────────────
    const supabase = getSupabase();
    const { data: claim, error: insertErr } = await supabase
      .from('cga_claims')
      .insert({
        user_id:       user.id,
        zone:          userZone,
        input_type:    inputType,
        raw_input:     finalText.substring(0, 5000),
        image_hash:    imageHash,
        ocr_text:      ocrText?.substring(0, 5000),
        exif_date:     exifData.date,
        exif_gps:      exifData.gps,
        verdict:       claudeResult.verdict,
        vi_score:      claudeResult.vi_score,
        source_url:    claudeResult.source_url,
        truth_card:    claudeResult.truth_card,
        language:      userLang,
        uacs_alert_id: claudeResult.uacs_alert_id || null,
        created_at:    new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // ── Audit log ────────────────────────────────────────────────
    await writeAuditLog(user.id, 'CGA_VERIFY', claim.id, {
      verdict:  claudeResult.verdict,
      vi_score: claudeResult.vi_score,
      zone:     userZone,
      type:     inputType,
    });

    res.json({
      claim_id:         claim.id,
      verdict:          claudeResult.verdict,
      vi_score:         claudeResult.vi_score,
      confidence:       claudeResult.confidence,
      summary:          claudeResult.summary,
      source_url:       claudeResult.source_url,
      uacs_alert_match: claudeResult.uacs_alert_match,
      uacs_alert_id:    claudeResult.uacs_alert_id,
      flag_human_review: claudeResult.flag_human_review,
      truth_card:       claudeResult.truth_card,
      exif:             imageFile ? exifData : null,
      ocr_text:         ocrText,
    });
  } catch (err) {
    console.error('[CGA] /verify error:', err.message);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// ─── GET /api/cga/claims ─────────────────────────────────────────
// Admin: paginated list of all claims
router.get('/claims', async (req, res) => {
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const supabase = getSupabase();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const verdict = req.query.verdict;

    let query = supabase
      .from('cga_claims')
      .select('*, users(name, phone, zone)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (verdict) query = query.eq('verdict', verdict);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ claims: data, total: count, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/cga/claims/queue ───────────────────────────────────
// Admin: human-in-the-loop review queue (VI > 7 or flag_human_review)
router.get('/claims/queue', async (req, res) => {
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cga_claims')
      .select('*, users(name, phone, zone)')
      .or('vi_score.gte.7,verdict.eq.FRAUD_ALERT')
      .is('reviewed_by', null)
      .order('vi_score', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/cga/claims/leaderboard ─────────────────────────────
// Admin: top 10 viral claims by VI score
router.get('/claims/leaderboard', async (req, res) => {
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cga_claims')
      .select('id, raw_input, verdict, vi_score, zone, created_at, truth_card')
      .order('vi_score', { ascending: false })
      .limit(10);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/cga/claims/:id/review ──────────────────────────────
// Admin: update verdict after human review
router.put('/claims/:id/review', async (req, res) => {
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { id } = req.params;
  const { verdict, source_url, notes } = req.body;

  if (!verdict) return res.status(400).json({ error: 'verdict is required' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cga_claims')
      .update({
        verdict,
        source_url:  source_url || null,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await writeAuditLog(req.user.id, 'CGA_HUMAN_REVIEW', id, { verdict, notes });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/cga/dispatch ───────────────────────────────────────
// Admin: push a Truth Card via UACS dispatch channels
router.post('/dispatch', async (req, res) => {
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { claim_id, channels = ['sms'], zone } = req.body;

  if (!claim_id) return res.status(400).json({ error: 'claim_id is required' });

  try {
    const supabase = getSupabase();
    const { data: claim, error } = await supabase
      .from('cga_claims')
      .select('*')
      .eq('id', claim_id)
      .single();

    if (error || !claim) return res.status(404).json({ error: 'Claim not found' });

    const truthCardEn = claim.truth_card?.en || `CivicGuard AI Verdict: ${claim.verdict}. ${claim.source_url ? 'Source: ' + claim.source_url : ''}`;

    // Create a UACS message for this Truth Card dispatch
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        title:          `[CGA] Truth Card: ${claim.verdict}`,
        master_content: truthCardEn,
        urgency:        claim.verdict === 'FRAUD_ALERT' ? 'critical' : 'high',
        status:         'active',
        channels:       channels,
        languages:      ['en', 'hi', 'mr', 'ta', 'te'],
        target_zone:    zone || claim.zone || 'All Zones',
        sent_by:        req.user.name || 'CivicGuard AI',
        translations:   JSON.stringify(claim.truth_card || {}),
        expires_at:     new Date(Date.now() + 24 * 3600000).toISOString(),
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    await writeAuditLog(req.user.id, 'CGA_TRUTH_CARD_DISPATCH', claim_id, {
      message_id: msg.id,
      channels,
      zone: zone || claim.zone,
      verdict: claim.verdict,
    });

    res.json({ success: true, message_id: msg.id, claim_id, channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/cga/stats ───────────────────────────────────────────
router.get('/stats', async (req, res) => {
  if (req.user?.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cga_claims')
      .select('verdict, vi_score, created_at, zone');
    if (error) throw error;

    const stats = {
      total:          data.length,
      byVerdict:      data.reduce((acc, c) => { acc[c.verdict] = (acc[c.verdict] || 0) + 1; return acc; }, {}),
      avgViScore:     data.length ? (data.reduce((s, c) => s + Number(c.vi_score || 0), 0) / data.length).toFixed(2) : 0,
      highRisk:       data.filter(c => c.vi_score >= 7).length,
      pendingReview:  data.filter(c => c.verdict === 'PENDING').length,
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
