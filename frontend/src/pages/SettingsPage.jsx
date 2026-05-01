import { useState, useEffect } from 'react';
import { 
  Settings, User, Globe, Bell, Eye, Lock, 
  Download, Trash2, Smartphone, Mail, Moon, Sun,
  CheckCircle, ChevronRight, AlertCircle, Save
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../ThemeContext';
import toast from 'react-hot-toast';
import MapZonePicker from '../components/MapZonePicker';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { language, setLanguage, LANGUAGES } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user: authUser, fetchUser } = useAuth();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('uacs_user') || '{}'));
  
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    zone: user.zone || user.location || localStorage.getItem('uacs_pref_zone') || 'General',
    lat: user.lat || null,
    lng: user.lng || null
  });
  
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  const [notifications, setNotifications] = useState({
    critical: true,
    high: true,
    medium: true,
    low: false,
    sms: true,
    push: true,
    email: false
  });

  const [privacy, setPrivacy] = useState({
    shareLocation: true,
    showFamily: true,
    includeStats: true
  });

  const handleSave = async () => {
    try {
      await authApi.updateProfile({
        name: profileForm.name,
        zone: profileForm.zone,
        lat: profileForm.lat,
        lng: profileForm.lng
      });
      localStorage.setItem('uacs_pref_zone', profileForm.zone);
      if (fetchUser) await fetchUser();
      toast.success("Preferences updated successfully");
    } catch (e) {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Settings className="w-8 h-8 text-accent" />
          Preferences & Settings
        </h1>
        <p className="text-theme-muted">Manage your personal information, alert preferences, and account privacy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar Nav (Mobile Horizontal, Desktop Vertical) */}
        <div className="md:col-span-1 space-y-2">
           {[
             { label: 'Profile', icon: User, active: true },
             { label: 'Language', icon: Globe },
             { label: 'Notifications', icon: Bell },
             { label: 'Privacy', icon: Lock },
             { label: 'Security', icon: Lock },
           ].map((item, idx) => (
             <button key={idx} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${item.active ? 'bg-accent text-white shadow-lg' : 'hover:bg-theme-hover text-theme-muted'}`}>
                <item.icon className="w-4 h-4" /> {item.label}
             </button>
           ))}
        </div>

        {/* Settings Content */}
        <div className="md:col-span-3 space-y-8">
           
           {/* 1. PERSONAL INFORMATION */}
           <section className="glass-card p-6 rounded-3xl border-0 shadow-xl space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-theme-border pb-4">
                 <User className="w-5 h-5 text-accent" /> Personal Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-theme-dim">Full Name</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-theme-hover border border-theme-border rounded-xl text-sm font-medium" value={profileForm.name} onChange={e => setProfileForm(p => ({...p, name: e.target.value}))} />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-theme-dim">Phone Number</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-theme-hover border border-theme-border rounded-xl text-sm font-medium" value={user.phone || user.email || '+91 81698 25915'} readOnly />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-theme-dim">Primary Zone</label>
                    <div className="flex items-center gap-2">
                       <input type="text" className="w-full px-4 py-2.5 bg-theme-hover border border-theme-border rounded-xl text-sm font-medium" value={profileForm.zone} onChange={e => setProfileForm(p => ({...p, zone: e.target.value}))} />
                       <button onClick={() => setShowMapPicker(true)} className="px-3 py-2.5 bg-theme-hover rounded-xl text-xs font-bold hover:text-accent transition-all shrink-0">Change</button>
                    </div>
                 </div>
              </div>
              {showMapPicker && (
                <MapZonePicker
                  value={profileForm.zone}
                  onChange={(val, coords) => {
                    setProfileForm(p => ({
                      ...p,
                      zone: val,
                      lat: coords?.lat || null,
                      lng: coords?.lng || null
                    }));
                  }}
                  onClose={() => setShowMapPicker(false)}
                />
              )}
           </section>

           {/* 2. LANGUAGE & APPEARANCE */}
           <section className="glass-card p-6 rounded-3xl border-0 shadow-xl space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b border-theme-border pb-4">
                 <Globe className="w-5 h-5 text-accent" /> Language & Appearance
              </h2>
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div>
                       <h4 className="text-sm font-bold">Preferred Language</h4>
                       <p className="text-xs text-theme-muted">Your alerts will be automatically translated to this language.</p>
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="px-4 py-2 bg-theme-hover border border-theme-border rounded-xl text-sm font-bold outline-none"
                    >
                       {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center justify-between">
                    <div>
                       <h4 className="text-sm font-bold">Theme Mode</h4>
                       <p className="text-xs text-theme-muted">Switch between light and dark interface.</p>
                    </div>
                    <button onClick={toggleTheme} className="p-2 rounded-xl bg-theme-hover border border-theme-border">
                       {theme === 'dark' ? <Sun className="w-5 h-5 text-orange-500" /> : <Moon className="w-5 h-5 text-blue-500" />}
                    </button>
                 </div>
              </div>
           </section>

           {/* 3. NOTIFICATION PREFERENCES */}
           <section className="glass-card p-6 rounded-3xl border-0 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-theme-border pb-4">
                 <h2 className="text-lg font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-accent" /> Notification Channels
                 </h2>
                 <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded uppercase">Active</span>
              </div>
              <div className="space-y-4">
                 {[
                   { id: 'sms', label: 'SMS Notifications', icon: Smartphone, desc: 'Critical alerts via direct text message' },
                   { id: 'push', label: 'Browser Push', icon: Bell, desc: 'Real-time alerts while browsing UACS' },
                   { id: 'email', label: 'Email Alerts', icon: Mail, desc: 'Detailed reports and weekly summaries' },
                 ].map(ch => (
                   <div key={ch.id} className="flex items-center justify-between p-4 rounded-2xl bg-theme-hover border border-theme-border">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-theme-surface flex items-center justify-center text-accent shadow-sm">
                            <ch.icon className="w-5 h-5" />
                         </div>
                         <div>
                            <h4 className="text-sm font-bold">{ch.label}</h4>
                            <p className="text-[10px] text-theme-muted">{ch.desc}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setNotifications(p => ({ ...p, [ch.id]: !p[ch.id] }))}
                        className={`w-12 h-6 rounded-full relative transition-all ${notifications[ch.id] ? 'bg-accent' : 'bg-theme-border'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${notifications[ch.id] ? 'left-7' : 'left-1'}`} />
                      </button>
                   </div>
                 ))}
              </div>
              
              <div className="p-4 rounded-2xl bg-orange-500/5 border border-dashed border-orange-500/30 flex items-start gap-4">
                 <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                 <p className="text-[11px] text-theme-muted italic"><strong>Critical Alert Override:</strong> Level 1 (Critical) alerts will always be sent via SMS and Push even if other notifications are disabled.</p>
              </div>
           </section>

           {/* 4. EMERGENCY CONTACT (The most important setting) */}
           <section className="glass-card p-6 rounded-3xl border-2 border-red-500/30 shadow-2xl space-y-6 bg-red-500/5">
              <h2 className="text-lg font-bold flex items-center gap-2 text-red-600">
                 <Bell className="w-5 h-5" /> SOS Emergency Contact
              </h2>
              <div className="p-5 rounded-2xl bg-white/50 dark:bg-black/20 border border-red-200 dark:border-red-900/30 flex items-center justify-between">
                 <div>
                    <h4 className="font-bold text-theme-primary">Mom (Safety Hub)</h4>
                    <p className="text-sm text-theme-muted">+91 98765 43210</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <button className="p-2 rounded-xl hover:bg-theme-hover text-theme-dim"><Settings className="w-4 h-4" /></button>
                    <button className="p-2 rounded-xl hover:bg-red-500 hover:text-white text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                 </div>
              </div>
              <p className="text-[10px] text-theme-muted uppercase font-black tracking-widest text-center">Your emergency contact is notified automatically during Critical alerts.</p>
           </section>

           {/* Save Button */}
           <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                className="px-8 py-3 bg-accent text-white rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
              >
                 <Save className="w-5 h-5" /> Save Changes
              </button>
           </div>

        </div>
      </div>
    </div>
  );
}
