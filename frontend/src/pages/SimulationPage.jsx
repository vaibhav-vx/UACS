import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, SkipForward, RotateCcw, 
  Globe, AlertTriangle, CheckCircle2, Clock, Zap, 
  MessageSquare, Radio, Tv, X, ChevronRight, Activity
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

/* ── Cinematic Simulation Component ──────────────────────── */
export default function SimulationPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef(null);

  // Chapters: 0 = Opening, 1 = The Problem, 2 = The Transition, 3 = The Solution, 4 = The Results
  const scenes = [
    /* ── OPENING ── */
    { 
      id: 'opening-1', 
      chapter: 0,
      duration: 4000, 
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
          <div className="text-6xl font-black tracking-[0.2em] text-white opacity-20 mb-8">UACS</div>
          <h2 className="text-3xl font-light text-white/80 max-w-2xl leading-relaxed">
            "Before UACS, manual communication systems caused critical delays during emergencies."
          </h2>
        </div>
      )
    },

    /* ── CHAPTER 1: THE PROBLEM ── */
    {
      id: 'c1-s1',
      chapter: 1,
      duration: 5000,
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <div className="flex items-center gap-4 text-red-500 animate-float">
            <Clock className="w-12 h-12" />
            <span className="text-4xl font-bold">9:00 AM</span>
          </div>
          <div className="space-y-4">
             <p className="text-2xl text-white/90 animate-slide-up" style={{ animationDelay: '0.5s' }}>A flood warning has been detected in Zone 4, Mumbai.</p>
             <p className="text-4xl font-black text-red-500 animate-slide-up" style={{ animationDelay: '1.5s' }}>3.2 MILLION CITIZENS</p>
             <p className="text-xl text-white/60 animate-slide-up" style={{ animationDelay: '2.5s' }}>Require immediate notification.</p>
          </div>
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="absolute w-0.5 h-4 bg-white animate-rain" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }} />
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'c1-s2',
      chapter: 1,
      duration: 6000,
      content: (
        <div className="w-full max-w-4xl mx-auto space-y-12">
          <h3 className="text-2xl font-bold text-center text-white/80 mb-8">The Traditional Control Room</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <DeskCard icon={MessageSquare} label="SMS Team" delay="0s" />
            <DeskCard icon={Globe} label="Twitter Team" delay="0.5s" />
            <DeskCard icon={Radio} label="Radio Team" delay="1s" />
            <DeskCard icon={Tv} label="TV Team" delay="1.5s" />
          </div>
          <div className="text-center text-white/40 italic animate-pulse mt-8">
            Each team starts typing their own version...
          </div>
        </div>
      )
    },
    {
      id: 'c1-s3',
      chapter: 1,
      duration: 8000,
      content: (
        <div className="w-full max-w-3xl mx-auto space-y-6">
           <MessageBubble icon={MessageSquare} channel="SMS" text="Flood warning in Zone 4 area. Move to higher ground." delay="0s" error />
           <MessageBubble icon={Globe} channel="Twitter" text="Heavy rains expected in Zone 4. Residents stay alert. #Rain" delay="1.5s" error />
           <MessageBubble icon={Radio} channel="Radio" text="Reports of possible flooding near Zone 4. Consider precautions." delay="3s" error />
           <MessageBubble icon={Tv} channel="TV" text="Zone 4: Weather Advisory" delay="4.5s" error />
           
           <div className="pt-8 text-center">
             <div className="text-5xl font-black text-red-600 animate-glitch">47 MINUTES ELAPSED</div>
             <p className="text-white/40 mt-2">Citizens are still waiting for clear instructions.</p>
           </div>
        </div>
      )
    },
    {
      id: 'c1-s4',
      chapter: 1,
      duration: 6000,
      content: (
        <div className="flex flex-col items-center justify-center space-y-8">
           <div className="relative">
             <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-float">
               <span className="text-5xl">😨</span>
             </div>
             <div className="absolute -top-4 -right-4 text-3xl animate-bounce">❓</div>
             <div className="absolute top-10 -left-12 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>❓</div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm w-full max-w-md">
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500/80">SMS: "Evacuate now"</div>
             <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/60">Twitter: "Just stay alert"</div>
             <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/60">Radio: "Consider precautions"</div>
             <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/60">TV: "Weather advisory"</div>
           </div>

           <h3 className="text-3xl font-bold text-center text-white">"What do I actually do?"</h3>
           <div className="text-red-500 font-black text-xl">67% OF CITIZENS CONFUSED</div>
        </div>
      )
    },
    {
      id: 'c1-s5',
      chapter: 1,
      duration: 6000,
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-12">
          <div className="text-white/40 flex items-center gap-4">
             <span className="text-2xl line-through">9:00 AM</span>
             <ChevronRight className="w-6 h-6" />
             <span className="text-4xl font-bold text-white">3:00 PM</span>
          </div>
          
          <div className="space-y-6">
            <p className="text-2xl text-green-500 font-bold">The flood has passed. Zone 4 is safe.</p>
            <div className="glass-card p-4 border-red-500/50 max-w-xs mx-auto animate-pulse">
              <div className="text-[10px] text-red-500 font-bold mb-1">STILL SHOWING AT 8PM:</div>
              <p className="text-sm font-bold italic">"Evacuate immediately"</p>
            </div>
            <p className="text-white/60">The previous alert was not retracted, causing confusion.</p>
          </div>
        </div>
      )
    },
    {
      id: 'c1-s6',
      chapter: 1,
      duration: 6000,
      content: (
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="w-64 h-40 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-red-500/20" />
             <div className="absolute inset-0 bg-white/5 flex items-center justify-center transition-all duration-[2s]" style={{ clipPath: 'polygon(0 0, 60% 0, 60% 100%, 0% 100%)' }}>
                <span className="text-xs font-bold text-white/40">ZONE 4</span>
             </div>
             <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-white/10 flex items-center justify-center animate-pulse">
                <span className="text-[8px] font-black text-white/20 rotate-90">INVISIBLE</span>
             </div>
          </div>
          
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-bold text-red-500">The Language Gap</h3>
            <p className="text-white/80 max-w-md">40% of residents speak Hindi, Marathi, or Tamil. The alert was in English only.</p>
            <p className="text-white/40 text-sm">They never received a message they understood.</p>
          </div>
        </div>
      )
    },
    {
      id: 'c1-s7',
      chapter: 1,
      duration: 8000,
      content: (
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <h2 className="text-4xl font-black text-red-600 mb-12 text-center">SYSTEM INEFFICIENCIES</h2>
          <div className="space-y-4">
            <ResultRow label="Time to send first alert" value="47 Minutes" error delay="0s" />
            <ResultRow label="Message Consistency" value="23%" error delay="0.5s" />
            <ResultRow label="Language Coverage" value="1 Language" error delay="1s" />
            <ResultRow label="Citizen Confusion" value="67%" error delay="1.5s" />
            <ResultRow label="Alert Retraction" value="Never" error delay="2s" />
            <ResultRow label="Population Reach" value="60%" error delay="2.5s" />
          </div>
          <div className="text-center pt-12 animate-glitch text-4xl font-black text-red-700">MANUAL PROCESS LIMITATIONS</div>
        </div>
      )
    },

    /* ── TRANSITION ── */
    {
      id: 'transition',
      chapter: 2,
      duration: 3000,
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-6">
           <div className="text-6xl font-black text-white animate-assemble">UACS</div>
           <div className="text-2xl text-white/60 animate-fade-in" style={{ animationDelay: '1.5s' }}>Automated alert dispatch.</div>
           <div className="text-4xl font-black text-accent animate-fade-in" style={{ animationDelay: '2s' }}>The UACS Solution.</div>
        </div>
      )
    },

    /* ── CHAPTER 2: THE SOLUTION ── */
    {
      id: 'c2-s1',
      chapter: 3,
      duration: 4000,
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-8">
          <div className="flex items-center gap-4 text-accent">
            <Clock className="w-12 h-12" />
            <span className="text-4xl font-bold">9:00 AM</span>
          </div>
          <div className="space-y-4">
             <p className="text-2xl text-white/90">Same disaster. Zone 4. 3.2 million citizens.</p>
             <p className="text-5xl font-black text-accent animate-assemble" style={{ animationDelay: '1s' }}>WITH UACS...</p>
          </div>
        </div>
      )
    },
    {
      id: 'c2-s2',
      chapter: 3,
      duration: 6000,
      content: (
        <div className="flex flex-col items-center justify-center space-y-12">
          <div className="glass-card p-6 border-accent/30 w-full max-w-xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-accent/20">
                <div className="h-full bg-accent animate-shimmer" style={{ width: '45%' }} />
             </div>
             <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <Globe className="w-6 h-6 text-accent" />
                <span className="text-xs font-bold tracking-widest text-white/40 uppercase">UACS Unified Dashboard</span>
             </div>
             <div className="space-y-4">
                <div className="text-sm font-medium text-white/80 typewriter-cursor">
                  Flood warning issued for Zone 4. All residents must evacuate immediately to nearest relief camp. Carry essential documents only.
                </div>
             </div>
          </div>
          <div className="text-center">
             <div className="text-6xl font-black text-accent">45 SECONDS</div>
             <p className="text-white/60 mt-2 italic">One message. Written once.</p>
          </div>
        </div>
      )
    },
    {
      id: 'c2-s3',
      chapter: 3,
      duration: 6000,
      content: (
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-12 relative">
             <div className="w-32 h-32 rounded-3xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent relative z-10">
                <MessageSquare className="w-12 h-12" />
             </div>
             
             {/* Flow Beams */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-full h-full max-w-lg" viewBox="0 0 400 400">
                   {[0, 72, 144, 216, 288].map(angle => (
                     <line key={angle} x1="200" y1="200" x2={200 + 150 * Math.cos(angle * Math.PI / 180)} y2={200 + 150 * Math.sin(angle * Math.PI / 180)} stroke="var(--accent)" strokeWidth="2" className="animate-beam" opacity="0.3" />
                   ))}
                </svg>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-5 gap-4 relative z-10">
                <LangFlag flag="🇬🇧" label="English" delay="0s" />
                <LangFlag flag="🇮🇳" label="Hindi" delay="0.2s" />
                <LangFlag flag="🇮🇳" label="Marathi" delay="0.4s" />
                <LangFlag flag="🇮🇳" label="Tamil" delay="0.6s" />
                <LangFlag flag="🇮🇳" label="Telugu" delay="0.8s" />
             </div>
          </div>
          <div className="text-center mt-16 space-y-2">
             <div className="text-4xl font-black text-white">5 LANGUAGES. 3 SECONDS.</div>
             <p className="text-accent font-bold">Automated translation and formatting.</p>
          </div>
        </div>
      )
    },
    {
      id: 'c2-s4',
      chapter: 3,
      duration: 5000,
      content: (
        <div className="w-full max-w-2xl mx-auto space-y-8">
           <h3 className="text-2xl font-bold text-center text-white/80">Consistency Check</h3>
           <div className="space-y-4">
              <ConsistencyBar icon={MessageSquare} label="SMS Channel" score={96} delay="0s" />
              <ConsistencyBar icon={Globe} label="Twitter Channel" score={94} delay="0.2s" />
              <ConsistencyBar icon={Radio} label="Radio Channel" score={97} delay="0.4s" />
              <ConsistencyBar icon={Tv} label="TV Channel" score={95} delay="0.6s" />
           </div>
           <div className="text-center pt-4">
              <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-accent/20 border border-accent/40 text-accent font-black">
                 <CheckCircle2 className="w-5 h-5" /> OVERALL: 96% CONSISTENT
              </div>
           </div>
        </div>
      )
    },
    {
      id: 'c2-s5',
      chapter: 3,
      duration: 6000,
      content: (
        <div className="flex flex-col items-center justify-center space-y-12">
           <div className="relative">
              <button className="w-32 h-32 rounded-full bg-accent flex items-center justify-center text-white shadow-2xl shadow-accent/50 animate-pulse border-8 border-accent/20">
                 <Zap className="w-12 h-12 fill-white" />
              </button>
              <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
           </div>
           
           <div className="text-center space-y-4">
              <div className="text-5xl font-black text-white">SIMULTANEOUS DISPATCH</div>
              <div className="flex justify-center gap-6">
                <ChannelIcon icon={MessageSquare} active delay="0s" />
                <ChannelIcon icon={Globe} active delay="0.2s" />
                <ChannelIcon icon={Radio} active delay="0.4s" />
                <ChannelIcon icon={Tv} active delay="0.6s" />
              </div>
              <div className="text-accent text-3xl font-black mt-8">2 MINUTES TOTAL</div>
           </div>
        </div>
      )
    },
    {
      id: 'c2-s6',
      chapter: 3,
      duration: 5000,
      content: (
        <div className="flex flex-col items-center justify-center space-y-8">
           <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center animate-float">
             <span className="text-5xl">👍</span>
           </div>
           
           <div className="grid grid-cols-1 gap-3 w-full max-sm:max-w-xs w-full max-w-sm">
             <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl text-accent font-bold text-center">📱 SMS: "🚨 CRITICAL: Evacuate Zone 4 now"</div>
             <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl text-accent font-bold text-center italic">बाढ़ की चेतावनी जोन 4...</div>
           </div>

           <div className="text-center space-y-2">
             <h3 className="text-3xl font-bold text-white">Clear Instruction. No Confusion.</h3>
             <p className="text-white/60 italic">Citizen acts confidently in seconds.</p>
           </div>
        </div>
      )
    },
    {
      id: 'c2-s7',
      chapter: 3,
      duration: 6000,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl mx-auto items-center">
           <div className="glass-card p-4 border-accent/20 max-w-[200px] mx-auto rounded-[32px] border-4 aspect-[9/19] relative overflow-hidden bg-black shadow-2xl">
              <div className="absolute top-0 inset-x-0 h-4 bg-white/10 rounded-b-xl" />
              <div className="pt-8 space-y-4 p-2">
                 <div className="p-3 rounded-xl bg-red-500 text-[8px] font-bold text-white animate-pulse">🚨 FLOOD WARNING ACTIVE</div>
                 <div className="text-[10px] text-white/90 text-center font-bold">Are you safe?</div>
                 <div className="grid gap-2">
                    <div className="p-2 rounded bg-accent text-[8px] text-center font-black text-white">YES, I AM SAFE</div>
                    <div className="p-2 rounded bg-white/10 text-[8px] text-center font-bold text-white/60">NEED HELP</div>
                 </div>
              </div>
           </div>
           
           <div className="space-y-6">
              <h3 className="text-2xl font-bold text-accent">Safety Check-In</h3>
              <div className="grid grid-cols-1 gap-3">
                 <LiveStat label="Marked Safe" value={1247} color="text-green-500" />
                 <LiveStat label="Need Help" value={8} color="text-red-500" highlight />
                 <LiveStat label="No Response" value={203} color="text-white/40" />
              </div>
              <p className="text-white/60 text-sm italic">Authorities notified of the 8 help requests instantly.</p>
           </div>
        </div>
      )
    },
    {
      id: 'c2-s8',
      chapter: 3,
      duration: 6000,
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-12">
          <div className="flex items-center gap-4">
             <span className="text-4xl font-bold text-white">3:00 PM</span>
          </div>
          
          <div className="space-y-8">
            <div className="flex justify-center gap-4">
               <ChannelRetractIcon icon={MessageSquare} />
               <ChannelRetractIcon icon={Globe} />
               <ChannelRetractIcon icon={Radio} />
               <ChannelRetractIcon icon={Tv} />
            </div>
            
            <div className="glass-card p-4 border-accent/50 max-w-sm mx-auto bg-accent/5">
              <div className="text-[10px] text-accent font-bold mb-1">AUTOMATIC ALL CLEAR:</div>
              <p className="text-sm font-bold">"Zone 4 all clear. You may return safely."</p>
            </div>
            <p className="text-accent font-black text-2xl">ZERO OUTDATED ALERTS.</p>
          </div>
        </div>
      )
    },

    /* ── CHAPTER 3: THE RESULTS ── */
    {
      id: 'results',
      chapter: 4,
      duration: 10000,
      content: (
        <div className="w-full max-w-4xl mx-auto space-y-12">
           <h2 className="text-5xl font-black text-center text-white mb-16">THE FINAL VERDICT</h2>
           
           <div className="grid grid-cols-[1fr_120px_120px] gap-8 px-8 items-end mb-4 text-[10px] uppercase font-black tracking-widest text-white/40">
              <div>METRIC</div>
              <div className="text-center">OLD WAY</div>
              <div className="text-center text-accent">UACS</div>
           </div>

           <div className="space-y-4">
             <FinalCompareRow label="Response Time" oldVal="47m" newVal="2m" delay="0s" />
             <FinalCompareRow label="Languages" oldVal="1" newVal="5" delay="0.2s" />
             <FinalCompareRow label="Consistency" oldVal="23%" newVal="96%" delay="0.4s" />
             <FinalCompareRow label="Citizen Confusion" oldVal="67%" newVal="4%" delay="0.6s" />
             <FinalCompareRow label="Auto-Retract" oldVal="Never" newVal="Always" delay="0.8s" />
             <FinalCompareRow label="Population Reach" oldVal="60%" newVal="100%" delay="1s" />
           </div>

           <div className="text-center pt-16 animate-fade-in" style={{ animationDelay: '2s' }}>
              <p className="text-3xl font-light text-white/80">Automated communication.</p>
              <p className="text-6xl font-black text-accent mt-4 animate-assemble">FASTER RESPONSE.</p>
           </div>
        </div>
      )
    }
  ];

  const totalScenes = scenes.length;

  const handleNext = () => {
    if (currentScene < totalScenes - 1) {
      setCurrentScene(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentScene(0);
    setShowResults(false);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && !showResults) {
      const scene = scenes[currentScene];
      timerRef.current = setTimeout(handleNext, scene.duration);
      return () => clearTimeout(timerRef.current);
    }
  }, [currentScene, isPlaying, showResults]);

  // Global Key Listeners
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.code === 'Space') {
        setIsPlaying(p => !p);
      } else if (e.code === 'Escape') {
        setShowResults(true);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  const progress = ((currentScene + 1) / totalScenes) * 100;
  const activeScene = scenes[currentScene];

  if (showResults) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col items-center justify-center p-8 cinematic-bg animate-fade-in">
        <div className="text-center space-y-12">
          <div className="text-8xl font-black text-white opacity-20 mb-12">UACS</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">One Message. Every Channel.</h2>
            <h2 className="text-4xl font-bold text-accent">Every Language. Every Citizen.</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 pt-12">
            <button onClick={handleRestart} className="flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-black transition-all">
               <RotateCcw className="w-5 h-5" /> WATCH AGAIN
            </button>
            <button onClick={() => navigate('/compose')} className="flex items-center gap-2 px-8 py-4 rounded-full bg-accent hover:scale-105 text-white font-black transition-all shadow-2xl shadow-accent/40">
               TRY UACS LIVE <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-white/40 text-sm pt-8 italic">You just watched a 3 minute simulation of what UACS solves.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col text-white cinematic-bg overflow-hidden">
      {/* Cinematic Top Bar */}
      <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md relative z-50">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
               <Activity className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-lg font-black tracking-tighter uppercase">UACS <span className="text-accent">SIMULATION</span></h1>
               <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Chapter {activeScene.chapter} of 4 • {activeScene.id}
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button 
              onClick={handleNext}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-4 h-10 rounded-full flex items-center gap-2 bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-colors"
            >
               <X className="w-4 h-4" /> EXIT
            </button>
         </div>
      </div>

      {/* Main Screen */}
      <main className="flex-1 relative flex items-center justify-center p-12 overflow-hidden">
         {activeScene.content}
         
         {/* Background Visualizers */}
         <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent pointer-events-none" />
      </main>

      {/* Progress Footer */}
      <div className="h-4 bg-white/5 relative">
         <div 
           className="absolute inset-y-0 left-0 bg-accent transition-all duration-300 ease-linear shadow-[0_0_20px_var(--accent)]" 
           style={{ width: `${progress}%` }} 
         />
         {/* Markers */}
         <div className="absolute inset-0 flex">
            <div className="flex-1 border-r border-white/20" />
            <div className="flex-1 border-r border-white/20" />
            <div className="flex-1 border-r border-white/20" />
            <div className="flex-1" />
         </div>
      </div>
    </div>
  );
}

