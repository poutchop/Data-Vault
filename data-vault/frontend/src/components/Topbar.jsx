import { Shield, Sun, Moon, Wifi, Lock } from 'lucide-react';

export default function Topbar({ darkMode, onToggleDark, isAdmin, onOpenGate }) {
  return (
    <header className="h-16 bg-vault-surface border-b border-white/[0.08] px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-vault-green/20 border border-vault-green/30 flex items-center justify-center">
          <Shield size={14} className="text-vault-green" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-vault-text tracking-tight uppercase">Data Vault</h1>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-vault-muted font-medium">Berekuso Pilot</span>
            {isAdmin ? (
              <span className="flex items-center gap-1 text-[9px] bg-vault-green/10 text-vault-green px-1.5 py-0.5 rounded border border-vault-green/20">
                <Lock size={8} /> ADMIN
              </span>
            ) : (
              <span className="text-[9px] bg-vault-surface2 text-vault-muted px-1.5 py-0.5 rounded border border-white/[0.05]">
                GUEST
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!isAdmin && (
          <button 
            onClick={onOpenGate}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vault-surface2 border border-white/[0.05] text-xs text-vault-muted hover:text-vault-text transition-colors"
          >
            <Lock size={12} />
            Admin Login
          </button>
        )}

        <div className="flex items-center gap-2 pr-4 border-r border-white/[0.06] hidden md:flex">
          <div className="flex items-center gap-1.5 text-vault-green text-[10px] font-medium">
            <Wifi size={12} />
            LIVE
          </div>
        </div>

        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg hover:bg-white/[0.04] text-vault-muted transition-colors"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-vault-green to-vault-blue p-0.5">
            <div className="w-full h-full rounded-full bg-vault-bg flex items-center justify-center text-[10px] font-bold">
              {isAdmin ? 'AC' : 'G'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
