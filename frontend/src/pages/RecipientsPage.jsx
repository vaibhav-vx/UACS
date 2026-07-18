import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Send, Trash2, Loader2, Phone, Map as MapIcon,
  Languages, Search, X, CheckCircle2, AlertCircle, RefreshCw,
  ChevronDown, ToggleLeft, ToggleRight, Edit2, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { recipientsApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { detectZoneFromLocation } from '../utils/zoneMapper';
import MapZonePicker from '../components/MapZonePicker';



const ZONE_PRESETS = {
  'North District': [19.21, 72.85],
  'South District': [18.93, 72.83],
  'East District':  [19.08, 72.92],
  'West District':  [19.12, 72.82],
  'Central Zone':   [19.03, 72.85],
};

const LANGUAGE_OPTIONS = [
  { value: 'en',      label: 'English',  flag: '🇬🇧' },
  { value: 'hindi',   label: 'Hindi',    flag: '🇮🇳' },
  { value: 'marathi', label: 'Marathi',  flag: '🇮🇳' },
  { value: 'tamil',   label: 'Tamil',    flag: '🇮🇳' },
  { value: 'telugu',  label: 'Telugu',   flag: '🇮🇳' },
];

const getLangLabel = (code) => LANGUAGE_OPTIONS.find(l => l.value === code)?.label || code || 'English';

// ── Stat card ──────────────────────────────────────────
function Stat({ label, value, color = 'var(--accent)', icon: Icon }) {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 20, height: 20, color }} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Add / Edit Modal ───────────────────────────────────
function RecipientModal({ initial, onSave, onClose, saving }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(initial || { name: '', phone: '', zone: '', lat: null, lng: null, language: 'en' });
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updCoords = (v, lat, lng) => setForm(p => ({ ...p, zone: v, lat, lng }));

  const detectedZone = detectZoneFromLocation(form.zone);

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md shadow-2xl" style={{ background: 'var(--bg-base)' }}>
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus style={{ width: 20, height: 20, color: 'var(--accent)' }} />
            {initial?.id ? (t('editRecipient') || 'Edit Recipient') : (t('addRecipient') || 'Add Recipient')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-theme-secondary">
              {t('fullName') || 'Full Name'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="input-field"
              placeholder="e.g. Vaibhav Dubey"
              value={form.name}
              onChange={e => upd('name', e.target.value)}
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-theme-secondary">
              <Phone style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
              {t('phoneNumber') || 'Phone Number'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="input-field"
              placeholder="+91XXXXXXXXXX"
              type="tel"
              value={form.phone}
              onChange={e => upd('phone', e.target.value)}
            />
            <p className="text-xs text-theme-dim mt-1">
              {t('includeCountryCode') || 'Include country code — e.g. +91 for India'}
            </p>
          </div>

          {/* Zone */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-theme-secondary">
              <MapIcon style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
              {t('locationZone') || 'City / Area'}
            </label>
            <div className="flex gap-2 mb-2">
              <input 
                type="text"
                className="input-field flex-1"
                placeholder={t('zonePlaceholder') || "e.g. Delhi, Mumbai North, Pune"}
                value={form.zone}
                onChange={e => upd('zone', e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowMapPicker(true)} 
                title="Pick zone on map" 
                className="btn-secondary px-3 shrink-0"
              >
                <MapIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            {form.zone && (
              <p className="text-xs text-green-500 mt-1 mb-2 font-medium">
                📍 Detected Zone: {detectedZone}
              </p>
            )}
          </div>

          {showMapPicker && (
            <MapZonePicker 
              value={form.zone} 
              onChange={(v, coords) => updCoords(v, coords?.lat, coords?.lng)} 
              onClose={() => setShowMapPicker(false)} 
            />
          )}

          {/* Language */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-theme-secondary">
              <Languages style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />
              {t('language') || 'Preferred Language'}
            </label>
            <div className="flex flex-wrap gap-2 mt-1">
              {LANGUAGE_OPTIONS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => upd('language', l.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: `1px solid ${form.language === l.value ? 'var(--accent-border)' : 'var(--border)'}`,
                    background: form.language === l.value ? 'var(--accent-bg)' : 'var(--bg-input)',
                    color: form.language === l.value ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border)] flex gap-3 justify-end" style={{ background: 'var(--bg-surface)' }}>
          <button onClick={onClose} className="btn-secondary">{t('cancel') || 'Cancel'}</button>
          <button onClick={() => onSave(form)} disabled={saving} className="btn-primary">
            {saving
              ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> {t('saving') || 'Saving...'}</>
              : <><Save style={{ width: 16, height: 16 }} /> {initial?.id ? (t('saveChanges') || 'Save Changes') : (t('addRecipient') || 'Add Recipient')}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────
export default function RecipientsPage() {
  const { t } = useLanguage();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLang, setFilterLang] = useState('all');
  const [filterZone, setFilterZone] = useState('all');
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [testingId, setTestingId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [selected, setSelected]     = useState(new Set());

  const fetch = useCallback(async () => {
    try {
      const r = await recipientsApi.getAll();
      setRecipients(r.data);
    } catch (err) {
      console.error('[RECIPIENTS] Fetch error:', err);
      const msg = err.response?.data?.error || err.message || 'Connection failed';
      toast.error(`${t('failedFetch') || 'Failed to load recipients'}: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetch(); }, [fetch]);

  // Derived data
  const zones = [...new Set(recipients.map(r => r.zone).filter(Boolean))];
  const filtered = recipients.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchQ  = !q || r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.zone || '').toLowerCase().includes(q);
    const matchL  = filterLang === 'all' || r.language === filterLang;
    const matchZ  = filterZone === 'all' || r.zone === filterZone;
    return matchQ && matchL && matchZ;
  });

  const activeCount = recipients.filter(r => r.active).length;

  const handleSave = async (form) => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t('namePhoneRequired') || 'Name and phone are required');
      return;
    }
    setSaving(true);
    try {
      if (editTarget?.id) {
        await recipientsApi.update(editTarget.id, form);
        toast.success(t('recipientUpdated') || 'Recipient updated');
      } else {
        await recipientsApi.create(form);
        toast.success(t('recipientAdded') || 'Recipient added');
      }
      setShowModal(false);
      setEditTarget(null);
      fetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save recipient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('removeRecipientConfirm') || 'Remove this recipient?')) return;
    setDeletingId(id);
    try {
      await recipientsApi.delete(id);
      toast.success(t('recipientRemoved') || 'Recipient removed');
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      fetch();
    } catch {
      toast.error('Failed to remove recipient');
    } finally {
      setDeletingId(null); }
  };

  const handleTest = async (id, name) => {
    setTestingId(id);
    try {
      const r = await recipientsApi.sendTest(id);
      if (r.data.success) {
        toast.success(`✅ ${(t('testSmsSentTo') || 'Test SMS sent to')} ${name}`, { duration: 6000, style: { background: '#22c55e', color: '#fff' } });
      } else {
        toast.error(`❌ ${r.data.error || 'Failed to send test SMS'}`);
      }
    } catch (err) {
      toast.error(`❌ ${err.response?.data?.error || 'SMS failed'}`);
    } finally {
      setTestingId(null);
    }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="glass-card h-16 shimmer rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users style={{ width: 22, height: 22, color: 'var(--accent)' }} />
            {t('recipientsTitle') || 'Recipients'}
          </h1>
          <p className="text-theme-muted" style={{ fontSize: 13, marginTop: 4 }}>
            {t('recipientsSubtitle') || 'Manage SMS recipients for alert dispatch'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={fetch} className="btn-secondary" style={{ padding: '8px 12px' }}>
            <RefreshCw style={{ width: 15, height: 15 }} />
          </button>
          <button onClick={() => { setEditTarget(null); setShowModal(true); }} className="btn-primary">
            <UserPlus style={{ width: 16, height: 16 }} />
            {t('addRecipient') || 'Add Recipient'}
          </button>
        </div>
      </div>

      {/* ── Stats ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12 }}>
        <Stat icon={Users}        label={t('totalRecipients') || "Total Recipients"} value={recipients.length} color="var(--accent)" />
        <Stat icon={CheckCircle2} label={t('active') || "Active"}           value={activeCount}       color="#22c55e" />
        <Stat icon={MapIcon}       label={t('zonesCovered') || "Zones Covered"}    value={zones.length}      color="#f97316" />
        <Stat icon={Languages}    label={t('languages') || "Languages"}        value={[...new Set(recipients.map(r => r.language))].length} color="#a855f7" />
      </div>

      {/* ── Filters ─────────────────── */}
      <div className="glass-card p-4" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ width: 15, height: 15, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            placeholder={t('searchRecipientsPlaceholder') || 'Search name, phone, zone...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Zone filter */}
        {zones.length > 0 && (
          <div style={{ position: 'relative' }}>
            <MapIcon style={{ width: 13, height: 13, position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select className="input-field" value={filterZone} onChange={e => setFilterZone(e.target.value)} style={{ paddingLeft: 26, paddingRight: 28, minWidth: 130 }}>
              <option value="all">{t('allZones') || "All Zones"}</option>
              {zones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
        )}

        {/* Language filter */}
        <div style={{ position: 'relative' }}>
          <Languages style={{ width: 13, height: 13, position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select className="input-field" value={filterLang} onChange={e => setFilterLang(e.target.value)} style={{ paddingLeft: 26, paddingRight: 28, minWidth: 130 }}>
            <option value="all">{t('allLanguages') || "All Languages"}</option>
            {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.flag} {l.label}</option>)}
          </select>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} of {recipients.length}
        </span>
      </div>

      {/* ── Recipients Table ─────────────────── */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users style={{ width: 48, height: 48, margin: '0 auto 12px', color: 'var(--text-dim)' }} />
          <h3 style={{ fontWeight: 600, marginBottom: 6 }}>{recipients.length === 0 ? (t('noRecipientsTitle') || 'No Recipients Yet') : (t('noMatchesFound') || 'No matches found')}</h3>
          <p className="text-theme-muted" style={{ fontSize: 13, marginBottom: 16 }}>
            {recipients.length === 0 ? (t('noRecipientsDesc') || 'Add your first recipient to start sending SMS alerts.') : (t('adjustSearchFilters') || 'Try adjusting your search or filters.')}
          </p>
          {recipients.length === 0 && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <UserPlus style={{ width: 16, height: 16 }} /> {t('addRecipient') || 'Add Recipient'}
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('recipientCol') || "Recipient"}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('phoneCol') || "Phone"}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('zoneCol') || "Location / Zone"}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('langCol') || "Language"}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('statusCol') || "Status"}</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('actionsCol') || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                      background: selected.has(r.id) ? 'var(--accent-bg)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!selected.has(r.id)) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!selected.has(r.id)) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Avatar + Name */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 700, color: 'white',
                        }}>
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.name}</span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.phone}
                    </td>

                    {/* Zone */}
                    <td style={{ padding: '12px 16px' }}>
                      {r.zone ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                          background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)',
                          whiteSpace: 'nowrap',
                        }}>
                          {r.zone}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Language */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)',
                        whiteSpace: 'nowrap',
                      }}>
                        {getLangLabel(r.language)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: r.active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                        color: r.active ? '#22c55e' : '#64748b',
                        border: `1px solid ${r.active ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}`,
                      }}>
                        {r.active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        {/* Test SMS */}
                        <button
                          onClick={() => handleTest(r.id, r.name)}
                          disabled={testingId === r.id}
                          title="Send Test SMS"
                          style={{
                            padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.25)', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            opacity: testingId === r.id ? 0.6 : 1,
                          }}
                        >
                          {testingId === r.id
                            ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                            : <Send style={{ width: 13, height: 13 }} />
                          }
                          {t('testBtn') || "Test"}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => { setEditTarget(r); setShowModal(true); }}
                          title="Edit"
                          style={{
                            width: 30, height: 30, borderRadius: 6, background: 'var(--bg-hover)',
                            border: '1px solid var(--border)', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Edit2 style={{ width: 13, height: 13 }} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          title="Delete"
                          style={{
                            width: 30, height: 30, borderRadius: 6, background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ef4444', opacity: deletingId === r.id ? 0.5 : 1,
                          }}
                        >
                          {deletingId === r.id
                            ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
                            : <Trash2 style={{ width: 13, height: 13 }} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ─────────────────── */}
      {showModal && (
        <RecipientModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
