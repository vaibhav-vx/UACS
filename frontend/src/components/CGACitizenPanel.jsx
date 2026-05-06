import { useState, useRef } from 'react';
import {
  Shield, MessageSquare, Upload, Loader2, CheckCircle2, AlertTriangle,
  XCircle, Clock, AlertOctagon, ArrowLeft, Share2, RotateCcw, ImageIcon, X
} from 'lucide-react';
import { cgaApi } from '../api';
import { useAuth } from '../context/AuthContext';

// ── Verdict config ──────────────────────────────────────────────
const VERDICT_CONFIG = {
  FALSE:          { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle,        label: 'FALSE',           border: 'rgba(239,68,68,0.3)' },
  MISLEADING:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  icon: AlertTriangle,  label: 'MISLEADING',      border: 'rgba(249,115,22,0.3)' },
  OUTDATED:       { color: '#eab308', bg: 'rgba(234,179,8,0.1)',   icon: Clock,          label: 'OUTDATED',        border: 'rgba(234,179,8,0.3)' },
  RECYCLED_IMAGE: { color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: RotateCcw,      label: 'RECYCLED IMAGE',  border: 'rgba(168,85,247,0.3)' },
  FRAUD_ALERT:    { color: '#dc2626', bg: 'rgba(220,38,38,0.12)',  icon: AlertOctagon,   label: '⚠️ FRAUD ALERT', border: 'rgba(220,38,38,0.4)' },
  CONFIRMED:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: CheckCircle2,   label: '✅ CONFIRMED',    border: 'rgba(34,197,94,0.3)' },
  PENDING:        { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: Loader2,        label: 'PENDING',         border: 'rgba(100,116,139,0.3)' },
};

const VI_COLOR = (score) => {
  if (score >= 9) return '#ef4444';
  if (score >= 7) return '#f97316';
  if (score >= 4) return '#eab308';
  return '#22c55e';
};

