import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, PenSquare, CheckCircle2, ScrollText, LogOut,
  Menu, X, Sun, Moon, Globe, ChevronDown, Users, BookTemplate, Map as MapIcon, Play,
  Zap,
  BookOpen
} from 'lucide-react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardPage   from './pages/DashboardPage';
import ComposerPage    from './pages/ComposerPage';
import ApprovalPage    from './pages/ApprovalPage';
import AuditLogPage    from './pages/AuditLogPage';
import LoginPage       from './pages/LoginPage';
import TemplatesPage   from './pages/TemplatesPage';
import RecipientsPage  from './pages/RecipientsPage';
import ProfilePage     from './pages/ProfilePage';
import MapPage         from './pages/MapPage';
import SimulationPage  from './pages/SimulationPage';
import NotificationsPage from './pages/NotificationsPage';
import EvacuationPage from './pages/EvacuationPage';
import FamilyPage     from './pages/FamilyPage';
import StatsPage      from './pages/StatsPage';
import SettingsPage   from './pages/SettingsPage';
import SurvivalGuidePage from './pages/SurvivalGuidePage';
import SOSResponsePage from './pages/SOSResponsePage';
import UserNotificationBar from './components/UserNotificationBar';

const APP_BRAND = 'UACS';

const NAV_ITEMS = [
  { path: '/dashboard',  labelKey: 'dashboard',  icon: LayoutDashboard, roles: ['admin', 'user'] },
  { path: '/survival',   labelKey: 'survivalGuide', icon: BookOpen,        roles: ['user'] },
  { path: '/history',    labelKey: 'history',    icon: ScrollText,      roles: ['user'] },
  { path: '/evacuation', labelKey: 'evacuation', icon: MapIcon,            roles: ['user'] },
  { path: '/map',        labelKey: 'map',         icon: MapIcon,             roles: ['user'] },
  { path: '/family',     labelKey: 'family',     icon: Users,           roles: ['user'] },
  { path: '/settings',   labelKey: 'settings',   icon: Globe,           roles: ['user'] },
  
  // Admin Only
  { path: '/admin/simulation', labelKey: 'simulation', icon: Play,        roles: ['admin'] },
  { path: '/templates',  labelKey: 'templates',   icon: BookTemplate,    roles: ['admin'] },
  { path: '/compose',    labelKey: 'compose',     icon: PenSquare,       roles: ['admin'] },
  { path: '/approval',   labelKey: 'approval',    icon: CheckCircle2,    roles: ['admin'] },
  { path: '/recipients', labelKey: 'recipients',  icon: Users,           roles: ['admin'] },
  { path: '/audit',      labelKey: 'auditLog',    icon: ScrollText,      roles: ['admin'] },
  { path: '/sos-center', labelKey: 'sosCenter',   icon: Zap,    roles: ['admin'] },
];