/* ── UI Components ───────────────────────────────────────── */

function DeskCard({ icon: Icon, label, delay }) {
  return (
    <div className="glass-card p-6 border-white/10 bg-white/5 animate-slide-up text-center space-y-4" style={{ animationDelay: delay }}>
       <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 flex items-center justify-center text-white/40">
          <Icon className="w-6 h-6" />
       </div>
       <div className="font-bold text-sm text-white/80">{label}</div>
       <div className="flex justify-center gap-1">
          <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
          <div className="w-1 h-1 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-1 h-1 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
       </div>
    </div>
  );
}

function MessageBubble({ icon: Icon, channel, text, delay, error }) {
  return (
    <div className="flex gap-4 animate-slide-up relative" style={{ animationDelay: delay }}>
       <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${error ? 'bg-red-500/20 text-red-500' : 'bg-accent/20 text-accent'}`}>
          <Icon className="w-5 h-5" />
       </div>
       <div className="flex-1 glass-card p-4 border-white/10 relative overflow-hidden">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">{channel} MESSAGE</div>
          <p className="text-sm italic text-white/80">"{text}"</p>
          {error && <div className="absolute top-2 right-2 text-red-500 font-black animate-pulse">❌</div>}
       </div>
    </div>
  );
}

function LangFlag({ flag, label, delay }) {
  return (
    <div className="flex flex-col items-center gap-2 animate-scale-up" style={{ animationDelay: delay }}>
       <div className="text-4xl">{flag}</div>
       <div className="text-[10px] font-bold text-white/40 uppercase">{label}</div>
       <div className="text-[8px] text-accent animate-fade-in" style={{ animationDelay: `${parseFloat(delay)+0.5}s` }}>SUCCESS ✅</div>
    </div>
  );
}

function ConsistencyBar({ icon: Icon, label, score, delay }) {
  return (
    <div className="space-y-2 animate-slide-up" style={{ animationDelay: delay }}>
       <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2">
             <Icon className="w-4 h-4 text-white/40" />
             <span>{label}</span>
          </div>
          <span className="text-accent">{score}% ✅</span>
       </div>
       <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${score}%` }} />
       </div>
    </div>
  );
}

