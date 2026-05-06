import { useState, useEffect, useCallback } from 'react';
import {
  Shield, AlertOctagon, CheckCircle2, XCircle, AlertTriangle, Clock,
  RotateCcw, Loader2, RefreshCw, Send, Eye, Users, TrendingUp, Search
} from 'lucide-react';
import { cgaApi } from '../api';
import toast from 'react-hot-toast';
import SituationMapCard from '../components/SituationMapCard';

const VERDICT_CONFIG = {
  FALSE:          { color: '#ef4444', icon: XCircle },
  MISLEADING:     { color: '#f97316', icon: AlertTriangle },
  OUTDATED:       { color: '#eab308', icon: Clock },
  RECYCLED_IMAGE: { color: '#a855f7', icon: RotateCcw },
  FRAUD_ALERT:    { color: '#dc2626', icon: AlertOctagon },
  CONFIRMED:      { color: '#22c55e', icon: CheckCircle2 },
  PENDING:        { color: '#64748b', icon: Loader2 },
};

const VI_COLOR = (s) => s >= 9 ? '#ef4444' : s >= 7 ? '#f97316' : s >= 4 ? '#eab308' : '#22c55e';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wider font-bold text-theme-muted">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function VerdictBadge({ verdict }) {
  const cfg = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
      style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}35` }}>
      <Icon className="w-3 h-3" />
      {verdict?.replace('_', ' ')}
    </span>
  );
}

export default function CivicGuardAdminPage() {
  const [activeTab, setActiveTab] = useState('claims');
  const [claims, setClaims]       = useState([]);
  const [queue, setQueue]         = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [reviewId, setReviewId]   = useState(null);
  const [reviewVerdict, setReviewVerdict] = useState('');
  const [reviewSource, setReviewSource]   = useState('');
  const [dispatchId, setDispatchId] = useState(null);
  const [dispatchLoading, setDispatchLoading] = useState({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, q, lb, s] = await Promise.all([
        cgaApi.getClaims({ verdict: verdictFilter || undefined }),
        cgaApi.getQueue(),
        cgaApi.getLeaderboard(),
        cgaApi.getStats(),
      ]);
      setClaims(c.data.claims || []);
      setQueue(q.data);
      setLeaderboard(lb.data);
      setStats(s.data);
    } catch (e) {
      toast.error('Failed to load CGA data');
    } finally {
      setLoading(false);
    }
  }, [verdictFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleReview = async () => {
    if (!reviewVerdict) return;
    try {
      await cgaApi.reviewClaim(reviewId, { verdict: reviewVerdict, source_url: reviewSource });
      toast.success('Claim reviewed and updated');
      setReviewId(null); setReviewVerdict(''); setReviewSource('');
      fetchAll();
    } catch { toast.error('Review failed'); }
  };

  const handleDispatch = async (id) => {
    setDispatchLoading(p => ({ ...p, [id]: true }));
    try {
      await cgaApi.dispatchTruthCard(id, ['sms', 'social_media']);
      toast.success('Truth Card dispatched via UACS channels!');
    } catch { toast.error('Dispatch failed'); }
    finally { setDispatchLoading(p => ({ ...p, [id]: false })); }
  };

  const TABS = [
    { key: 'claims',      label: `All Claims (${claims.length})` },
    { key: 'queue',       label: `Review Queue (${queue.length})` },
    { key: 'leaderboard', label: 'Virality Index' },
    { key: 'map',         label: 'Misinformation Map' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)' }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">CivicGuard AI</h1>
            <p className="text-sm text-theme-muted">Misinformation Intelligence Command Center</p>
          </div>
        </div>
        <button onClick={fetchAll} className="btn-secondary text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Shield}       label="Total Claims"   value={stats.total}         color="var(--accent)" />
          <StatCard icon={AlertOctagon} label="High Risk"      value={stats.highRisk}      color="#ef4444" />
          <StatCard icon={TrendingUp}   label="Avg VI Score"   value={stats.avgViScore}    color="#f97316" />
          <StatCard icon={Eye}          label="Pending Review" value={stats.pendingReview} color="#eab308" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeTab === t.key ? 'var(--accent)' : 'transparent',
              color: activeTab === t.key ? 'white' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CLAIMS TAB ── */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {/* Verdict filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {['', 'FALSE', 'MISLEADING', 'OUTDATED', 'FRAUD_ALERT', 'CONFIRMED'].map(v => (
              <button key={v} onClick={() => setVerdictFilter(v)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: verdictFilter === v ? 'var(--accent)' : 'var(--bg-surface)',
                  color: verdictFilter === v ? 'white' : 'var(--text-muted)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                }}>
                {v || 'All'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 glass-card shimmer rounded-2xl" />)}</div>
          ) : claims.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-2xl">
              <Shield className="w-12 h-12 mx-auto mb-3 text-theme-dim" />
              <p className="text-theme-muted">No claims submitted yet.</p>
            </div>
          ) : claims.map(c => (
            <div key={c.id} className="glass-card p-5 rounded-2xl hover:shadow-xl transition-all">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <VerdictBadge verdict={c.verdict} />
                    <span className="text-[10px] font-bold text-theme-muted uppercase">Zone: {c.zone || 'Unknown'}</span>
                    <span className="text-[10px] text-theme-dim">{new Date(c.created_at).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-sm text-theme-secondary line-clamp-2">{c.raw_input || c.ocr_text || '(Image claim)'}</p>
                  <div className="flex items-center gap-4 text-[10px] font-bold">
                    <span>VI Score: <span style={{ color: VI_COLOR(c.vi_score) }}>{Number(c.vi_score).toFixed(1)}</span></span>
                    <span className="text-theme-muted">Type: {c.input_type}</span>
                    {c.users?.name && <span className="text-theme-dim">By: {c.users.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { setReviewId(c.id); setReviewVerdict(c.verdict); setReviewSource(c.source_url || ''); }}
                    className="btn-secondary text-xs py-1.5 px-3">
                    <Eye className="w-3 h-3" /> Review
                  </button>
                  <button onClick={() => handleDispatch(c.id)} disabled={dispatchLoading[c.id]}
                    className="btn-primary text-xs py-1.5 px-3">
                    {dispatchLoading[c.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Dispatch
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REVIEW QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queue.length === 0 ? (
            <div className="glass-card p-16 text-center rounded-2xl">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="text-theme-muted font-bold">No pending reviews!</p>
            </div>
          ) : queue.map(c => (
            <div key={c.id} className="glass-card p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <VerdictBadge verdict={c.verdict} />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20">
                  VI: {Number(c.vi_score).toFixed(1)} — HIGH RISK
                </span>
              </div>
              <p className="text-sm text-theme-secondary mb-4 line-clamp-3">{c.raw_input}</p>
              <div className="flex gap-2">
                <button onClick={() => { setReviewId(c.id); setReviewVerdict(c.verdict); setReviewSource(c.source_url || ''); }}
                  className="btn-primary text-xs flex-1 justify-center">
                  <Eye className="w-3 h-3" /> Open Review
                </button>
                <button onClick={() => handleDispatch(c.id)} disabled={dispatchLoading[c.id]}
                  className="btn-secondary text-xs flex-1 justify-center">
                  {dispatchLoading[c.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Dispatch Truth Card
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-theme-border">
            <h2 className="font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-500" /> Top 10 Viral Claims
            </h2>
          </div>
          {leaderboard.map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 p-4 border-b border-theme-border hover:bg-theme-hover transition-all">
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                style={{ background: i < 3 ? `${VI_COLOR(c.vi_score)}25` : 'var(--bg-hover)', color: VI_COLOR(c.vi_score) }}>
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{c.raw_input || '(Image claim)'}</p>
                <div className="flex items-center gap-3 mt-1">
                  <VerdictBadge verdict={c.verdict} />
                  <span className="text-[10px] text-theme-muted">{c.zone}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black" style={{ color: VI_COLOR(c.vi_score) }}>
                  {Number(c.vi_score).toFixed(1)}
                </div>
                <div className="text-[10px] text-theme-muted font-bold">VI Score</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MAP TAB ── */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-2xl text-sm text-theme-muted flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0" />
            Misinformation heatmap overlay — active UACS alerts shown alongside CGA claim zones.
          </div>
          <SituationMapCard cgaMode />
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl shadow-2xl space-y-4">
            <h2 className="text-lg font-black">Human Review — Claim #{reviewId}</h2>
            <div>
              <label className="text-xs font-bold text-theme-muted uppercase block mb-2">Update Verdict</label>
              <select value={reviewVerdict} onChange={e => setReviewVerdict(e.target.value)}
                className="w-full input-field">
                {Object.keys(VERDICT_CONFIG).filter(v => v !== 'PENDING').map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-theme-muted uppercase block mb-2">Official Source URL</label>
              <input className="input-field w-full" value={reviewSource} onChange={e => setReviewSource(e.target.value)} placeholder="https://pib.gov.in/..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setReviewId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleReview} className="btn-primary flex-1 justify-center">
                <CheckCircle2 className="w-4 h-4" /> Confirm Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