/* ── Language Switcher ─────────────────────────────── */
function LanguageSwitcher() {
  const { language, setLanguage, LANGUAGES } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="theme-toggle"
        style={{ width: 'auto', padding: '0 10px', gap: '4px', flexShrink: 0 }}
        aria-label="Switch language"
      >
        <Globe style={{ width: '14px', height: '14px', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', lineHeight: 1 }}>{current.flag}</span>
        <ChevronDown style={{ width: '12px', height: '12px', flexShrink: 0 }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 py-1 rounded-lg z-[9999] animate-fade-in"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '150px',
          }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 14px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: language === l.code ? 'var(--accent-bg)' : 'transparent',
                color: language === l.code ? 'var(--accent)' : 'var(--text-primary)',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── App Layout ───────────────────────────────────── */
function AppLayout() {
  const { user, setUser }             = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate                      = useNavigate();
  const { theme, toggleTheme }        = useTheme();
  const { t }                         = useLanguage();
  const location                      = useLocation();
  const isSimulation                  = location.pathname === '/admin/simulation';

  useEffect(() => {
    if (!user) { navigate('/login'); }
  }, [user, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('uacs_token');
    localStorage.removeItem('uacs_user');
    setUser(null);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: isSimulation ? 'hidden' : 'auto' }}>

      {/* ── Mobile top bar ── */}
      {!isSimulation && (
      <header
        className="lg:hidden"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>{APP_BRAND}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <LanguageSwitcher />
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun style={{ width: '16px', height: '16px' }} /> : <Moon style={{ width: '16px', height: '16px' }} />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '4px', borderRadius: '6px' }}
          >
            {sidebarOpen ? <X style={{ width: '22px', height: '22px' }} /> : <Menu style={{ width: '22px', height: '22px' }} />}
          </button>
        </div>
      </header>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        {!isSimulation && (
          <>
          <aside
          style={{
            width: '240px',
            flexShrink: 0,
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: 200,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
            overflowY: 'auto',
          }}
          className="lg-sidebar"
        >
          {/* Sidebar header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexShrink: 0,
              minHeight: '64px',
            }}
          >
            {/* Logo block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em', lineHeight: 1.2, whiteSpace: 'nowrap' }}>{APP_BRAND}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t('unifiedComms')}
                </div>
              </div>
            </div>

            {/* Desktop controls — always right-aligned, never wrap */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <LanguageSwitcher />
              <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
                {theme === 'dark'
                  ? <Sun style={{ width: '15px', height: '15px' }} />
                  : <Moon style={{ width: '15px', height: '15px' }} />}
              </button>
            </div>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
            {console.log('Rendering Sidebar for role:', user?.role, 'Items:', NAV_ITEMS.filter(item => item.roles.includes(user?.role?.toLowerCase() || 'admin')))}
            {NAV_ITEMS.filter(item => item.roles.includes(user?.role?.toLowerCase() || 'admin')).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  marginBottom: '2px',
                  background: isActive ? 'var(--accent-bg)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                })}
              >
                <item.icon style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          {/* User footer */}
          <div style={{ padding: '12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-hover)', cursor: 'pointer' }}
              onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
              title="My Profile & Settings"
            >
              <div
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0,
                }}
              >
                {user.name?.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </div>
                <span
                  style={{
                    fontSize: '10px', letterSpacing: '0.05em', fontWeight: 700,
                    textTransform: 'uppercase', background: 'rgba(59,130,246,0.2)',
                    color: '#60a5fa', padding: '1px 6px', borderRadius: '999px', display: 'inline-block',
                  }}
                >
                  {user.role || 'admin'}
                </span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="theme-toggle" style={{ width: '30px', height: '30px', flexShrink: 0 }} title={t('logout')}>
                <LogOut style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          </div>
        </aside>
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.5)' }}
            className="lg:hidden"
          />
        )}
        </>
      )}

        {/* ── Main content ── */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            /* On desktop, offset by sidebar width */
          }}
          className="main-with-sidebar"
        >
          <div style={{ 
            padding: isSimulation ? '0' : '24px 20px', 
            maxWidth: isSimulation ? 'none' : '1280px', 
            margin: '0 auto',
            width: '100%',
            height: isSimulation ? '100vh' : 'auto'
          }}>
            {user?.role?.toLowerCase() === 'user' && !isSimulation && <UserNotificationBar user={user} />}
            <Routes>
              <Route path="/dashboard"    element={<DashboardPage />} />
              <Route path="/survival"     element={<SurvivalGuidePage />} />
              <Route path="/history"      element={<NotificationsPage />} />
              <Route path="/evacuation"   element={<EvacuationPage />} />
              <Route path="/family"       element={<FamilyPage />} />
              <Route path="/settings"     element={<SettingsPage />} />
              
              <Route path="/templates"    element={user?.role?.toLowerCase() === 'admin' ? <TemplatesPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/compose"      element={user?.role?.toLowerCase() === 'admin' ? <ComposerPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/approval"     element={user?.role?.toLowerCase() === 'admin' ? <ApprovalPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/approval/:id" element={user?.role?.toLowerCase() === 'admin' ? <ApprovalPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/recipients"   element={user?.role?.toLowerCase() === 'admin' ? <RecipientsPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/audit"        element={user?.role?.toLowerCase() === 'admin' ? <AuditLogPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/admin/simulation" element={user?.role?.toLowerCase() === 'admin' ? <SimulationPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/sos-center" element={user?.role?.toLowerCase() === 'admin' ? <SOSResponsePage /> : <Navigate to="/dashboard" replace />} />
              <Route path="/profile"      element={<ProfilePage />} />
              <Route path="/map"          element={user?.role?.toLowerCase() === 'user' ? <MapPage /> : <Navigate to="/dashboard" replace />} />
              <Route path="*"             element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-surface)', color: 'var(--text-primary)',
                  border: '1px solid var(--border)', borderRadius: '12px',
                  fontSize: '14px', boxShadow: 'var(--shadow-md)',
                },
                success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*"     element={<AppLayout />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </LanguageProvider>
  );
}
