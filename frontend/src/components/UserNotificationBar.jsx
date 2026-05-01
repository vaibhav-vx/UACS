import { useState, useEffect } from 'react';
import { Bell, ShieldAlert, CheckCircle2, ChevronRight, X, AlertTriangle, Globe } from 'lucide-react';
import { messagesApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

export default function UserNotificationBar({ user }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('state'); // 'state' or 'india'
  const [selectedAlert, setSelectedAlert] = useState(null);

  const userZone = user?.zone || user?.location || 'General';

  useEffect(() => {
    if (open) {
      fetchMessages();
    }
  }, [open]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await messagesApi.getAll('active');
      setMessages(res.data || []);
    } catch (err) {
      console.error('[UACS] Error fetching user notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Extract base zone name
  const matchesZone = (msgZone, uZone) => {
    if (!msgZone || msgZone.toLowerCase() === 'all zones' || msgZone.toLowerCase() === 'general') return true;
    if (!uZone) return true;
    const targetBase = msgZone.split('(')[0].trim().toLowerCase();
    const recipBase = uZone.split('(')[0].trim().toLowerCase();
    return recipBase === targetBase || targetBase.includes(recipBase) || recipBase.includes(targetBase);
  };

  const stateMessages = messages.filter(m => matchesZone(m.target_zone, userZone));

  const displayedMessages = selectedTab === 'state' ? stateMessages : messages;

  return (
    <div className="relative mb-6">
      {/* ── Notification Header / Trigger ── */}
      <div className="glass-card flex items-center justify-between p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 animate-pulse-slow">
            <Bell className="w-5 h-5 text-indigo-400" />
            {stateMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {t('yourAlertSystem') || 'Disaster Alert Notifications'}
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-500/30 tracking-wider">
                {userZone}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {stateMessages.length > 0
                ? `${stateMessages.length} critical alerts active in your state/zone`
                : 'Your airspace is completely clear. No active alerts.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="btn-primary text-xs py-2.5 px-4 font-bold shadow-indigo-600/20 hover:scale-[1.02] flex items-center gap-2"
        >
          {open ? 'Close Panel' : 'Open Alert History'}
          <ChevronRight className={`w-4 h-4 transition-all duration-300 ${open ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* ── Notification & Alert History Panel ── */}
      {open && (
        <div className="mt-4 glass-card bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col min-h-[350px] max-h-[500px]">
          {/* Header & Close Button */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Alert History
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Filter disaster alerts by scope</p>
            </div>
            <button
              onClick={() => { setOpen(false); setSelectedAlert(null); }}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scope Filters */}
          {!selectedAlert && (
            <div className="p-3 bg-white/5 border-b border-white/5 flex gap-2">
              <button
                onClick={() => setSelectedTab('state')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedTab === 'state'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {userZone} Disaster Alerts
              </button>
              <button
                onClick={() => setSelectedTab('india')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  selectedTab === 'india'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                India Disaster Alerts
              </button>
            </div>
          )}

          {/* Alert Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedAlert ? (
              /* ── Detailed Disaster View ── */
              <div className="space-y-4 animate-fade-in">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-all mb-2"
                >
                  &larr; Back to alert list
                </button>

                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-full">
                        {selectedAlert.urgency || 'Alert'}
                      </span>
                      <h4 className="text-base font-black text-white mt-2 leading-tight">
                        {selectedAlert.title || 'Official Government Alert'}
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Target Scope</span>
                    <p className="text-xs font-semibold text-indigo-300">{selectedAlert.target_zone || 'All India'}</p>
                  </div>

                  <div className="space-y-1.5 border-t border-white/5 pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Disaster Report</span>
                    <p className="text-sm text-slate-200 bg-black/30 p-3.5 rounded-xl border border-white/5 leading-relaxed font-medium whitespace-pre-wrap">
                      {selectedAlert.master_content}
                    </p>
                  </div>

                  {/* Multilingual translations preview */}
                  {selectedAlert.translations && typeof selectedAlert.translations === 'string' && (
                    <div className="space-y-1.5 pt-1 border-t border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-2">Verified Regional Translations</span>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {(() => {
                          try {
                            const parsed = JSON.parse(selectedAlert.translations);
                            return Object.entries(parsed).map(([lang, val]) => (
                              lang !== 'en' && val && (
                                <div key={lang} className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-0.5">
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{lang}</span>
                                  <p className="text-xs text-slate-300 font-medium leading-relaxed">{val}</p>
                                </div>
                              )
                            ));
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : displayedMessages.length === 0 ? (
              /* ── No Alerts fallback ── */
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mb-3 animate-bounce-slow" />
                <p className="text-xs font-bold text-slate-300">No Disaster Alerts found</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[250px]">
                  {selectedTab === 'state'
                    ? `Your state (${userZone}) currently has no active alert reports.`
                    : 'The airspace for India has no active emergency alert reports.'}
                </p>
              </div>
            ) : (
              /* ── Alert List ── */
              displayedMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedAlert(msg)}
                  className="p-4 bg-white/5 border border-white/5 hover:border-white/20 rounded-xl hover:bg-white/10 cursor-pointer transition-all duration-200 flex justify-between items-center group relative overflow-hidden"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.urgency === 'critical' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        Target Zone: {msg.target_zone || 'All India'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                      {msg.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate max-w-[350px]">
                      {msg.master_content}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
