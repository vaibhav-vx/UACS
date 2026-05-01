import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Heart, Map as MapIcon, Clock, Activity,
  Send, AlertTriangle, CheckCircle, Search, RefreshCw,
  MoreVertical, Phone, MessageCircle
} from 'lucide-react';
import { recipientsApi, messagesApi } from '../api';
import toast from 'react-hot-toast';

export default function FamilyPage() {
  const [family, setFamily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState(() => JSON.parse(localStorage.getItem('uacs_user') || '{}'));
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    fetchNetwork();
  }, [user?.zone]);

  const fetchNetwork = async () => {
    try {
      setLoading(true);
      const userZone = user.zone || 'General';
      const { data: recs } = await recipientsApi.getAll(userZone);
      
      // Map recipients to "Family" members for demo purposes
      // excluding current user if they are in the list
      const members = recs
        .filter(r => r.phone !== user.phone)
        .map((r, idx) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          zone: r.zone,
          status: idx % 2 === 0 ? 'safe' : 'unknown', // Simulate status based on real response data if possible
          lastActive: 'Active recently',
          emergencyContact: idx === 0
        }));

      setFamily(members);
    } catch (err) {
      console.error("Failed to fetch family network:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newPhone || !newName) return;
    
    const newMember = {
      id: Date.now(),
      name: newName,
      phone: newPhone,
      zone: user?.zone || 'General',
      status: 'no_alerts',
      lastActive: 'Just now',
      emergencyContact: false
    };
    
    setFamily([...family, newMember]);
    setNewName('');
    setNewPhone('');
    setIsAdding(false);
    toast.success(`${newName} added to your Safety Network`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'safe':
        return <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-500 uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Marked Safe</span>;
      case 'unknown':
        return <span className="flex items-center gap-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Not Yet Responded</span>;
      case 'no_alerts':
        return <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded-full"><Activity className="w-3 h-3" /> No Active Alerts</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500/20" />
            My Family Safety Network
          </h1>
          <p className="text-theme-muted">Stay connected and ensure the safety of your loved ones during disasters.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="px-6 py-3 bg-accent text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
        >
          <UserPlus className="w-5 h-5" /> Add Family Member
        </button>
      </div>

      {/* Add Member Modal (Simulated) */}
      {isAdding && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="glass-card max-w-md w-full p-8 rounded-3xl shadow-2xl border-accent/20">
              <h2 className="text-2xl font-bold mb-2">Connect Family</h2>
              <p className="text-sm text-theme-muted mb-6">Enter their details to send a connection request. They must be registered on UACS.</p>
              <form onSubmit={handleAddMember} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-theme-muted mb-1.5">Member Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-theme-hover border border-theme-border rounded-xl focus:border-accent outline-none"
                      placeholder="e.g. John Doe"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      required
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-theme-muted mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 bg-theme-hover border border-theme-border rounded-xl focus:border-accent outline-none"
                      placeholder="+91 XXXXX XXXXX"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                      required
                    />
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-theme-hover text-theme-primary font-bold rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-accent text-white font-bold rounded-xl shadow-lg shadow-accent/20">Send Request</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Family Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {family.map(member => (
          <div key={member.id} className="glass-card p-6 rounded-3xl border-0 shadow-xl group hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
             {/* Background glow for emergency contact */}
             {member.emergencyContact && (
               <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
             )}
             
             <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center text-pink-600 font-black text-xl border border-pink-500/20 shadow-inner">
                      {member.name.charAt(0)}
                   </div>
                   <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {member.name}
                        {member.emergencyContact && <Activity className="w-4 h-4 text-red-500" title="Emergency Contact" />}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-theme-muted">
                        <MapIcon className="w-3.5 h-3.5" /> {member.zone}
                      </div>
                   </div>
                </div>
                <button className="p-2 rounded-xl hover:bg-theme-hover text-theme-dim transition-colors"><MoreVertical className="w-5 h-5" /></button>
             </div>

             <div className="space-y-4 mb-6">
                <div className="p-3 rounded-2xl bg-theme-hover border border-theme-border flex items-center justify-between">
                   <span className="text-xs font-medium text-theme-muted">Safety Status</span>
                   {getStatusBadge(member.status)}
                </div>
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-theme-muted uppercase tracking-wider">
                   <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Active: {member.lastActive}</span>
                   <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {member.phone}</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => toast.success(`Message sent to ${member.name}`, { icon: '💬' })}
                  className="py-2.5 rounded-xl bg-theme-surface border border-theme-border text-xs font-bold flex items-center justify-center gap-2 hover:border-accent hover:text-accent transition-all"
                >
                   <MessageCircle className="w-4 h-4" /> Message
                </button>
                {member.status === 'unknown' ? (
                  <button 
                    onClick={() => toast.success(`Safety reminder sent to ${member.name}`, { icon: '🔔' })}
                    className="py-2.5 rounded-xl bg-orange-500 text-white text-xs font-black shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 animate-pulse"
                  >
                     <Send className="w-4 h-4" /> Remind Now
                  </button>
                ) : (
                  <button 
                    onClick={() => toast.success(`Checking for status updates for ${member.name}`)}
                    className="py-2.5 rounded-xl bg-theme-surface border border-theme-border text-xs font-bold flex items-center justify-center gap-2 hover:border-accent hover:text-accent transition-all"
                  >
                     <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                )}
             </div>
          </div>
        ))}

        {/* Info Card */}
        <div className="glass-card p-6 rounded-3xl border border-dashed border-theme-border flex flex-col items-center justify-center text-center space-y-4 bg-theme-hover/20">
           <div className="w-16 h-16 rounded-full bg-theme-hover flex items-center justify-center text-theme-muted">
              <Heart className="w-8 h-8" />
           </div>
           <div>
              <h4 className="font-bold">Privacy & Safety</h4>
              <p className="text-xs text-theme-muted mt-2">Family members must accept your request before you can see their status. You can only see their safety status during active alerts.</p>
           </div>
           <button className="text-xs font-bold text-accent hover:underline">Learn more about Family Network</button>
        </div>
      </div>
    </div>
  );
}
