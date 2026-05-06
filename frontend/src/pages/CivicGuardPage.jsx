import CGACitizenPanel from '../components/CGACitizenPanel';

export default function CivicGuardPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="border-b border-theme-border pb-4">
        <h1 className="text-2xl font-black tracking-tight text-theme-primary">CivicGuard AI</h1>
        <p className="text-sm text-theme-muted mt-1">
          Verify suspicious news, WhatsApp forwards, links, or screenshots instantly using multi-modal AI analysis.
        </p>
      </div>
      <div className="glass-card rounded-3xl overflow-hidden border-0 shadow-2xl bg-theme-surface">
        <CGACitizenPanel />
      </div>
    </div>
  );
}
