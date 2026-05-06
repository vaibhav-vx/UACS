import { useState, useEffect } from 'react';
import { 
  History, Search, Filter, Calendar, Clock, ArrowRight, 
  CheckCircle, AlertTriangle, Info, Eye, Download, FileText,
  ChevronRight, Shield
} from 'lucide-react';
import { messagesApi } from '../api';
import AlertBanner from '../components/AlertBanner';
import toast from 'react-hot-toast';
import CGACitizenPanel from '../components/CGACitizenPanel';

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, critical, active, expired
  const [expandedId, setExpandedId] = useState(null);
  const [cgaMode, setCgaMode] = useState(false);


  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const [active, expired] = await Promise.all([
          messagesApi.getAll('active'),
          messagesApi.getAll('expired')
        ]);
        setAlerts([...active.data, ...expired.data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } catch (e) {
        toast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                         a.master_content.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'critical' && a.urgency === 'critical') ||
                         (filter === 'active' && a.status === 'active') ||
                         (filter === 'expired' && a.status === 'expired');
    return matchesSearch && matchesFilter;
  });

  const groupedAlerts = filteredAlerts.reduce((groups, alert) => {
    const date = new Date(alert.created_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(alert);
    return groups;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* Header & CGA Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3">
            {cgaMode
              ? <Shield className="w-7 h-7" style={{ color: '#6366f1' }} />
              : <History className="w-7 h-7 text-accent" />}
            {cgaMode ? 'CivicGuard AI' : 'Alert History & Notifications'}
          </h1>
          <p className="text-sm text-theme-muted">
            {cgaMode ? 'Fact-check suspicious messages & rumours instantly.' : 'Track all received emergency communications and your responses.'}
          </p>
        </div>
        {/* Toggle Switch */}
        <div className="flex items-center gap-3 glass-card px-4 py-2.5 rounded-2xl border-0 shadow-lg">
          <span className={`text-xs font-bold transition-colors ${!cgaMode ? 'text-accent' : 'text-theme-muted'}`}>🔔 Notifications</span>
          <button
            onClick={() => setCgaMode(v => !v)}
            style={{
              width: 48, height: 26, borderRadius: 999, cursor: 'pointer', border: 'none',
              background: cgaMode ? 'linear-gradient(135deg,#6366f1,#3b82f6)' : 'var(--bg-hover)',
              position: 'relative', transition: 'background 0.3s', flexShrink: 0,
            }}
            aria-label="Toggle CivicGuard AI mode"
          >
            <span style={{
              position: 'absolute', top: 3, left: cgaMode ? 26 : 3,
              width: 20, height: 20, borderRadius: '50%', background: 'white',
              transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
          <span className={`text-xs font-bold transition-colors flex items-center gap-1 ${cgaMode ? 'text-indigo-400' : 'text-theme-muted'}`}>
            <Shield className="w-3 h-3" /> CivicGuard AI
          </span>
        </div>
      </div>

      {/* CGA Panel — full slide-in */}
      {cgaMode && (
        <div className="glass-card rounded-3xl overflow-hidden border-0 shadow-2xl animate-fade-in" style={{ minHeight: 520 }}>
          <CGACitizenPanel onClose={() => setCgaMode(false)} />
        </div>
      )}

      {cgaMode && null /* hide rest of content when CGA active */}
      {cgaMode ? null : <>

      {/* Filters Bar */}
      <div className="glass-card p-2 rounded-2xl flex flex-wrap items-center gap-2 border-theme-border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-dim" />
          <input 
            type="text" 
            placeholder="Search alerts by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-theme-surface border border-theme-border rounded-xl text-sm focus:border-accent outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-theme-surface border border-theme-border rounded-xl">
           {['all', 'critical', 'active', 'expired'].map(f => (
             <button 
               key={f}
               onClick={() => setFilter(f)}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filter === f ? 'bg-accent text-white shadow-md' : 'text-theme-muted hover:bg-theme-hover'}`}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 glass-card shimmer rounded-3xl" />)}
        </div>
      ) : Object.keys(groupedAlerts).length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl">
          <Clock className="w-16 h-16 mx-auto mb-4 text-theme-dim" />
          <h3 className="text-xl font-bold text-theme-secondary">No Alerts Found</h3>
          <p className="text-theme-muted">We couldn't find any alerts matching your current filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAlerts).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-black text-theme-dim uppercase tracking-[0.2em] whitespace-nowrap">{date}</h2>
                <div className="h-px w-full bg-theme-border" />
              </div>
              <div className="space-y-4">
                {items.map((alert) => {
                  const isExpanded = expandedId === alert.id;
                  return (
                    <div key={alert.id} className="glass-card overflow-hidden rounded-2xl border-0 shadow-lg hover:shadow-2xl transition-all group">
                      <div className="flex flex-col md:flex-row">
                         <div className="w-1 bg-accent group-hover:w-2 transition-all shrink-0" style={{ backgroundColor: alert.urgency === 'critical' ? '#ef4444' : alert.urgency === 'high' ? '#f97316' : 'var(--accent)' }} />
                         <div className="p-5 flex-1 flex flex-col justify-between gap-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-3">
                                 <div className="flex items-center gap-3">
                                    <AlertBanner urgency={alert.urgency} />
                                    <h3 className="font-bold text-lg">{alert.title}</h3>
                                 </div>
                                 <p className={`text-sm text-theme-secondary ${isExpanded ? '' : 'line-clamp-1'}`}>{alert.master_content}</p>
                                 <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Received: {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Response: Marked Safe</span>
                                    <span className={`px-2 py-0.5 rounded ${alert.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-theme-hover text-theme-dim'}`}>
                                       Status: {alert.status}
                                    </span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                                 <button 
                                   onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                                   className={`flex-1 md:flex-none px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${isExpanded ? 'bg-accent text-white border-accent' : 'bg-theme-hover border-theme-border hover:border-accent'}`}
                                 >
                                    <Eye className="w-3.5 h-3.5" /> {isExpanded ? 'Close Alert' : 'Full Alert'}
                                 </button>
                                 {alert.status === 'active' && (
                                   <button className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-accent text-white text-xs font-black shadow-lg shadow-accent/20 animate-pulse flex items-center justify-center gap-2">
                                      Respond Now <ArrowRight className="w-3.5 h-3.5" />
                                   </button>
                                 )}
                              </div>
                            </div>

                            {/* Detailed Disaster Alert info */}
                            {isExpanded && (
                              <div className="mt-4 border-t border-white/5 pt-4 space-y-4 animate-fade-in">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-theme-muted tracking-widest block mb-1">Target Zone / Scope</span>
                                  <p className="text-sm font-semibold text-accent">{alert.target_zone || 'All India'}</p>
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Detailed Disaster Report</span>
                                  <p className="text-sm text-slate-200 bg-white/5 p-4 rounded-xl border border-white/5 leading-relaxed font-medium whitespace-pre-wrap">
                                    {alert.master_content}
                                  </p>
                                </div>

                                {/* Regional Translations */}
                                {alert.translations && typeof alert.translations === 'string' && (
                                  <div className="space-y-1.5 pt-1 border-t border-white/5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-2">Verified Regional Translations</span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                      {(() => {
                                        try {
                                          const parsed = JSON.parse(alert.translations);
                                          return Object.entries(parsed).map(([lang, val]) => (
                                            lang !== 'en' && val && (
                                              <div key={lang} className="p-3 bg-accent/5 border border-accent/10 rounded-xl space-y-0.5">
                                                <span className="text-[10px] font-black text-accent uppercase tracking-widest">{lang}</span>
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
                            )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
    }
    </div>
  );
}
