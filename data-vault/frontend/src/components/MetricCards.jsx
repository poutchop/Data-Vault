import { Activity, CheckCircle, Leaf, Wallet, Lock } from 'lucide-react';
import { useScanStats } from '../hooks/useData';

function MetricCard({ label, value, sub, icon: Icon, color, isMasked, onOpenGate }) {
  return (
    <div 
      className={`metric-card flex flex-col gap-1 relative overflow-hidden ${isMasked ? 'cursor-pointer group' : ''}`}
      onClick={isMasked ? onOpenGate : undefined}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-vault-muted uppercase tracking-wider">{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      
      {isMasked ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xl font-bold text-vault-muted/40 blur-[2px] select-none">
            ••••••••
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-vault-amber font-medium mt-1">
            <Lock size={10} />
            Admin Only
          </div>
        </div>
      ) : (
        <>
          <div className="text-2xl font-semibold leading-none" style={{ color }}>
            {value ?? '—'}
          </div>
          <div className="text-[11px] text-vault-muted mt-1">{sub}</div>
        </>
      )}

      {isMasked && (
        <div className="absolute inset-0 bg-vault-green/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] font-bold text-vault-green uppercase tracking-widest">Click to Unlock</span>
        </div>
      )}
    </div>
  );
}

export default function MetricCards({ isAdmin, onOpenGate }) {
  const { data, loading } = useScanStats();
  const d = data?.data || {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Scans today"
        value={loading ? '…' : d.scans_today ?? 0}
        sub={`${d.hardened_today ?? 0} hardened · ${d.flagged_today ?? 0} flagged`}
        icon={Activity}
        color="#10d97e"
        isAdmin={isAdmin}
      />
      <MetricCard
        label="Verification rate"
        value={loading ? '…' : `${d.verification_rate_pct ?? 0}%`}
        sub="Triple-factor pass rate"
        icon={CheckCircle}
        color="#4d9fff"
        isAdmin={isAdmin}
      />
      <MetricCard
        label="CO₂ avoided (kg)"
        value={loading ? '…' : Number(d.co2_avoided_kg ?? 0).toLocaleString()}
        sub={`${d.active_participants ?? 0} active participants`}
        icon={Leaf}
        color="#f4a134"
        isMasked={!isAdmin}
        onOpenGate={onOpenGate}
      />
      <MetricCard
        label="Payouts sent"
        value={loading ? '…' : `GHS ${Number(d.total_payouts_ghs ?? 0).toFixed(2)}`}
        sub="MTN & Telecel Mobile Money"
        icon={Wallet}
        color="#9d7dff"
        isMasked={!isAdmin}
        onOpenGate={onOpenGate}
      />
    </div>
  );
}
