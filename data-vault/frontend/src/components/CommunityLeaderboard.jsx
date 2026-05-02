import { Trophy, Star, TrendingUp } from 'lucide-react';
import { useLeaderboard } from '../hooks/useData';

const MEDAL_COLORS = ['#f4c430', '#c0c0c0', '#cd7f32'];

function RankBadge({ rank }) {
  const color = MEDAL_COLORS[rank - 1] || '#8b8fa8';
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
      style={{ background: color, color: rank <= 3 ? '#111' : '#8b8fa8' }}
    >
      {rank}
    </div>
  );
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1 bg-vault-surface2 rounded-full overflow-hidden flex-1">
      <div
        className="h-full bg-vault-green rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Static demo data used when API is unavailable
const DEMO = [
  { id: '1', full_name: 'Akosua Mensah',  site_name: 'Farm A', cooperative: 'Berekuso Coop', total_points: 142, hardened_scans: 47, total_payouts_ghs: '11.83', rank: 1 },
  { id: '2', full_name: 'Ama Asante',     site_name: 'Farm A', cooperative: 'Berekuso Coop', total_points: 138, hardened_scans: 46, total_payouts_ghs: '11.50', rank: 2 },
  { id: '3', full_name: 'Abena Owusu',    site_name: 'Farm B', cooperative: 'Berekuso Coop', total_points: 131, hardened_scans: 43, total_payouts_ghs: '10.92', rank: 3 },
  { id: '4', full_name: 'Adwoa Boateng',  site_name: 'Farm B', cooperative: 'Berekuso Coop', total_points: 119, hardened_scans: 39, total_payouts_ghs: '9.92',  rank: 4 },
  { id: '5', full_name: 'Akua Nkrumah',   site_name: 'Farm A', cooperative: 'Berekuso Coop', total_points: 107, hardened_scans: 35, total_payouts_ghs: '8.92',  rank: 5 },
  { id: '6', full_name: 'Yaa Frimpong',   site_name: 'Co-op W', cooperative: 'Nsawam Coop',  total_points: 98,  hardened_scans: 32, total_payouts_ghs: '8.17',  rank: 6 },
];

export default function CommunityLeaderboard({ isAdmin }) {
  const { data, loading } = useLeaderboard({ limit: 20 });
  const participants = data?.data?.length ? data.data : DEMO;
  const maxPoints    = participants[0]?.total_points || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* Main leaderboard */}
      <div className="card lg:col-span-2">
        <div className="card-header">
          <Trophy size={13} className="text-vault-amber" />
          Community champion leaderboard — Week 4
          <span className="ml-auto text-[10px] text-vault-muted">Auto-refreshes every 30s</span>
        </div>
        <div className="card-body p-0">
          {loading && (
            <div className="flex items-center justify-center h-48 text-vault-muted text-sm">Loading…</div>
          )}
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <RankBadge rank={Number(p.rank)} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-vault-text">{p.full_name}</span>
                  {Number(p.rank) <= 3 && <Star size={10} className="text-vault-amber" />}
                </div>
                <div className="text-[10px] text-vault-muted mt-0.5">{p.site_name} · {p.cooperative}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <ProgressBar value={p.total_points} max={maxPoints} />
                  <span className="text-[10px] text-vault-muted flex-shrink-0">{p.hardened_scans} scans</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-vault-green">{p.total_points}</div>
                <div className="text-[10px] text-vault-muted">pts</div>
              </div>

              <div className="text-right flex-shrink-0 hidden sm:block min-w-[70px]">
                {isAdmin ? (
                  <>
                    <div className="text-xs font-medium text-vault-purple">GHS {Number(p.total_payouts_ghs).toFixed(2)}</div>
                    <div className="text-[10px] text-vault-muted">earned</div>
                  </>
                ) : (
                  <div className="flex flex-col items-end opacity-40">
                    <div className="text-[10px] font-bold text-vault-muted blur-[2px]">GHS 88.88</div>
                    <Lock size={8} className="mt-0.5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Points key + next payout */}
      <div className="flex flex-col gap-4">
        <div className="card">
          <div className="card-header">
            <TrendingUp size={13} className="text-vault-blue" />
            Points key
          </div>
          <div className="card-body flex flex-col gap-2">
            {[
              { label: 'Firewood avoidance scan', pts: '+3 pts', color: 'text-vault-green' },
              { label: 'Nutrition meal logged',   pts: '+2 pts', color: 'text-vault-blue'  },
              { label: 'Solar drying logged',     pts: '+2 pts', color: 'text-vault-amber' },
              { label: 'Full week completed',     pts: '+10 bonus', color: 'text-vault-purple' },
            ].map(({ label, pts, color }) => (
              <div key={label} className="flex items-center justify-between bg-vault-surface2 rounded-lg px-3 py-2">
                <span className="text-xs text-vault-text">{label}</span>
                <span className={`text-xs font-bold ${color}`}>{pts}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Next group payout</div>
          <div className="card-body">
            <div className="bg-vault-green/10 border border-vault-green/20 rounded-lg p-3">
              <div className="text-xs font-semibold text-vault-green">Friday 18 Apr 2026</div>
              <div className="text-[11px] text-vault-muted mt-1">6 participants eligible</div>
              <div className="text-[11px] text-vault-muted">GHS 30.00 total · MTN & Telecel</div>
            </div>
            <div className="mt-3 text-[10px] text-vault-muted">
              Threshold: 100 pts = GHS 5.00 payout via Mobile Money
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
