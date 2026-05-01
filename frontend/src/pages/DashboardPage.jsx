import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Clock, AlertTriangle, CheckCircle, Send, Timer, RefreshCw, Eye, RotateCcw, 
  Zap, TrendingUp, X, PenSquare, Map as MapIcon, Globe, Info,
  Navigation, Heart, History, BarChart3, CloudRain, Phone, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { messagesApi, authApi, recipientsApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import ExpiryTimer from '../components/ExpiryTimer';
import ChannelBadge from '../components/ChannelBadge';
import AlertBanner from '../components/AlertBanner';
import SituationMapCard from '../components/SituationMapCard';
import { EAPS, ZONE_COORDS } from '../constants';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [activeMessages, setActiveMessages]   = useState([]);
  const [expiredMessages, setExpiredMessages]  = useState([]);
  const [draftMessages, setDraftMessages]      = useState([]);
  const [stats, setStats]      = useState({ totalToday: 0, active: 0, expiringSoon: 0, expired: 0 });
  const [activeTab, setActiveTab]              = useState('active');
  const [loading, setLoading]                  = useState(true);
  const [actionLoading, setActionLoading]      = useState({});
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [safetyStats, setSafetyStats] = useState({ safe: 0, assistance: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [emergencyText, setEmergencyText] = useState('');
  const [emergencyZone, setEmergencyZone] = useState('');
  const [emergencyError, setEmergencyError] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [citizenStats, setCitizenStats] = useState({ count: 0, safeToday: 0 });
  const [sosConfirming, setSosConfirming] = useState(false);
  const [sosProgress, setSosProgress] = useState(0);
  const [expiryAlertId, setExpiryAlertId] = useState(null);
  const [manualExpiryReason, setManualExpiryReason] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!isAdmin) {
      const fetchWeather = async () => {
        try {
          const lat = user?.lat || 19.0760; // Default to Mumbai
          const lng = user?.lng || 72.8777;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,uv_index`);
          if (res.ok) {
            const data = await res.json();
            setWeatherData(data.current);
          }
        } catch (err) {
          console.error("Failed to fetch weather data", err);
        }
      };
      fetchWeather();
    }
  }, [isAdmin, user?.lat, user?.lng]);

  const fetchData = useCallback(async () => {
    try {
      const [a, e, d, s] = await Promise.all([
        messagesApi.getAll('active'),
        messagesApi.getAll('expired'),
        messagesApi.getAll('draft'),
        messagesApi.getStats(),
      ]);
      setActiveMessages(a.data);
      setExpiredMessages(e.data);
      setDraftMessages(d.data);
      setStats(s.data);
      setLastRefresh(new Date());

      if (isAdmin) {
        const [safStats, safRecent] = await Promise.all([
          messagesApi.getSafetyStats(),
          messagesApi.getRecentSafety(),
        ]);
        setSafetyStats(safStats.data);
        setRecentReports(safRecent.data);
      } else {
        const userZone = user?.zone || user?.department || 'General';
        const [rec, saf] = await Promise.all([
          recipientsApi.getAll(userZone),
          messagesApi.getSafetyStats()
        ]);
        setCitizenStats({
          count: rec.data.length,
          safeToday: saf.data.safe || 0
        });
      }
    } catch (err) {
      console.error('[DASHBOARD] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user?.zone]);

  useEffect(() => { 
    fetchData(); 
    const iv = setInterval(fetchData, 30000); 
    return () => clearInterval(iv); 
  }, [fetchData]);

  const handleExpireNow = async (id, reason = '') => {
    setActionLoading(p => ({ ...p, [`e-${id}`]: true }));
    try { 
      await messagesApi.expire(id, reason); 
      toast.success(t('messageExpired') || 'Message expired'); 
      setExpiryAlertId(null);
      setManualExpiryReason('');
      fetchData(); 
    } catch (err) { 
      toast.error(t('failedExpire') || 'Failed to expire'); 
    } finally { 
      setActionLoading(p => ({ ...p, [`e-${id}`]: false })); 
    }
  };

  const handleExtend = async (id) => {
    setActionLoading(p => ({ ...p, [`x-${id}`]: true }));
    try { 
      await messagesApi.extend(id, new Date(Date.now() + 86400000).toISOString()); 
      toast.success(t('extendedBy24') || 'Extended by 24h'); 
      fetchData(); 
    } catch { 
      toast.error(t('failedExtend') || 'Failed to extend'); 
    } finally { 
      setActionLoading(p => ({ ...p, [`x-${id}`]: false })); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this message? This cannot be undone.')) return;
    setActionLoading(p => ({ ...p, [`d-${id}`]: true }));
    try { 
      await messagesApi.delete(id); 
      toast.success('Message deleted'); 
      fetchData(); 
    } catch { 
      toast.error('Failed to delete message'); 
    } finally { 
      setActionLoading(p => ({ ...p, [`d-${id}`]: false })); 
    }
  };

  const handleSOS = async () => {
    setEmergencyLoading(true);
    try {
      await messagesApi.submitDirectSafety();
      toast.error("EMERGENCY SIGNAL SENT. Help is being dispatched to your location.", {
        duration: 10000,
        style: { background: '#ef4444', color: '#fff', fontWeight: 'bold' }
      });
      fetchData();
    } catch (err) {
      toast.error("Failed to send SOS signal");
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleEmergencySubmit = async () => {
    if (!emergencyText.trim() || !emergencyZone.trim()) {
      setEmergencyError('Both message and target zone are required');
      return;
    }
    setEmergencyError('');
    setEmergencyLoading(true);
    try {
      await messagesApi.emergency({ master_content: emergencyText, target_zone: emergencyZone });
      setIsEmergencyModalOpen(false);
      setEmergencyText('');
      setEmergencyZone('');
      toast.success(t('emergencySent') || '🚨 Emergency broadcast sent to all channels');
      fetchData();
    } catch (err) {
      setEmergencyError(err.response?.data?.error || err.message);
    } finally {
      setEmergencyLoading(false);
    }
  };

  const Stat = ({ icon: Icon, label, value, color, trend }) => (
    <div className="stat-card animate-slide-up">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-medium text-theme-muted">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {trend && <div className="text-[10px] text-green-500 mt-1">{trend}</div>}
    </div>
  );

  if (loading) return (<div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="glass-card p-5 h-24 shimmer rounded-xl"/>)}</div><div className="space-y-3">{[1,2,3].map(i=><div key={i} className="glass-card p-6 h-32 shimmer rounded-xl"/>)}</div></div>);

  if (!isAdmin) {
    const userZone = user?.zone || user?.department || 'General';
    const userPhone = user?.phone || user?.email || 'Not Provided';
    const userLang = user?.language || 'en';
    const userCity = user?.city || (userZone.match(/—\s*(.*)/) ? userZone.match(/—\s*(.*)/)[1] : userZone);
    const userCoords = user?.lat && user?.lng ? `${Number(user.lat).toFixed(4)}, ${Number(user.lng).toFixed(4)}` : 'GPS Not Synced';
    
    // Improved logic for identifying myAlerts vs nearbyAlerts
    const zoneNumberMatch = userZone.match(/Zone (\d+)/);

    const myAlerts = activeMessages.filter(msg => {
      if (!msg.target_zone || msg.target_zone === 'All Zones' || msg.target_zone === 'General') return true;
      const tz = msg.target_zone;
      return tz.includes(userZone) || (zoneNumberMatch && tz.includes(`Zone ${zoneNumberMatch[1]}`)) || (userCity && tz.toLowerCase().includes(userCity.toLowerCase()));
    });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Determine dynamic weather alert or text
    let weatherTitle = "Current Weather";
    let weatherEmoji = "☀️";
    let weatherAlert = null;
    
    if (weatherData) {
      const { temperature_2m, weather_code, uv_index } = weatherData;
      if (weather_code === 0) { weatherEmoji = '☀️'; weatherTitle = 'Clear Sky'; }
      else if (weather_code >= 1 && weather_code <= 3) { weatherEmoji = '⛅'; weatherTitle = 'Partly Cloudy'; }
      else if (weather_code === 45 || weather_code === 48) { weatherEmoji = '🌫️'; weatherTitle = 'Foggy'; }
      else if (weather_code >= 51 && weather_code <= 65) { weatherEmoji = '🌧️'; weatherTitle = 'Rain'; }
      else if (weather_code >= 71 && weather_code <= 75) { weatherEmoji = '❄️'; weatherTitle = 'Snow'; }
      else if (weather_code >= 80 && weather_code <= 82) { weatherEmoji = '🌦️'; weatherTitle = 'Showers'; }
      else if (weather_code >= 95) { weatherEmoji = '🌩️'; weatherTitle = 'Thunderstorm'; }
      
      if (temperature_2m >= 38) {
        weatherTitle = "Severe Heatwave";
        weatherEmoji = "🥵";
        weatherAlert = "⚠️ High risk of dehydration";
      } else if (uv_index >= 8) {
        weatherAlert = "⚠️ Extreme UV — Use Sunscreen";
      } else if (weather_code >= 95) {
        weatherAlert = "⚠️ Lightning Risk — Stay Indoors";
      } else if (weather_code >= 61 && weather_code <= 65) {
        weatherAlert = "⚠️ Heavy Rain Warning";
      }
    }

    return (
      <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
        {/* User Greeting & LIVE Indicator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">{greeting}, {user?.name || 'Citizen'} 👋</h1>
            <p className="text-sm font-bold text-theme-muted mt-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-theme-secondary" /> {userPhone}
              <span className="opacity-30">|</span>
              <Globe className="w-4 h-4 text-theme-secondary" /> {userLang.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-bold text-green-500 tracking-widest uppercase">LIVE</span>
            <span className="text-[10px] text-theme-dim ml-2 border-l border-theme-border pl-2">Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Modern Synced Dashboard Profile Header */}
        <div className="glass-card p-8 rounded-3xl relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-theme-surface to-accent/5">
          <div style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--accent-bg))', opacity: 0.3, pointerEvents: 'none' }} />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent text-3xl font-black shadow-inner border-4 border-accent/10">
                {(user?.name || 'C').charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight">{userCity} ({zoneNumberMatch ? `Zone ${zoneNumberMatch[1]}` : userZone})</h1>
                  <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase border border-green-500/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Area Synced
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-theme-muted">
                  <span className="flex items-center gap-1.5 text-accent"><MapIcon className="w-3.5 h-3.5" /> Recipient Registry Profile</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-theme-surface/50 p-4 rounded-2xl border border-theme-border backdrop-blur-sm">
               <div className="space-y-1">
                 <div className="text-[10px] uppercase font-black tracking-widest text-theme-muted">GPS Coordinates</div>
                 <div className="font-mono text-sm font-bold text-theme-primary">{userCoords}</div>
               </div>
               <div className="h-8 w-px bg-theme-border mx-2"></div>
               <div className="space-y-1">
                 <div className="text-[10px] uppercase font-black tracking-widest text-theme-muted">Hold For SOS</div>
                 <button 
                   onMouseDown={() => {
                      setSosConfirming(true);
                      const start = Date.now();
                      const timer = setInterval(() => {
                         const p = Math.min(((Date.now() - start) / 3000) * 100, 100);
                         setSosProgress(p);
                         if (p >= 100) { clearInterval(timer); setSosConfirming(false); setSosProgress(0); handleSOS(); }
                      }, 50);
                      const endHandler = () => { clearInterval(timer); setSosConfirming(false); setSosProgress(0); window.removeEventListener('mouseup', endHandler); };
                      window.addEventListener('mouseup', endHandler);
                   }}
                   className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden ${sosConfirming ? 'scale-110 shadow-lg shadow-red-500/50' : 'hover:scale-105'} bg-red-600 text-white mx-auto`}
                 >
                   <div className="absolute bottom-0 left-0 w-full bg-red-800 transition-all" style={{ height: `${sosProgress}%`, opacity: 0.5 }} />
                   <Zap className={`relative z-10 w-5 h-5 ${sosConfirming ? 'animate-pulse' : ''}`} />
                 </button>
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             {/* ALERTS SECTION */}
             <section className="space-y-4">
               <h2 className="text-xl font-bold flex items-center gap-3">
                 <Zap className="w-6 h-6 text-red-500 fill-red-500/20" />
                 {t('yourActiveAlerts') || 'YOUR ACTIVE ALERTS'} ({myAlerts.length})
               </h2>

               {myAlerts.length === 0 ? (
                  <div className="glass-card p-12 text-center rounded-3xl border-dashed border-2 bg-theme-surface/50">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                    <h3 className="text-xl font-black mb-2">{`✅ All Clear in ${userCity}`}</h3>
                    <p className="text-sm text-theme-muted">{t('noActiveZoneAlerts') || `No active alerts in ${userCity}`}</p>
                  </div>
               ) : (
                 <div className="grid gap-6">
                    {myAlerts.map((msg) => {
                      // Dynamic Timer & Color Logic
                      let countdownColor = 'text-green-500';
                      let timerBg = 'bg-green-500/10 border-green-500/20';
                      let timerLabel = 'ACTIVE';
                      
                      if (msg.expires_at) {
                         const diff = new Date(msg.expires_at).getTime() - Date.now();
                         if (diff < 0) {
                           countdownColor = 'text-theme-muted'; timerBg = 'bg-theme-hover border-theme-border'; timerLabel = 'EXPIRED';
                         } else if (diff < 3600000) {
                           // Less than 1 hour: RED
                           countdownColor = 'text-red-500 animate-pulse'; timerBg = 'bg-red-500/10 border-red-500/20';
                           timerLabel = `${Math.floor(diff/60000)}m left`;
                         } else if (diff < 7200000) {
                           // Less than 2 hours: YELLOW
                           countdownColor = 'text-yellow-500'; timerBg = 'bg-yellow-500/10 border-yellow-500/20';
                           timerLabel = `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`;
                         } else {
                           // More than 2 hours: GREEN
                           countdownColor = 'text-green-500'; timerBg = 'bg-green-500/10 border-green-500/20';
                           timerLabel = `${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}m`;
                         }
                      }
                      
                      return (
                      <div key={msg.id} className="glass-card overflow-hidden rounded-3xl border-0 shadow-lg group hover:shadow-2xl transition-all duration-300">
                        <div style={{ height: 6, background: msg.urgency === 'critical' ? '#ef4444' : '#facc15' }} />
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${msg.urgency === 'critical' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]'}`}>
                                {msg.urgency}
                              </span>
                              <h3 className="font-bold text-xl">{msg.title}</h3>
                            </div>
                            
                            <div className={`px-3 py-1.5 rounded-xl text-sm font-mono font-bold border ${timerBg} ${countdownColor} flex items-center gap-2 shadow-inner`}>
                              <Clock className="w-4 h-4" /> {timerLabel}
                            </div>
                          </div>
                          
                          <p className="text-lg leading-relaxed text-theme-primary mb-6 whitespace-pre-wrap">{msg.master_content}</p>

                          {msg.urgency === 'critical' && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 mb-2 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-5"><AlertTriangle className="w-32 h-32 text-red-500" /></div>
                              <h4 className="font-bold text-red-500 text-lg mb-4 flex items-center gap-2 relative z-10">
                                <AlertTriangle className="w-5 h-5" /> Safety Check-in Required
                              </h4>
                              <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                                <button 
                                  disabled={actionLoading[`safe-${msg.id}`]}
                                  onClick={async () => {
                                    setActionLoading(p => ({ ...p, [`safe-${msg.id}`]: true }));
                                    try {
                                      await messagesApi.submitSafety(msg.id, 'safe', { lat: user?.lat, lng: user?.lng });
                                      localStorage.setItem(`safety_${msg.id}_${user?.id}`, 'safe');
                                      toast.success("✅ Marked Safe successfully!");
                                      fetchData();
                                    } catch (e) { toast.error("Failed to submit"); }
                                    finally { setActionLoading(p => ({ ...p, [`safe-${msg.id}`]: false })); }
                                  }}
                                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                >
                                  {actionLoading[`safe-${msg.id}`] ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> YES, I AM SAFE</>}
                                </button>
                                <button 
                                  disabled={actionLoading[`sos-${msg.id}`]}
                                  onClick={async () => {
                                    setActionLoading(p => ({ ...p, [`sos-${msg.id}`]: true }));
                                    try {
                                      await messagesApi.submitSafety(msg.id, 'assistance', { lat: user?.lat, lng: user?.lng });
                                      localStorage.setItem(`safety_${msg.id}_${user?.id}`, 'need_help');
                                      toast.error("🆘 Help requested. Authorities notified.", { duration: 6000 });
                                      fetchData();
                                    } catch (e) { toast.error("Failed to submit SOS"); }
                                    finally { setActionLoading(p => ({ ...p, [`sos-${msg.id}`]: false })); }
                                  }}
                                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                >
                                  {actionLoading[`sos-${msg.id}`] ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><AlertTriangle className="w-5 h-5" /> SOS: I NEED HELP</>}
                                </button>
                              </div>
                            </div>
                          )}
                          {localStorage.getItem(`safety_${msg.id}_${user?.id}`) && (
                            <div className="mt-4 p-4 rounded-xl bg-theme-surface border border-theme-border flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {localStorage.getItem(`safety_${msg.id}_${user?.id}`) === 'safe' 
                                  ? <><CheckCircle className="w-6 h-6 text-green-500" /> <span className="text-sm font-black text-green-500">✅ Safety Confirmed at {userCoords}</span></>
                                  : <><AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" /> <span className="text-sm font-black text-red-500">🆘 Emergency Assistance Requested</span></>
                                }
                              </div>
                              <div className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">{new Date().toLocaleTimeString()}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )})}
                 </div>
               )}
             </section>
          </div>

          <div className="space-y-8">
            {/* LIVE WEATHER WIDGET */}
            <section className={`glass-card p-6 rounded-3xl border-0 shadow-xl relative overflow-hidden ${weatherAlert ? 'bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20' : 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20'}`}>
               <div className="absolute top-0 right-0 p-2 opacity-20"><Globe className={`w-24 h-24 ${weatherAlert ? 'text-orange-500' : 'text-blue-500'}`} /></div>
               <div className="flex items-start gap-4 mb-4 relative z-10">
                  <div className={`text-4xl animate-pulse mt-1 drop-shadow-[0_0_10px_rgba(${weatherAlert ? '249,115,22' : '59,130,246'},0.5)]`}>{weatherEmoji}</div>
                  <div>
                     <h3 className={`text-xl font-black leading-tight ${weatherAlert ? 'text-orange-600' : 'text-blue-600'}`}>{weatherTitle}<br/><span className="text-theme-primary">{userCity || 'Your City'}</span></h3>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-3 text-xs font-bold text-theme-muted mb-4 relative z-10">
                  <div className="p-3 bg-theme-surface/80 backdrop-blur-sm rounded-xl border border-theme-border shadow-inner">Temp: <span className="text-theme-primary text-sm block font-black">{weatherData ? `${weatherData.temperature_2m}°C` : '--°C'}</span></div>
                  <div className="p-3 bg-theme-surface/80 backdrop-blur-sm rounded-xl border border-theme-border shadow-inner">Humidity: <span className="text-theme-primary text-sm block font-black">{weatherData ? `${weatherData.relative_humidity_2m}%` : '--%'}</span></div>
                  <div className={`p-3 backdrop-blur-sm rounded-xl col-span-2 shadow-inner ${weatherData?.uv_index >= 8 ? 'bg-red-500/10 border-red-500/20' : 'bg-theme-surface/80 border-theme-border'}`}>
                    UV Index: <span className={`text-sm block font-black ${weatherData?.uv_index >= 8 ? 'text-red-500' : 'text-theme-primary'}`}>{weatherData ? weatherData.uv_index : '--'} {weatherData?.uv_index >= 8 ? '(Extreme)' : ''}</span>
                  </div>
               </div>
               {weatherAlert && (
                 <div className="w-full px-4 py-3 rounded-xl bg-red-500 text-white font-black text-[10px] text-center uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] relative z-10">
                   {weatherAlert}
                 </div>
               )}
            </section>

            {/* NEARBY SAFETY HUBS */}
            <section className="glass-card p-6 rounded-3xl border-0 shadow-xl bg-accent/5">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <MapIcon className="w-5 h-5 text-accent" /> {t('nearbySafetyHubs') || 'Nearby Safety Hubs'}
               </h2>
               <div className="space-y-3">
                  {EAPS.slice(0, 3).map((eap, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-theme-surface/50 backdrop-blur-sm border border-theme-border hover:border-accent/50 transition-all cursor-pointer group shadow-sm hover:shadow-lg">
                       <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-sm group-hover:text-accent transition-colors">{eap.name}</h4>
                          <span className="text-[10px] font-black text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">Active</span>
                       </div>
                       <p className="text-[10px] text-theme-muted mb-3 font-medium">{eap.type} • Capacity: {eap.capacity}</p>
                       <button 
                         onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${eap.pos[0]},${eap.pos[1]}`, '_blank')}
                         className="w-full py-2 bg-theme-hover border border-theme-border rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-accent hover:border-accent hover:text-white transition-all"
                       >
                         <Navigation className="w-3.5 h-3.5" /> {t('getDirections') || 'GET DIRECTIONS'}
                       </button>
                    </div>
                  ))}
               </div>
               <button onClick={() => navigate('/map')} className="w-full mt-4 py-3 rounded-xl bg-theme-hover border border-theme-border text-xs font-bold text-theme-primary hover:text-accent hover:border-accent/50 flex items-center justify-center gap-2 transition-all">
                 {t('viewAllOnMap') || 'View all on map'} →
               </button>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {isAdmin && (
        <div className="animate-slide-up">
          {showMap ? (
            <div className="relative">
              <SituationMapCard />
              <button 
                onClick={() => setShowMap(false)}
                className="absolute top-4 right-4 z-[1000] p-2 bg-red-600 text-white rounded-xl shadow-xl hover:bg-red-700 transition-all flex items-center gap-2 font-bold text-xs"
              >
                <X className="w-4 h-4" /> Close Map
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setShowMap(true)}
              className="glass-card p-8 rounded-3xl border-2 border-dashed border-accent/30 hover:border-accent hover:bg-accent/5 cursor-pointer transition-all group flex flex-col items-center justify-center gap-4 min-h-[200px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapIcon className="w-8 h-8 text-accent" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Open Situation Room Map</h3>
                <p className="text-sm text-theme-muted">Click to visualize live alerts and citizen locations</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-3"><TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />{t('dashboardTitle')}</h1><p className="text-sm mt-1 text-theme-muted">{t('dashboardSubtitle')}</p></div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin/simulation')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              Live Simulation
            </button>
          )}
          <button onClick={fetchData} className="btn-secondary text-sm"><RefreshCw className="w-4 h-4" /> {t('refresh')}</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Zap} label={t('activeAlerts')} value={stats.active} color="#ef4444" trend="+2 since yesterday" />
        <Stat icon={Clock} label={t('expiringSoon')} value={stats.expiringSoon} color="#f97316" />
        <Stat icon={Send} label={t('totalSentToday')} value={stats.totalToday} color="var(--accent)" />
        <Stat icon={Timer} label={t('expiredLabel')} value={stats.expired} color="var(--text-dim)" />
      </div>

      {/* Safety Analytics Section */}
      {isAdmin && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl border-0 shadow-lg relative overflow-hidden">
          <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: 'radial-gradient(circle, var(--accent-bg) 0%, transparent 70%)', opacity: 0.3 }} />
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" /> {t('safety Response Analytics') || 'Safety Response Analytics'}
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
               <div className="text-2xl font-black text-green-500">{safetyStats.safe}</div>
               <div className="text-[10px] font-bold uppercase tracking-wider text-green-600/70">{t('Marked Safe') || 'Marked Safe'}</div>
            </div>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
               <div className="text-2xl font-black text-red-500">{safetyStats.assistance}</div>
               <div className="text-[10px] font-bold uppercase tracking-wider text-red-600/70">{t('Need Assistance') || 'Need Assistance'}</div>
            </div>
          </div>
          
          <div 
            onClick={() => navigate('/admin/simulation')}
            className="p-4 rounded-2xl bg-accent/5 border border-dashed border-accent/30 hover:border-accent hover:bg-accent/10 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-accent animate-pulse" />
              <div>
                <div className="text-sm font-bold">UACS Live Simulation</div>
                <div className="text-[10px] text-theme-muted">Run side-by-side comparison</div>
              </div>
              <button className="ml-auto text-xs font-bold text-accent">Launch →</button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl border-0 shadow-lg">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" /> {t('Recent Safety Reports') || 'Recent Safety Reports'}
          </h2>
          <div className="space-y-3">
             {recentReports.length === 0 ? (
               <div className="text-center py-8 text-theme-muted text-sm">No recent safety reports</div>
             ) : recentReports.map((r, idx) => (
               <div key={r.id || idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-theme-hover mb-2 border border-theme-border">
                 <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                     <div className={`w-2 h-2 rounded-full ${r.status === 'safe' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} /> 
                     <span className={r.status === 'assistance' ? 'font-black text-red-500' : 'font-medium'}>
                       {r.status === 'assistance' ? 'SOS: ' : 'SAFE: '}{r.user_name}
                     </span>
                     <span className="text-[10px] text-theme-dim">({r.zone || 'Unknown'})</span>
                   </div>
                   {r.status === 'assistance' && !r.assisted && (
                     <span className="ml-4 mt-1 text-[9px] text-orange-500 font-bold uppercase">Pending Rescue</span>
                   )}
                   {r.assisted && (
                     <span className="ml-4 mt-1 text-[9px] text-green-500 font-bold uppercase flex items-center gap-1">
                       <CheckCircle className="w-3 h-3" /> Assisted
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="text-theme-dim text-[10px]">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                   {r.status === 'assistance' && !r.assisted && (
                     <button 
                       onClick={async () => {
                         try {
                           await messagesApi.assistCitizen(r.id);
                           toast.success('Dispatched Rescue Team');
                           fetchData();
                         } catch(e) {
                           toast.error('Failed to dispatch rescue');
                         }
                       }}
                       className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                     >
                       <Zap className="w-3 h-3" /> DISPATCH HELP
                     </button>
                   )}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        {[
          { key: 'active',  icon: Zap,      label: `${t('activeAlerts') || 'Active'} (${activeMessages.length})`, roles: ['admin', 'user'] },
          { key: 'drafts',  icon: PenSquare, label: `${t('draftsTab') || 'Drafts'} (${draftMessages.length})`, roles: ['admin'] },
          { key: 'expired', icon: Clock,    label: `${t('expiredAlerts') || 'Expired'} (${expiredMessages.length})`, roles: ['admin', 'user'] },
        ].filter(tb => tb.roles.includes(user.role || 'admin')).map(tb => (
          <button key={tb.key} onClick={() => setActiveTab(tb.key)} className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2" style={{ background: activeTab===tb.key?'var(--accent)':'transparent', color: activeTab===tb.key?'white':'var(--text-muted)', boxShadow: activeTab===tb.key?'var(--shadow-md)':'none', border: 'none', cursor: 'pointer' }}><tb.icon className="w-3.5 h-3.5"/>{tb.label}</button>
        ))}
      </div>

      {activeTab==='active' && (<div className="space-y-3">
        {activeMessages.length===0 ? (
          <div className="glass-card p-12 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-theme-dim" />
            <h3 className="text-lg font-medium text-theme-secondary mb-2">{t('noActiveAlerts')}</h3>
            <p className="text-sm text-theme-muted mb-4">{t('noActiveDesc')}</p>
            {isAdmin ? (
              <button onClick={()=>navigate('/compose')} className="btn-primary text-sm mx-auto"><Send className="w-4 h-4" /> {t('composeMessage')}</button>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <button 
                  onClick={handleSOS}
                  disabled={emergencyLoading}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mx-auto"
                >
                  <AlertTriangle className="w-5 h-5" /> {emergencyLoading ? 'SENDING...' : 'SOS: I NEED HELP'}
                </button>
                <p className="text-xs text-theme-muted">If you are in danger, tap the SOS button to alert the response centre.</p>
              </div>
            )}
          </div>
        ) : activeMessages.map((msg,i)=>(
          <div key={msg.id} className="glass-card p-5 animate-slide-up" style={{ animationDelay:`${i*60}ms` }}>
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap"><AlertBanner urgency={msg?.urgency} /><h3 className="font-semibold text-lg">{msg?.title}</h3></div>
                <p className="text-sm text-theme-secondary mb-3 line-clamp-2">{msg?.master_content}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-theme-muted"><div className="flex items-center gap-1.5">{(msg?.channels||[]).map(ch=><ChannelBadge key={ch} channel={ch}/>)}</div><span style={{color:'var(--border-strong)'}}>•</span><span>{(msg?.languages||[]).length} {t('languageCount') || 'language(s)'}</span><span style={{color:'var(--border-strong)'}}>•</span><span>{t('by')} {msg?.sent_by}</span></div>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                {msg.expires_at && <ExpiryTimer expiresAt={msg.expires_at} status={msg.status}/>}
                {isAdmin && (
                <div className="flex items-center gap-2">
                  <button onClick={()=>handleExtend(msg?.id)} disabled={actionLoading[`x-${msg?.id}`]} className="btn-secondary text-xs py-1.5 px-3">{actionLoading[`x-${msg?.id}`]?<RefreshCw className="w-3 h-3 animate-spin"/>:<Timer className="w-3 h-3"/>} {t('extend')}</button>
                  <button onClick={()=>setExpiryAlertId(msg?.id)} className="btn-danger text-xs py-1.5 px-3"><AlertTriangle className="w-3 h-3"/> {t('expireNow')}</button>
                  <button onClick={()=>handleDelete(msg?.id)} disabled={actionLoading[`d-${msg?.id}`]} className="btn-secondary text-xs py-1.5 px-3" style={{color:'#ef4444',borderColor:'rgba(239,68,68,0.3)'}}>{actionLoading[`d-${msg?.id}`]?<RefreshCw className="w-3 h-3 animate-spin"/>:<X className="w-3 h-3"/>}</button>
                </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>)}

      {activeTab==='drafts' && (<div className="space-y-3">
        {draftMessages.length===0 ? (<div className="glass-card p-12 text-center"><PenSquare className="w-12 h-12 mx-auto mb-4 text-theme-dim" /><h3 className="text-lg font-medium text-theme-secondary mb-2">{t('noDraftsTitle') || 'No Draft Messages'}</h3><p className="text-sm text-theme-muted mb-4">{t('noDraftsDesc') || 'Saved drafts will appear here'}</p><button onClick={()=>navigate('/compose')} className="btn-primary text-sm"><Send className="w-4 h-4" /> {t('composeMessage')}</button></div>
        ) : draftMessages.map((msg,i)=>(
          <div key={msg.id} className="glass-card p-5 animate-slide-up" style={{ animationDelay:`${i*60}ms`, borderLeft: '3px solid var(--accent)' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap"><AlertBanner urgency={msg.urgency} /><h3 className="font-semibold">{msg.title}</h3></div>
                <p className="text-sm text-theme-muted line-clamp-1">{msg.master_content}</p>
                <p className="text-xs text-theme-dim mt-1">{t('by')} {msg.sent_by} · {new Date(msg.created_at||Date.now()).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={()=>navigate('/compose')} className="btn-secondary text-xs py-1.5 px-3"><PenSquare className="w-3 h-3"/> {t('editBtn') || 'Edit'}</button>
                <button onClick={()=>navigate(`/approval/${msg.id}`)} className="btn-primary text-xs py-1.5 px-3"><Send className="w-3 h-3"/> {t('send')}</button>
                <button onClick={()=>handleDelete(msg.id)} disabled={actionLoading[`d-${msg.id}`]} className="btn-secondary text-xs py-1.5 px-3" style={{color:'#ef4444',borderColor:'rgba(239,68,68,0.3)'}}>{actionLoading[`d-${msg.id}`]?<RefreshCw className="w-3 h-3 animate-spin"/>:<X className="w-3 h-3"/>}</button>
              </div>
            </div>
          </div>
        ))}
      </div>)}

      {activeTab==='expired' && (<div className="space-y-3">
        {expiredMessages.length===0 ? (<div className="glass-card p-12 text-center"><Clock className="w-12 h-12 mx-auto mb-4 text-theme-dim" /><h3 className="text-lg font-medium text-theme-secondary mb-2">{t('noExpiredAlerts')}</h3><p className="text-sm text-theme-muted">{t('noExpiredDesc')}</p></div>
        ) : expiredMessages.map((msg,i)=>(
          <div key={msg.id} className="glass-card p-5 opacity-75 animate-slide-up" style={{ animationDelay:`${i*60}ms` }}>
            <div className="flex flex-col lg:flex-row lg:items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap"><span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ background:'var(--bg-hover)',color:'var(--text-muted)',border:'1px solid var(--border)'}}>{t('expired')}</span><h3 className="font-semibold">{msg.title}</h3></div>
                <p className="text-sm text-theme-muted mb-2 line-clamp-1">{msg.master_content}</p>
                <div className="flex items-center gap-3 text-xs text-theme-dim"><span>{t('expired')}: {msg.expires_at ? new Date(msg.expires_at).toLocaleString() : t('manual')}</span></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={()=>navigate(`/approval/${msg.id}`)} className="btn-secondary text-xs py-1.5 px-3"><RotateCcw className="w-3 h-3"/> {t('resend')}</button>
                <button onClick={()=>navigate(`/approval/${msg.id}`)} className="btn-secondary text-xs py-1.5 px-3"><Eye className="w-3 h-3"/> {t('view')}</button>
              </div>
            </div>
          </div>
        ))}
      </div>)}

      {/* Floating Emergency Button (Admins only) */}
      {isAdmin && (
        <div 
          className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center gap-2 cursor-pointer group"
          onClick={() => setIsEmergencyModalOpen(true)}
        >
          <button 
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-transform group-hover:scale-110 emergency-btn-pulse"
            style={{ 
              background: '#ef4444', 
              border: 'none',
              color: 'white'
            }}
          >
            ⚠️
          </button>
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest drop-shadow-md">
            {t('emergency') || 'Emergency'}
          </span>
        </div>
      )}

      {/* Emergency Modal */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full bg-[var(--bg-base)] border border-red-500/30 overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-6 border-b border-[var(--border)] bg-red-500/10 relative">
              <button 
                onClick={() => setIsEmergencyModalOpen(false)}
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                {t('emergencyBroadcast') || '⚠️ Emergency Broadcast'}
              </h2>
              <p className="text-sm text-red-400 mt-1">
                {t('emergencySubtitle') || 'Dispatches to ALL channels in ALL languages instantly'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {emergencyError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-500 text-sm">
                  {emergencyError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">  
                   {t('emergencyMessage') || 'Emergency Message'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="textarea-field w-full h-32"
                  placeholder={t('emergencyPlaceholder') || "Describe the emergency situation clearly and briefly..."}
                  value={emergencyText}
                  onChange={e => setEmergencyText(e.target.value)}
                  maxLength={300}
                />
                <div className="text-right text-xs mt-1 text-[var(--text-muted)]">
                  {emergencyText.length}/300
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
                  {t('targetLocation') || 'Target Location'} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field w-full"
                    placeholder={t('locationPlaceholder') || "e.g. Mumbai, Delhi or exact address"}
                    value={emergencyZone}
                    onChange={e => setEmergencyZone(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowMap(!showMap)} 
                    className="btn-secondary px-3 shrink-0"
                    title="Pick exact location on map"
                  >
                    <MapIcon style={{ width: 16, height: 16 }} />
                  </button>
                </div>
                {showMap && (
                  <div className="mt-2" style={{ position: 'relative', zIndex: 100 }}>
                    <MapZonePicker 
                      value={emergencyZone} 
                      onChange={(v, coords) => {
                        setEmergencyZone(v);
                        if (coords) {
                          setEmergencyText(prev => `${prev}\n\n[Location Coordinates: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}]`);
                        }
                      }} 
                      onClose={() => setShowMap(false)} 
                    />
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)] flex justify-between">
                  <span>{t('alertRadius') || 'Alert Radius'}</span>
                  <span className="text-accent font-bold">5 km</span>
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  defaultValue={5}
                  className="w-full accent-red-500"
                />
                <div className="flex justify-between text-[10px] text-theme-muted mt-1">
                  <span>1 km</span>
                  <span>25 km</span>
                  <span>50 km</span>
                </div>
              </div>

              <div className="p-4 bg-[var(--bg-hover)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-muted)] space-y-1 mt-2">
                <p><strong>{t('autoFilledSettings') || 'Auto-filled settings'}:</strong></p>
                <p>• {t('urgencyLevel') || 'Urgency'}: <span className="text-red-500">{t('critical')}</span></p>
                <p>• {t('selectChannels') || 'Channels'}: {t('allChannelsLabel') || 'All (SMS, Twitter, Radio, TV, Website)'}</p>
                <p>• {t('selectLanguages') || 'Languages'}: {t('allLanguagesLabel') || 'All Supported (Hi, Mr, Ta, Te, En)'}</p>
                <p>• {t('expiresIn') || 'Expires in'}: 6 {t('hours')}</p>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-surface)] flex flex-col gap-3">
              <button 
                onClick={handleEmergencySubmit}
                disabled={emergencyLoading}
                className="w-full py-3 rounded-lg font-bold text-white uppercase tracking-wider text-sm transition-all"
                style={{ background: emergencyLoading ? '#991b1b' : '#ef4444' }}
              >
                {emergencyLoading ? <RefreshCw className="w-5 h-5 mx-auto animate-spin" /> : (t('sendEmergency') || 'SEND EMERGENCY BROADCAST')}
              </button>
              
              <button 
                onClick={() => setIsEmergencyModalOpen(false)}
                disabled={emergencyLoading}
                className="w-full py-2 rounded-lg font-medium text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
              
              <p className="text-xs text-center text-red-500 font-medium">
                {t('emergencyWarning') || '⚠️ This will immediately broadcast to all channels. This action cannot be undone.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Reason Modal */}
      {isAdmin && expiryAlertId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full bg-[var(--bg-base)] border border-red-500/30 overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> Expire This Alert
              </h2>
              <p className="text-sm text-theme-muted mb-4">
                Please provide a reason for expiration. This will be logged for accountability and visible to citizens.
              </p>
              
              <label className="block text-xs font-bold text-theme-muted uppercase mb-1">Reason for expiry (Required)</label>
              <textarea 
                className="textarea-field w-full h-24 mb-4"
                placeholder="e.g. Flood waters receded. Zone declared safe by municipal officer."
                value={manualExpiryReason}
                onChange={(e) => setManualExpiryReason(e.target.value)}
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => setExpiryAlertId(null)}
                  className="flex-1 py-2 rounded-xl bg-theme-hover text-white font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleExpireNow(expiryAlertId, manualExpiryReason)}
                  disabled={!manualExpiryReason.trim() || actionLoading[`e-${expiryAlertId}`]}
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/20"
                >
                  {actionLoading[`e-${expiryAlertId}`] ? <RefreshCw className="animate-spin w-5 h-5 mx-auto" /> : 'Confirm Expiry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
