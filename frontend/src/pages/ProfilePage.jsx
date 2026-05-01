import { useState, useEffect } from 'react';
import {
  User, Lock, Building2, Smartphone, Save, Loader2,
  AlertCircle, CheckCircle2, KeyRound, Activity,
  Eye, EyeOff, LogOut, Globe, Map as MapIcon, Bell, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MapZonePicker from '../components/MapZonePicker';

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="glass-card overflow-hidden">
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 18, height: 18, color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon style={{ width: 13, height: 13 }} />} {label}
      </label>
      {children}
    </div>
  );
}

function InlineAlert({ type, msg }) {
  if (!msg) return null;
  const isErr = type === 'error';
  return (
    <div className="animate-fade-in" style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, fontSize: 13,
      background: isErr ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
      border: `1px solid ${isErr ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.25)'}`,
      color: isErr ? '#ef4444' : '#22c55e',
    }}>
      {isErr ? <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} /> : <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0 }} />}
      {msg}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { user, fetchUser } = useAuth();

  // Profile section
  const [name,       setName]       = useState('');
  const [phone,      setPhone]      = useState('');
  const [dept,       setDept]       = useState('');
  const [role,       setRole]       = useState('');
  const [profSaving, setProfSaving] = useState(false);
  const [profMsg,    setProfMsg]    = useState({ type: '', text: '' });

  // Password section
  const [curPwd,   setCurPwd]   = useState('');
  const [newPwd,   setNewPwd]   = useState('');
  const [confPwd,  setConfPwd]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg,   setPwdMsg]   = useState({ type: '', text: '' });

  // Preferences section
  const [lang, setLang] = useState('english');
  const [zone, setZone] = useState('General');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [smsActive, setSmsActive] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMsg, setPrefMsg] = useState({ type: '', text: '' });

  // Emergency Contact section
  const [emName, setEmName] = useState('');
  const [emPhone, setEmPhone] = useState('');
  const [emSaving, setEmSaving] = useState(false);
  const [emMsg, setEmMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || user.email || '');
      const rawDept = user.location || (user.zone && user.zone !== 'Field Ops' && user.zone !== 'General' ? user.zone : '');
      setDept(rawDept);
      setRole(user.role || '');
      setZone(rawDept || user.city || '');
      setLat(user.lat || null);
      setLng(user.lng || null);
      setLang(user.language || 'english');
    }
    import('../api').then(m => m.authApi.getPreferences().then(res => {
      if (res.data) {
        setLang(res.data.language || 'english');
        setZone(res.data.zone || 'General');
        setLat(res.data.lat || null);
        setLng(res.data.lng || null);
        setSmsActive(res.data.active !== false);
      }
    }).catch(console.error));
  }, [user]);

  const saveProfile = async () => {
    setProfMsg({ type: '', text: '' });
    if (!name.trim()) { setProfMsg({ type: 'error', text: 'Name is required' }); return; }
    setProfSaving(true);
    try {
      const res = await authApi.updateProfile({ name: name.trim(), location: dept.trim(), zone: dept.trim(), lat, lng });
      const updated = res.data.user;
      localStorage.setItem('uacs_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('uacs_user') || '{}'), ...updated }));
      await fetchUser();
      setProfMsg({ type: 'success', text: 'Profile updated successfully' });
      toast.success('Profile saved');
    } catch (err) {
      setProfMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setProfSaving(false);
    }
  };

  const changePassword = async () => {
    setPwdMsg({ type: '', text: '' });
    if (!curPwd || !newPwd || !confPwd) { setPwdMsg({ type: 'error', text: 'All password fields are required' }); return; }
    if (newPwd.length < 8) { setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters' }); return; }
    if (newPwd !== confPwd) { setPwdMsg({ type: 'error', text: 'New passwords do not match' }); return; }
    setPwdSaving(true);
    try {
      await authApi.changePassword({ currentPassword: curPwd, newPassword: newPwd });
      setPwdMsg({ type: 'success', text: 'Password changed. Please log in again.' });
      setCurPwd(''); setNewPwd(''); setConfPwd('');
      toast.success('Password changed');
      setTimeout(() => { localStorage.clear(); navigate('/login'); }, 2000);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setPwdSaving(false);
    }
  };

  const savePreferences = async () => {
    setPrefMsg({ type: '', text: '' });
    setPrefSaving(true);
    try {
      await authApi.updatePreferences({ language: lang, zone, lat, lng, active: smsActive });
      setPrefMsg({ type: 'success', text: 'Preferences saved successfully' });
      await fetchUser(); // Updates the auth context and dashboard globally
      toast.success('Preferences saved');
    } catch (err) {
      setPrefMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update preferences' });
    } finally {
      setPrefSaving(false);
    }
  };

  const saveEmergencyContact = async () => {
    setEmMsg({ type: '', text: '' });
    if (!emPhone.trim()) { setEmMsg({ type: 'error', text: 'Phone number is required' }); return; }
    setEmSaving(true);
    try {
      const res = await authApi.setEmergencyContact({ phone: emPhone, name: emName });
      setEmMsg({ type: 'success', text: res.data.message || 'Emergency contact added successfully' });
      setEmPhone('');
      setEmName('');
      toast.success('Emergency contact added');
    } catch (err) {
      setEmMsg({ type: 'error', text: err.response?.data?.error || 'Failed to add contact' });
    } finally {
      setEmSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const EyeBtn = ({ show, toggle }) => (
    <button type="button" onClick={toggle} tabIndex={-1} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, display: 'flex' }}>
      {show ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
    </button>
  );

  return (
    <div className="space-y-6 animate-fade-in" style={{ maxWidth: 640 }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <User className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          {t('profileSettings') || 'My Profile'}
        </h1>
        <p className="text-sm mt-1 text-theme-muted">{t('profileSettingsSub') || 'Manage your account details and security settings'}</p>
      </div>

      {/* Account info badge */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>{(name || 'A')[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{name || '—'}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{phone}</p>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', flexShrink: 0 }}>
          {role}
        </span>
      </div>

      {/* Profile Info */}
      <Section title={t('personalInfo') || 'Personal Information'} subtitle={t('updateNameZone') || 'Update your name and location'} icon={User}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('fullName') || 'Full Name'} icon={User}>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder={t('fullName') || 'Your full name'} />
          </Field>
          <Field label={t('mobileNumber') || 'Mobile Number'} icon={Smartphone}>
            <input className="input-field" value={phone} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{t('mobileNoChange') || 'Mobile number cannot be changed'}</p>
          </Field>
          <Field label={t('locationZone') || 'Location / Zone'} icon={MapIcon}>
            <input className="input-field" value={dept} onChange={e => setDept(e.target.value)} placeholder="e.g. Mumbai, Delhi, Pune" />
          </Field>
          {profMsg.text && <InlineAlert type={profMsg.type} msg={profMsg.text} />}
          <button onClick={saveProfile} disabled={profSaving} className="btn-primary" style={{ width: 'fit-content', gap: 8 }}>
            {profSaving ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> {t('saving') || 'Saving...'}</> : <><Save style={{ width: 15, height: 15 }} /> {t('saveChanges') || 'Save Changes'}</>}
          </button>
        </div>
      </Section>

      {/* Password */}
      <Section title={t('changePassword') || 'Change Password'} subtitle={t('pwdSubtitle') || 'Use a strong password — minimum 8 characters'} icon={KeyRound}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: t('curPassword') || 'Current Password', val: curPwd, set: setCurPwd, id: 'cur-pwd' },
            { label: t('newPassword') || 'New Password',     val: newPwd, set: setNewPwd, id: 'new-pwd' },
            { label: t('confNewPassword') || 'Confirm New Password', val: confPwd, set: setConfPwd, id: 'conf-pwd' },
          ].map(({ label, val, set, id }) => (
            <Field key={id} label={label} icon={Lock}>
              <div style={{ position: 'relative' }}>
                <input id={id} className="input-field" type={showPwd ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)} placeholder="••••••••" style={{ paddingRight: 36 }} />
                <EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />
              </div>
            </Field>
          ))}
          {pwdMsg.text && <InlineAlert type={pwdMsg.type} msg={pwdMsg.text} />}
          <button onClick={changePassword} disabled={pwdSaving} className="btn-primary" style={{ width: 'fit-content', gap: 8 }}>
            {pwdSaving ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> {t('changing') || 'Changing...'}</> : <><KeyRound style={{ width: 15, height: 15 }} /> {t('changePassword') || 'Change Password'}</>}
          </button>
        </div>
      </Section>

      {/* Preferences Section */}
      <Section title={t('alertPreferences') || 'Alert Preferences'} subtitle={t('alertPreferencesSub') || 'Customize how you receive alerts'} icon={Bell}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('preferredLanguage') || 'Preferred Language'} icon={Globe}>
            <select className="input-field" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
              <option value="tamil">Tamil</option>
              <option value="telugu">Telugu</option>
            </select>
          </Field>
          <Field label={t('alertZone') || 'Alert Zone'} icon={MapIcon}>
            <div className="flex gap-2">
              <input 
                type="text" 
                className="input-field flex-1" 
                value={zone} 
                onChange={e => setZone(e.target.value)} 
                placeholder={t('zonePlaceholder') || "e.g. Mumbai, Delhi NCR"}
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
            
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              {t('zoneHelp') || 'Critical alerts will be filtered based on this zone.'}
              {lat && <span> (📍 {lat.toFixed(4)}, {lng.toFixed(4)})</span>}
            </p>
          </Field>

          {showMapPicker && (
            <MapZonePicker 
              value={zone} 
              onChange={(v, coords) => {
                setZone(v);
                setLat(coords?.lat);
                setLng(coords?.lng);
              }} 
              onClose={() => setShowMapPicker(false)} 
            />
          )}
          <Field label={t('smsNotifications') || 'SMS Notifications'} icon={Smartphone}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <input type="checkbox" checked={smsActive} onChange={e => setSmsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t('receiveSms') || 'Receive critical alerts via SMS'}</span>
            </label>
          </Field>
          {prefMsg.text && <InlineAlert type={prefMsg.type} msg={prefMsg.text} />}
          <button onClick={savePreferences} disabled={prefSaving} className="btn-primary" style={{ width: 'fit-content', gap: 8 }}>
            {prefSaving ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> {t('saving') || 'Saving...'}</> : <><Save style={{ width: 15, height: 15 }} /> {t('savePreferences') || 'Save Preferences'}</>}
          </button>
        </div>
      </Section>

      {/* Emergency Contact */}
      <Section 
        title={t('emergencyContact') || 'Emergency Contact'} 
        subtitle={t('emergencyContactSub') || 'Add a trusted contact to receive your critical alerts'} 
        icon={Phone}
      >
        <div style={{ 
          background: 'rgba(59,130,246,0.05)', 
          border: '1px dashed var(--accent)', 
          borderRadius: 12, 
          padding: 16,
          marginBottom: 16
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity style={{ width: 14, height: 14 }} /> {t('highPriorityFeature') || 'Critical Safety Feature'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t('emergencyContactDesc') || 'Register a trusted person (e.g., Mom, Spouse). They will be automatically notified via SMS whenever a CRITICAL alert is issued in your zone.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label={t('contactName') || 'Contact Name'} icon={User}>
            <input className="input-field" value={emName} onChange={e => setEmName(e.target.value)} placeholder="e.g. Mom" />
          </Field>
          <Field label={t('contactMobile') || 'Contact Mobile Number'} icon={Smartphone}>
            <input className="input-field" value={emPhone} onChange={e => setEmPhone(e.target.value)} placeholder="e.g. 98765 43210" />
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{t('contactMobileHint') || 'Format: 10 digits. We will automatically add +91.'}</p>
          </Field>
          {emMsg.text && <InlineAlert type={emMsg.type} msg={emMsg.text} />}
          <button onClick={saveEmergencyContact} disabled={emSaving} className="btn-primary" style={{ width: '100%', height: 44, gap: 8, marginTop: 4 }}>
            {emSaving ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Adding...</> : <><Save style={{ width: 15, height: 15 }} /> {t('saveEmergencyContact') || 'Add Emergency Contact'}</>}
          </button>
        </div>
      </Section>

      {/* Danger Zone */}
      <Section title={t('sessionSignOut') || 'Session'} subtitle={t('signOutSub') || 'Sign out from this device'} icon={LogOut}>
        <button onClick={handleLogout} className="btn-secondary" style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#ef4444', gap: 8 }}>
          <LogOut style={{ width: 15, height: 15 }} /> Sign Out
        </button>
      </Section>
    </div>
  );
}
