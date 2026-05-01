import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Phone, 
  Map as MapIcon, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';
import { messagesApi, translateApi, dispatchApi, recipientsApi } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { toast } from 'react-hot-toast';

const SOSResponsePage = () => {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, assisted, all

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await messagesApi.getRecentSafety();
      // res.data is the array
      setReports((res.data || []).filter(r => r.status === 'assistance'));
    } catch (err) {
      toast.error('Failed to load SOS requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const handleMarkAssisted = async (id) => {
    try {
      await messagesApi.assistCitizen(id);
      toast.success('Citizen marked as assisted and notified via SMS');
      fetchReports();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const filteredReports = reports.filter(r => {
    if (filter === 'pending') return !r.assisted;
    if (filter === 'assisted') return r.assisted;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            SOS Response Center
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time emergency coordination and rescue tracking
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'pending' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            Active SOS ({reports.filter(r => !r.assisted).length})
          </button>
          <button 
            onClick={() => setFilter('assisted')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'assisted' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            Resolved ({reports.filter(r => r.assisted).length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-red-500/20 bg-red-500/5">
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">Urgent Attention</h3>
            <div className="text-4xl font-bold text-white mb-2">
              {reports.filter(r => !r.assisted).length}
            </div>
            <p className="text-slate-400 text-sm">Citizens currently awaiting emergency assistance</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Response Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Resolved Today</span>
                <span className="text-emerald-400 font-bold">{reports.filter(r => r.assisted).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Avg. Response Time</span>
                <span className="text-white font-medium">12.4 min</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${(reports.filter(r => r.assisted).length / (reports.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-4">
          {loading && reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 glass-card">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
              <p className="text-slate-400">Loading emergency queue...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 glass-card">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white">All Clear</h3>
              <p className="text-slate-400">No active SOS requests in the current queue.</p>
            </div>
          ) : (
            filteredReports.map((report, idx) => (
              <div 
                key={report.id} 
                className={`glass-card p-6 border-l-4 transition-all duration-300 hover:translate-x-1 ${report.assisted ? 'border-l-emerald-500/50 opacity-75' : 'border-l-red-500 animate-pulse-subtle shadow-lg shadow-red-500/5'}`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${report.assisted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {report.assisted ? 'Assisted' : `Priority ${idx + 1}`}
                          </span>
                          <h4 className="text-lg font-bold text-white">{report.user_name}</h4>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapIcon className="w-3.5 h-3.5" /> {report.zone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {new Date(report.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      {!report.assisted && (
                        <div className="text-right">
                          <div className="text-xs text-red-400 font-semibold mb-1 flex items-center justify-end gap-1">
                            <AlertCircle className="w-3 h-3" /> Waiting
                          </div>
                          <div className="text-xl font-mono text-white">
                            {Math.floor((Date.now() - new Date(report.created_at).getTime()) / 60000)}m
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="bg-white/5 p-3 rounded-lg flex-1 min-w-[130px]">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 whitespace-nowrap">Status</div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${report.assisted ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="whitespace-nowrap">{report.assisted ? 'Help Dispatched' : 'Needs Help'}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg flex-1 min-w-[140px] overflow-hidden">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 whitespace-nowrap">Coordinates</div>
                        <div className="text-sm font-medium text-white truncate">
                          {report.lat ? `${report.lat}, ${report.lng}` : 'Not shared'}
                        </div>
                      </div>
                      <div className="bg-white/5 p-3 rounded-lg flex-1 min-w-[150px]">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 whitespace-nowrap">Emergency Contact</div>
                        <div className="text-sm font-medium text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" /> Notified
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 justify-center">
                    {!report.assisted ? (
                      <>
                        <button 
                          onClick={() => handleMarkAssisted(report.id)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Assisted
                        </button>
                        <a 
                          href={`tel:${report.user_phone || '911'}`}
                          className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-white/5 flex items-center justify-center"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                        {report.lat && report.lng && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${report.lat},${report.lng}`}
                            target="_blank" rel="noreferrer"
                            className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-white/5 flex items-center justify-center"
                          >
                            <MapIcon className="w-5 h-5" />
                          </a>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 px-4 py-2 rounded-lg">
                        <CheckCircle className="w-4 h-4" /> Assisted
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SOSResponsePage;
