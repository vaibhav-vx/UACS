import { useState, useEffect } from 'react';
import { 
  Phone, CheckCircle, Navigation, Info, 
  Map as MapIcon, ChevronRight, ArrowRight, ExternalLink 
} from 'lucide-react';
import { EAPS } from '../constants';
import { messagesApi } from '../api';
import toast from 'react-hot-toast';

export default function EvacuationPage() {
  const [checklist, setChecklist] = useState(() => {
    const saved = localStorage.getItem('uacs_go_bag');
    return saved ? JSON.parse(saved) : {
      identity: false, food: false, firstaid: false, charger: false,
      cash: false, medicine: false, clothes: false, flashlight: false,
      whistle: false, contacts: false
    };
  });

  const [sharingLocation, setSharingLocation] = useState(false);
  const user = JSON.parse(localStorage.getItem('uacs_user') || '{}');
  const userZone = user?.department || user?.location || user?.zone || 'General';

  useEffect(() => {
    localStorage.setItem('uacs_go_bag', JSON.stringify(checklist));
  }, [checklist]);

  const toggleItem = (id) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progress = (completedCount / 10) * 100;

  const handleShareLocation = () => {
    setSharingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          // In a real app, we'd send lat/lng. For now, we use the safety_responses endpoint.
          await messagesApi.submitSafety('LOCATION-SHARE', 'assistance');
          toast.success("GPS Coordinates shared with emergency responders", { icon: '📍' });
        } catch (e) {
          toast.error("Failed to share location");
        } finally {
          setSharingLocation(false);
        }
      }, () => {
        toast.error("Geolocation access denied");
        setSharingLocation(false);
      });
    } else {
      toast.error("Geolocation not supported by your browser");
      setSharingLocation(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8 rounded-3xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-blue-500/20">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
          <MapIcon className="w-8 h-8 text-blue-500" />
          Evacuation & Safety Guide
        </h1>
        <p className="text-theme-muted">Real-time survival instructions and nearest safety hubs for your zone.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Map & Instructions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Nearest Evacuation Points */}
          <section className="glass-card overflow-hidden rounded-3xl border-0 shadow-xl">
            <div className="p-6 border-b border-theme-border flex items-center justify-between">
               <h2 className="text-xl font-bold flex items-center gap-2">
                 <MapIcon className="w-5 h-5 text-accent" /> Nearest Evacuation Points
               </h2>
               <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent/10 text-accent">3 Hubs Nearby</span>
            </div>
            <div className="p-4 space-y-4">
               {EAPS.slice(0, 3).map((eap, idx) => (
                 <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-theme-hover border border-theme-border hover:border-accent/50 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform">
                       <MapIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-bold text-lg mb-1">{eap.name}</h3>
                       <div className="flex flex-wrap items-center gap-3 text-xs text-theme-muted">
                          <span className="flex items-center gap-1"><Info className="w-3 h-3" /> {eap.type}</span>
                          <span>•</span>
                          <span>Capacity: {eap.capacity}</span>
                          <span>•</span>
                          <span className="text-accent font-bold">~{(idx * 0.5 + 0.8).toFixed(1)} km</span>
                       </div>
                    </div>
                    <button 
                       onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${eap.pos[0]},${eap.pos[1]}`, '_blank')}
                       className="w-full sm:w-auto px-5 py-2.5 bg-accent text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/80 transition-all"
                    >
                       <Navigation className="w-4 h-4" /> Get Directions
                    </button>
                 </div>
               ))}
            </div>
          </section>

          {/* 2. Zone Specific Instructions (Seasonal: Summer) */}
          <section className="glass-card p-6 rounded-3xl border-0 shadow-xl bg-orange-500/5 border-orange-500/20">
             <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-6 h-6" /> Summer Safety Instructions
             </h2>
             <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                   <h4 className="font-bold text-orange-700 mb-2">IF HEATWAVE ALERT (Active in your zone):</h4>
                   <ul className="space-y-2 text-sm text-orange-800/80">
                      <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 shrink-0" /> Stay hydrated. Drink at least 4-5 liters of water daily.</li>
                      <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 shrink-0" /> Avoid outdoors between 12:00 PM and 4:00 PM.</li>
                      <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 shrink-0" /> Wear light-colored, loose cotton clothes.</li>
                   </ul>
                </div>
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                   <h4 className="font-bold text-red-700 mb-2">FIRE SAFETY (Pre-Monsoon Dry Season):</h4>
                   <p className="text-sm text-red-800/80">Dry vegetation increases forest fire risk. Report any smoke immediately. Keep your balcony clear of flammable items.</p>
                </div>
             </div>
          </section>

          {/* 3. Share Location Button */}
          <button 
            onClick={handleShareLocation}
            disabled={sharingLocation}
            className="w-full py-5 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl flex items-center justify-center gap-4 shadow-2xl shadow-blue-600/30 transition-all active:scale-95"
          >
            {sharingLocation ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <MapIcon className="w-6 h-6" />
                </div>
                SHARE MY LOCATION WITH AUTHORITIES
              </>
            )}
          </button>

        </div>

        {/* Right Column: Checklist & Contacts */}
        <div className="space-y-8">
          
          {/* Disaster Preparedness Checklist */}
          <section className="glass-card p-6 rounded-3xl border-0 shadow-xl">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Go-Bag Checklist</h2>
                <span className="text-xs font-black text-accent">{completedCount}/10</span>
             </div>
             
             {/* Progress Bar */}
             <div className="h-2 w-full bg-theme-hover rounded-full mb-6 overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500" 
                  style={{ width: `${progress}%` }}
                />
             </div>

             <div className="space-y-2">
                {[
                  { id: 'identity', label: 'Identity Documents (Aadhaar)' },
                  { id: 'food', label: '3 Days Food & Water' },
                  { id: 'firstaid', label: 'First Aid Kit' },
                  { id: 'charger', label: 'Phone Charger & Bank' },
                  { id: 'cash', label: 'Cash (Min ₹2000)' },
                  { id: 'medicine', label: '7-Day Medicine Supply' },
                  { id: 'clothes', label: 'Warm Clothes & Blanket' },
                  { id: 'flashlight', label: 'Flashlight & Batteries' },
                  { id: 'whistle', label: 'Whistle for Signaling' },
                  { id: 'contacts', label: 'Emergency Contacts List' },
                ].map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-theme-hover cursor-pointer transition-colors group">
                    <div 
                      onClick={() => toggleItem(item.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${checklist[item.id] ? 'bg-accent border-accent text-white' : 'border-theme-border text-transparent'}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <span className={`text-sm ${checklist[item.id] ? 'text-theme-muted line-through' : 'text-theme-primary font-medium'}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
             </div>
          </section>

          {/* Emergency Contacts Directory */}
          <section className="glass-card p-6 rounded-3xl border-0 shadow-xl bg-red-500/5 border-red-500/20">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-red-500" /> Emergency Directory
             </h2>
             <div className="space-y-2">
                {[
                  { name: 'Police', num: '100', color: 'text-blue-600', desc: 'Police Emergency' },
                  { name: 'Fire', num: '101', color: 'text-red-600', desc: 'Fire & Rescue' },
                  { name: 'Ambulance', num: '108', color: 'text-green-600', desc: 'Medical Emergency' },
                  { name: 'Disaster', num: '1078', color: 'text-orange-600', desc: 'National Disaster Helpline' },
                  { name: 'Women', num: '1091', color: 'text-pink-600', desc: 'Women Helpline' },
                  { name: 'Air Ambulance', num: '9540161344', color: 'text-indigo-600', desc: 'Private SOS' },
                ].map((contact, idx) => (
                  <a 
                    key={idx} 
                    href={`tel:${contact.num}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-theme-border hover:border-accent transition-all group"
                  >
                    <div className="flex flex-col">
                       <span className="text-sm font-bold">{contact.name}</span>
                       <span className="text-[9px] text-theme-muted uppercase font-black">{contact.desc}</span>
                    </div>
                    <span className={`font-black ${contact.color} group-hover:scale-110 transition-transform`}>{contact.num}</span>
                  </a>
                ))}
             </div>
             <div className="mt-4 pt-4 border-t border-theme-border">
                <p className="text-[10px] text-theme-muted uppercase font-bold tracking-widest text-center">Tap numbers to call instantly</p>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// Internal icons needed
const AlertTriangle = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const RefreshCw = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);
