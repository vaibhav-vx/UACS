import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, Loader2, AlertCircle, Sun, Moon, Globe, ChevronDown, 
  User, Smartphone, LogIn, UserPlus, CheckCircle2, MapPin
} from 'lucide-react';
import { authApi } from '../api';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { detectZone } from '../utils/zoneMapper';
import MapZonePicker from '../components/MapZonePicker';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const REG_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी (Marathi)', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ் (Tamil)', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు (Telugu)', flag: '🇮🇳' },
];

// ── Input field component ─────────────────────────────────
function Field({ id, label, icon: Icon, type = 'text', value, onChange, placeholder, autoFocus, autoComplete, rightEl, hint }) {
  return (
    <div className="space-y-1.5 text-left">
      <label htmlFor={id} className="block text-xs font-bold text-theme-muted uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <Icon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-10 py-3 bg-theme-hover border border-theme-border rounded-xl text-sm font-medium placeholder-theme-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
        />
        {rightEl}
      </div>
      {hint && <p className="text-[10px] text-theme-muted leading-relaxed">{hint}</p>}
    </div>
  );
}

// ── Password strength bar ─────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const textColor = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500'];
  const label  = labels[strength - 1] || 'Too short';
  const colorClass  = colors[strength - 1] || 'bg-red-500';
  const textClass = textColor[strength - 1] || 'text-red-500';

  return (
    <div className="mt-2.5 space-y-1 text-left">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= strength ? colorClass : 'bg-theme-border'}`} />
        ))}
      </div>
      <p className={`text-[10px] font-bold ${textClass}`}>{label}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function LoginPage() {
  const [tab, setTab] = useState('login');   // 'login' | 'register'

  // Login state
  const [loginPhone, setLoginPhone]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd]   = useState(false);
  const [loginLoading, setLoginLoading]   = useState(false);
  const [loginError, setLoginError]       = useState('');

  // Register state
  const [regName, setRegName]             = useState('');
  const [regPhone, setRegPhone]           = useState('');
  const [regDept, setRegDept]             = useState('');
  const [regPassword, setRegPassword]     = useState('');
  const [regConfirm, setRegConfirm]       = useState('');
  const [showRegPwd, setShowRegPwd]       = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [regLoading, setRegLoading]       = useState(false);
  const [regError, setRegError]           = useState('');
  const [regSuccess, setRegSuccess]       = useState(false);
  const [regLat, setRegLat]               = useState(null);
  const [regLng, setRegLng]               = useState(null);
  const [regLanguage, setRegLanguage]     = useState('en');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [zonePreview, setZonePreview]     = useState(null);
  const debounceRef = useRef(null);

  // Debounced zone preview from location text
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (regDept.trim() || regLat) {
        const detected = detectZone(regDept.trim(), regLat, regLng);
        setZonePreview(detected);
      } else {
        setZonePreview(null);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [regDept, regLat, regLng]);

  // Password validation
  const isPasswordValid = regPassword.length >= 8;
  const passwordsMatch = regConfirm.length > 0 && regPassword === regConfirm;
  const canSubmitReg = regName.trim().length >= 2 && regPhone.trim().length >= 10 && isPasswordValid && passwordsMatch;
  const [langOpen, setLangOpen]           = useState(false);
  const navigate                          = useNavigate();
  const [searchParams]                    = useSearchParams();
  const { theme, toggleTheme }            = useTheme();
  const { t, language, setLanguage, LANGUAGES } = useLanguage();
  const curLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const { user }                          = useAuth();

  useEffect(() => {
    if (user) { navigate('/dashboard'); return; }
    if (searchParams.get('expired') === '1') setLoginError(t('sessionExpired') || 'Your session has expired. Please log in again.');
  }, [navigate, searchParams, t, user]);

  // Phone auto-formatter (XXXXX XXXXX) — only for registration
  const formatPhoneNumber = (value) => {
    const cleaned = ('' + value).replace(/\D/g, '').substring(0, 10);
    const match = cleaned.match(/^(\d{1,5})(\d{0,5})$/);
    if (match) {
      return match[2] ? `${match[1]} ${match[2]}` : match[1];
    }
    return cleaned;
  };

  const handleLoginPhoneChange = (e) => {
    const val = e.target.value;
    // If it contains letters or @, don't format it as a phone number
    if (/[a-zA-Z@]/.test(val)) {
      setLoginPhone(val);
    } else {
      setLoginPhone(formatPhoneNumber(val));
    }
    setLoginError('');
  };

  // ── Login handler ─────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginPhone.trim()) { setLoginError('Mobile number is required'); return; }
    if (!loginPassword)     { setLoginError('Password is required'); return; }
    setLoginLoading(true);
    try {
      const res = await authApi.login(loginPhone.trim(), loginPassword);
      localStorage.setItem('uacs_token', res.data.token);
      localStorage.setItem('uacs_user', JSON.stringify(res.data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Invalid mobile or password');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register handler ──────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    if (regName.trim().length < 2) { setRegError('Name must be at least 2 characters'); return; }
    if (regPhone.replace(/\D/g, '').length < 10) { setRegError('Valid 10-digit mobile number is required'); return; }
    if (regPassword.length < 8) { setRegError('Password must be at least 8 characters'); return; }
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }

    setRegLoading(true);
    try {
      const res = await authApi.register({ 
        name: regName.trim(), 
        phone: regPhone.trim(), 
        password: regPassword, 
        location: regDept.trim(),
        latitude: regLat,
        longitude: regLng,
        language: regLanguage,
      });
      toast.success(t('regSuccess') || 'Registration successful!');
      localStorage.setItem('uacs_token', res.data.token);
      localStorage.setItem('uacs_user', JSON.stringify(res.data.user));
      setRegSuccess(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
    } catch (err) {
      setRegError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // ── Demo Login handler ────────────────────────────────
  const handleDemoLogin = async () => {
    setRegError('');
    setRegLoading(true);
    try {
      const res = await authApi.demo();
      localStorage.setItem('uacs_token', res.data.token);
      localStorage.setItem('uacs_user', JSON.stringify(res.data.user));
      toast.success(t('demoLoginSuccess') || 'Welcome to Demo Portal');
      window.location.href = '/dashboard';
    } catch (err) {
      setRegError(err.response?.data?.error || 'Failed to login as Demo User');
      setRegLoading(false);
    }
  };

  const EyeBtn = ({ show, toggle }) => (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer text-theme-muted p-1 flex items-center hover:text-theme-primary transition-colors"
    >
      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-theme-base overflow-hidden">
      
      {/* ── Figma style flow path design background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none opacity-25 dark:opacity-40 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--bg-base)_80%)] z-10" />
        <svg className="w-full h-full min-w-[1440px] opacity-70" viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="flow-line-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--border)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="flow-line-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--border)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Flows */}
          <path d="M -100 200 C 300 80, 500 580, 900 280 C 1100 180, 1300 480, 1600 220" stroke="url(#flow-line-grad-1)" strokeWidth="3" strokeDasharray="15, 30" className="animate-flow-line" />
          <path d="M -100 480 C 400 680, 700 180, 1000 520 C 1200 620, 1400 320, 1600 420" stroke="url(#flow-line-grad-2)" strokeWidth="2.5" strokeDasharray="20, 40" className="animate-flow-line-reverse" />
          <path d="M -100 80 C 200 280, 600 80, 800 420 C 1000 620, 1300 120, 1600 320" stroke="url(#flow-line-grad-1)" strokeWidth="1.5" strokeDasharray="10, 20" className="animate-flow-line-fast" />

          {/* Tactical Background Grid Lines */}
          <line x1="-100" y1="150" x2="1600" y2="150" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="5, 15" strokeOpacity="0.4" />
          <line x1="-100" y1="350" x2="1600" y2="350" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="5, 15" strokeOpacity="0.4" />
          <line x1="-100" y1="550" x2="1600" y2="550" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="5, 15" strokeOpacity="0.4" />
          <path d="M 150 0 L 150 800 M 350 0 L 350 800 M 550 0 L 550 800 M 750 0 L 750 800 M 950 0 L 950 800 M 1150 0 L 1150 800 M 1350 0 L 1350 800" stroke="var(--border)" strokeWidth="0.5" strokeOpacity="0.2" />
        </svg>
      </div>

      {/* Top-right: language + theme selector */}
      <div className="absolute top-5 right-5 flex items-center gap-2.5 z-50">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-theme-hover border border-theme-border rounded-xl text-xs font-bold text-theme-primary cursor-pointer hover:bg-theme-border transition-colors select-none"
            aria-label="Switch language"
          >
            <Globe className="w-3.5 h-3.5 text-theme-muted" />
            <span>{curLang.flag}</span>
            <ChevronDown className="w-3.5 h-3.5 text-theme-muted" />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1.5 min-w-[160px] rounded-xl bg-theme-surface border border-theme-border shadow-2xl z-50 overflow-hidden animate-fade-in">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-3 border-0 cursor-pointer transition-colors ${language === l.code ? 'bg-accent/15 text-accent' : 'bg-transparent text-theme-primary hover:bg-theme-hover'}`}
                >
                  <span className="text-sm leading-none">{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={toggleTheme} className="flex items-center justify-center w-9 h-9 bg-theme-hover border border-theme-border rounded-xl text-theme-muted hover:text-theme-primary hover:bg-theme-border cursor-pointer transition-colors" aria-label="Toggle theme">
          {theme === 'dark' ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[460px] z-20 animate-slide-up">
        
        {/* Tab Switcher */}
        <div className="flex bg-theme-surface/70 backdrop-blur-md p-1.5 rounded-2xl border border-theme-border mb-6">
          {[
            { key: 'login',    label: t('loginButton') || 'Sign In',    Icon: LogIn },
            { key: 'register', label: t('register') || 'Register',   Icon: UserPlus },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setLoginError(''); setRegError(''); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 border-0 cursor-pointer transition-all duration-300 ${tab === key ? 'bg-accent text-white shadow-lg shadow-accent/25' : 'bg-transparent text-theme-muted hover:text-theme-primary'}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Login Form ───────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="glass-card backdrop-blur-xl bg-theme-surface/60 border border-theme-border rounded-3xl p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-theme-primary tracking-tight">{t('welcomeBack') || 'Welcome back'}</h2>
              <p className="text-xs text-theme-muted mt-1">{t('signInToUacs') || 'Sign in to your UACS account'}</p>
            </div>

            {loginError && (
              <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-4">
              <Field
                id="login-phone"
                label={t('Mobile No.') || 'Mobile Number'}
                icon={Smartphone}
                type="text"
                value={loginPhone}
                onChange={handleLoginPhoneChange}
                placeholder="e.g. 99999 99999"
                autoFocus
              />
              <Field
                id="login-password"
                label={t('passwordLabel') || 'Password'}
                icon={Lock}
                type={showLoginPwd ? 'text' : 'password'}
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                placeholder={t('passwordLabel') || 'Enter your password'}
                autoComplete="current-password"
                rightEl={<EyeBtn show={showLoginPwd} toggle={() => setShowLoginPwd(v => !v)} />}
              />
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={loginLoading}
              className="w-full py-3.5 bg-accent hover:bg-accent/95 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loginLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('signingIn') || 'Signing in...'}</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In</>
              )}
            </button>

            <p className="text-center text-xs text-theme-muted">
              {t('dontHaveAccount') || "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setTab('register')}
                className="bg-transparent border-0 cursor-pointer text-accent font-bold text-xs p-0 hover:underline"
              >
                {t('createOne') || 'Create one'}
              </button>
            </p>
          </form>
        )}

        {/* ── Register Form ─────────────────────────────── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="glass-card backdrop-blur-xl bg-theme-surface/60 border border-theme-border rounded-3xl p-8 shadow-2xl space-y-6">
            {regSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-7 h-7 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-theme-primary">{t('accountCreated') || 'Account Created!'}</h3>
                  <p className="text-xs text-theme-muted mt-1">{t('redirecting') || 'Redirecting to dashboard...'}</p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-black text-theme-primary tracking-tight">{t('createAccount') || 'Create Your Account'}</h2>
                  <p className="text-xs text-theme-muted mt-1">{t('joinUacs') || 'Citizen Safety Portal — Register to receive zone alerts'}</p>
                </div>

                {regError && (
                  <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name & Phone Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      id="reg-name"
                      label={t('fullName') || 'Full Name'}
                      icon={User}
                      value={regName}
                      onChange={e => { setRegName(e.target.value); setRegError(''); }}
                      placeholder="e.g. Vaibhav"
                    />
                    <Field
                      id="reg-phone"
                      label={t('mobileNumber') || 'Mobile'}
                      icon={Smartphone}
                      type="tel"
                      value={regPhone}
                      onChange={e => { setRegPhone(formatPhoneNumber(e.target.value)); setRegError(''); }}
                      placeholder="e.g. 99999 99999"
                    />
                  </div>

                  {/* Location Field with Map Picker */}
                  <div className="relative">
                    <Field
                      id="reg-dept"
                      label={t('locationZone') || 'Your Location'}
                      icon={MapPin}
                      value={regDept}
                      onChange={e => { setRegDept(e.target.value); setRegError(''); }}
                      placeholder="Enter city/area"
                      hint={regLat ? `📌 Pinned: ${regLat.toFixed(4)}, ${regLng.toFixed(4)}` : t('mapHint') || 'Enter area name or pick from map'}
                      rightEl={
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          title="Pick location on map"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-[80%] px-3 bg-accent text-white border-0 rounded-lg text-sm font-bold cursor-pointer hover:bg-accent/90 flex items-center justify-center transition-colors"
                        >
                          📍
                        </button>
                      }
                    />
                    {zonePreview && (
                      <p className="text-xs text-green-500 mt-1.5 font-bold flex items-center gap-1">
                        <span>🛡️</span> Detected Zone: {zonePreview.zone} — {zonePreview.city}
                      </p>
                    )}
                  </div>

                  {showMapPicker && (
                    <MapZonePicker
                      value={regDept}
                      onChange={(val, coords) => {
                        setRegDept(val);
                        if (coords) {
                          setRegLat(coords.lat);
                          setRegLng(coords.lng);
                        }
                      }}
                      onClose={() => setShowMapPicker(false)}
                    />
                  )}

                  {/* Language Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-theme-muted uppercase tracking-wider">
                      Preferred Language
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {REG_LANGUAGES.map(l => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => setRegLanguage(l.code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all duration-200 ${regLanguage === l.code ? 'border-accent bg-accent/10 text-accent' : 'border-theme-border bg-theme-hover text-theme-muted hover:text-theme-primary'}`}
                        >
                          {l.flag} {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <Field
                      id="reg-password"
                      label={t('passwordLabel') || 'Password'}
                      icon={Lock}
                      type={showRegPwd ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => { setRegPassword(e.target.value); setRegError(''); }}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      rightEl={<EyeBtn show={showRegPwd} toggle={() => setShowRegPwd(v => !v)} />}
                    />
                    <PasswordStrength password={regPassword} />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <Field
                      id="reg-confirm"
                      label="Confirm Password"
                      icon={Lock}
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={regConfirm}
                      onChange={e => { setRegConfirm(e.target.value); setRegError(''); }}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      rightEl={<EyeBtn show={showConfirmPwd} toggle={() => setShowConfirmPwd(v => !v)} />}
                    />
                    {regConfirm.length > 0 && (
                      <p className={`text-[10px] font-bold mt-1.5 ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                        {passwordsMatch ? '✅ Passwords match' : '❌ Passwords do not match'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={regLoading || !canSubmitReg}
                    className="w-full py-3.5 bg-accent hover:bg-accent/95 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-0 cursor-pointer shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {regLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t('creatingAccount') || 'Creating Account...'}</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Create My Account</>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={regLoading}
                    className="w-full py-3.5 bg-theme-hover hover:bg-theme-border border border-theme-border text-theme-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <UserPlus className="w-4 h-4 text-theme-muted" /> {t('demoLogin') || 'Try Demo Profile'}
                  </button>
                </div>

                <p className="text-center text-xs text-theme-muted pt-2">
                  {t('alreadyHaveAccount') || 'Already have an account?'}{' '}
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="bg-transparent border-0 cursor-pointer text-accent font-bold text-xs p-0 hover:underline"
                  >
                    {t('loginButton') || 'Sign in'}
                  </button>
                </p>
              </>
            )}
          </form>
        )}

        <p className="text-center text-[10px] text-theme-muted mt-6 font-medium">
          🇮🇳 {t('govFooter') || 'Government of India • Secure Communication Portal • v1.0'}
        </p>
      </div>
    </div>
  );
}