// ── Truth Card ──────────────────────────────────────────────────
function TruthCard({ result, onBack, userLang }) {
  const cfg    = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.PENDING;
  const Icon   = cfg.icon;
  const cardText = result.truth_card?.[userLang] || result.truth_card?.en || result.summary;
  const viColor  = VI_COLOR(result.vi_score);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'CivicGuard AI — Truth Card',
        text: `Verdict: ${result.verdict}\n\n${cardText}\n\nVerified by CivicGuard AI (UACS)`,
      });
    } else {
      navigator.clipboard.writeText(`Verdict: ${result.verdict}\n\n${cardText}`);
      alert('Truth Card copied to clipboard!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      {/* Verdict Header */}
      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16,
        padding: '20px', display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: cfg.bg, border: `2px solid ${cfg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon style={{ width: 24, height: 24, color: cfg.color }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
              padding: '3px 10px', borderRadius: 999,
            }}>
              {cfg.label}
            </span>
            {/* VI Score badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Virality</span>
              <span style={{
                fontSize: 11, fontWeight: 900, color: viColor,
                background: `${viColor}15`, border: `1px solid ${viColor}40`,
                padding: '2px 8px', borderRadius: 999,
              }}>
                {result.vi_score?.toFixed(1)} / 10
              </span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {result.summary}
          </p>
        </div>
      </div>

      {/* UACS Alert Match */}
      {result.uacs_alert_match && (
        <div style={{
          background: result.uacs_alert_match === 'CONFIRMED' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${result.uacs_alert_match === 'CONFIRMED' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: 12, padding: '12px 16px',
          fontSize: 12, fontWeight: 600,
          color: result.uacs_alert_match === 'CONFIRMED' ? '#22c55e' : '#ef4444',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Shield style={{ width: 14, height: 14 }} />
          {result.uacs_alert_match === 'CONFIRMED'
            ? `✅ Matches UACS Alert #MSG-${result.uacs_alert_id}`
            : `🚨 CONTRADICTS Active UACS Alert #MSG-${result.uacs_alert_id}`}
        </div>
      )}

      {/* Truth Card text in user's language */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 16,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 10 }}>
          🧾 Truth Card
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', margin: 0 }}>
          {cardText}
        </p>
      </div>

      {/* Source */}
      {result.source_url && (
        <a
          href={result.source_url} target="_blank" rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
            color: 'var(--accent)', padding: '8px 12px', borderRadius: 10,
            background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
            textDecoration: 'none', fontWeight: 600,
          }}
        >
          <CheckCircle2 style={{ width: 13, height: 13 }} />
          Official Source →
        </a>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleShare}
          style={{
            flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border)',
            background: 'var(--bg-hover)', color: 'var(--text-primary)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Share2 style={{ width: 15, height: 15 }} />
          Share Truth Card
        </button>
        <button
          onClick={onBack}
          style={{
            flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--accent-border)',
            background: 'var(--accent-bg)', color: 'var(--accent)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <ArrowLeft style={{ width: 15, height: 15 }} />
          Back to Notifications
        </button>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// ── Main Citizen CGA Panel ───────────────────────────────────────
export default function CGACitizenPanel({ onClose }) {
  const { user }       = useAuth();
  const [input, setInput]   = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);
  const userLang = user?.language || 'en';

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setInput('');
  };

  const handleSubmit = async () => {
    if (!input.trim() && !imageFile) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let res;
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        if (input.trim()) fd.append('claim_text', input.trim());
        res = await cgaApi.verifyImage(fd);
      } else {
        res = await cgaApi.verifyClaim(input.trim());
      }
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setInput('');
    setImageFile(null);
    setImagePreview(null);
    setError('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(59,130,246,0.05))',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield style={{ width: 16, height: 16, color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>CivicGuard AI</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Misinformation Detector • UACS</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#22c55e',
              display: 'inline-block', boxShadow: '0 0 6px #22c55e80',
            }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>LIVE</span>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, paddingLeft: 2 }}>
          Paste a suspicious message, forward, or upload a screenshot to fact-check instantly.
        </p>
      </div>

      {/* Body — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {result ? (
          <TruthCard result={result} onBack={handleReset} userLang={userLang} />
        ) : (
          <>
            {/* Image preview */}
            {imagePreview && (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', maxHeight: 160 }}>
                <img src={imagePreview} alt="upload" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}

            {/* Text area */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={imageFile
                ? 'Add context about this image (optional)...'
                : 'Paste a suspicious WhatsApp message, rumour, or news claim here...'
              }
              style={{
                width: '100%', minHeight: 120, resize: 'none', borderRadius: 12,
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6,
                padding: '12px 14px', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              disabled={loading}
            />

            {/* Upload tip */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'var(--bg-hover)', border: '1px dashed var(--border)',
                borderRadius: 12, cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, width: '100%', textAlign: 'left',
              }}
            >
              <ImageIcon style={{ width: 16, height: 16 }} />
              Upload screenshot / newspaper clipping (OCR + EXIF analysis)
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageSelect} />

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444', fontSize: 12, fontWeight: 600,
              }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer — input actions */}
      {!result && (
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0,
          background: 'var(--bg-surface)',
        }}>
          <button
            onClick={handleSubmit}
            disabled={loading || (!input.trim() && !imageFile)}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: loading || (!input.trim() && !imageFile)
                ? 'var(--bg-hover)'
                : 'linear-gradient(135deg, #6366f1, #3b82f6)',
              color: loading || (!input.trim() && !imageFile) ? 'var(--text-dim)' : 'white',
              fontSize: 13, fontWeight: 800, cursor: loading || (!input.trim() && !imageFile) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'all 0.2s', letterSpacing: '0.03em',
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                Verifying with CivicGuard AI...
              </>
            ) : (
              <>
                <Shield style={{ width: 16, height: 16 }} />
                Fact-Check Now
              </>
            )}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