function ResultRow({ label, value, error, delay }) {
  return (
    <div className="flex items-center justify-between p-4 glass-card border-white/5 animate-slide-up" style={{ animationDelay: delay }}>
       <span className="text-sm font-medium text-white/60">{label}</span>
       <span className={`text-lg font-black ${error ? 'text-red-500' : 'text-accent'}`}>{value}</span>
    </div>
  );
}

function LiveStat({ label, value, color, highlight }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 ${highlight ? 'animate-pulse bg-red-500/5 border-red-500/20' : ''}`}>
       <span className="text-xs text-white/60">{label}</span>
       <span className={`text-sm font-black ${color}`}>{value.toLocaleString()}</span>
    </div>
  );
}

function ChannelIcon({ icon: Icon, active, delay }) {
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${active ? 'bg-accent text-white scale-110 shadow-lg' : 'bg-white/5 text-white/20'}`} style={{ transitionDelay: delay }}>
       <Icon className="w-6 h-6" />
    </div>
  );
}

function ChannelRetractIcon({ icon: Icon }) {
  return (
    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent relative">
       <Icon className="w-5 h-5" />
       <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white">✓</div>
    </div>
  );
}

function FinalCompareRow({ label, oldVal, newVal, delay }) {
  return (
    <div className="grid grid-cols-[1fr_120px_120px] gap-8 px-8 py-4 glass-card border-white/5 animate-slide-up" style={{ animationDelay: delay }}>
       <div className="text-sm font-bold text-white/80 uppercase tracking-wider">{label}</div>
       <div className="text-center font-black text-red-500 text-lg opacity-60">{oldVal}</div>
       <div className="text-center font-black text-accent text-2xl animate-assemble">{newVal}</div>
    </div>
  );
}
