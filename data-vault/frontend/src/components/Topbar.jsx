import { Shield, Sun, Moon, Wifi } from 'lucide-react';

export default function Topbar({ darkMode, onToggleDark }) {
  return (
    <header className="bg-vault-surface border-b border-white/[0.08] px-6 py-3 flex items-center gap-4 sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-vault-green/20 border border-vault-green/30 flex items-center justify-center">
          <Shield size={14} className="text-vault-green" />
        </div>
        <div>
          <span className="text-sm font-semibold text-vault-text tracking-tight">DATA VAULT</span>
          <span className="ml-2 text-xs text-vault-muted font-normal">by Carbon Clarity</span>
        </div>
      </div>

      {/* Pilot badge */}
      <div className="ml-2 px-2.5 py-1 bg-vault-surface2 rounded-md text-[11px] text-vault-muted border border-white/[0.06]">
        Berekuso Pilot · Week 4
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-1.5 ml-auto text-vault-green text-[11px]">
        <Wifi size={12} />
        <span className="font-medium">Live hardening feed</span>
        <span className="w-1.5 h-1.5 rounded-full bg-vault-green animate-pulse" />
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={onToggleDark}
        className="ml-4 p-2 rounded-lg bg-vault-surface2 border border-white/[0.08] text-vault-muted hover:text-vault-text transition-colors"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
      </button>
    </header>
  );
}
