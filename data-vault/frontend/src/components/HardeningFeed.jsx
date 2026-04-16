import { CheckCircle, XCircle, AlertTriangle, MapPin, Clock, QrCode, RefreshCw } from 'lucide-react';
import { useScans } from '../hooks/useData';

function FactorDot({ pass, label }) {
  return (
    <span
      title={label}
      className={`w-1.5 h-1.5 rounded-full ${pass ? 'bg-vault-green' : 'bg-vault-red'}`}
    />
  );
}

function StatusIcon({ status }) {
  if (status === 'hardened') return <CheckCircle size={13} className="text-vault-green flex-shrink-0" />;
  if (status === 'flagged')  return <AlertTriangle size={13} className="text-vault-amber flex-shrink-0" />;
  return <XCircle size={13} className="text-vault-red flex-shrink-0" />;
}

function FeedRow({ scan }) {
  const time = new Date(scan.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const statusBadgeClass =
    scan.status === 'hardened' ? 'badge badge-green' :
    scan.status === 'flagged'  ? 'badge badge-amber' : 'badge badge-red';

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      <StatusIcon status={scan.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-vault-text truncate">{scan.participant_name}</span>
          <span className={statusBadgeClass}>{scan.status}</span>
          <span className="badge badge-blue">{scan.action_type?.replace(/_/g, ' ')}</span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-[11px] text-vault-muted flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {scan.site_name}
            {scan.distance_from_centroid_m != null && (
              <span className="ml-0.5">· {Math.round(scan.distance_from_centroid_m)}m</span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            Δt {scan.timestamp_delta_seconds ?? '—'}s
          </span>
          <span className="flex items-center gap-1">
            <QrCode size={10} />
            QR
          </span>
        </div>

        {scan.flagged_reason && (
          <div className="mt-1 text-[11px] text-vault-amber truncate">{scan.flagged_reason}</div>
        )}
      </div>

      {/* Triple-Factor dots */}
      <div className="flex items-center gap-1 flex-shrink-0" title="QR · GPS · Time">
        <FactorDot pass={scan.factor_qr_pass}   label="QR HMAC" />
        <FactorDot pass={scan.factor_gps_pass}   label="GPS geofence" />
        <FactorDot pass={scan.factor_time_pass}  label="Timestamp" />
      </div>

      <div className="text-[10px] text-vault-muted flex-shrink-0">{time}</div>
    </div>
  );
}

export default function HardeningFeed() {
  const { data, loading, error, refetch } = useScans({ limit: 40 });
  const scans = data?.data || [];

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-vault-green animate-pulse" />
          Real-time hardening feed
        </div>
        <div className="flex items-center gap-3 text-vault-muted">
          <span className="text-[10px]">QR · GPS · Time</span>
          <button onClick={refetch} className="hover:text-vault-text transition-colors" aria-label="Refresh">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-1">
        {loading && (
          <div className="flex items-center justify-center h-32 text-vault-muted text-sm">Loading feed…</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-32 text-vault-red text-sm">
            Error: {error}
          </div>
        )}
        {!loading && scans.length === 0 && (
          <div className="flex items-center justify-center h-32 text-vault-muted text-sm">No scans yet</div>
        )}
        {scans.map((scan) => (
          <FeedRow key={scan.id} scan={scan} />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-white/[0.05] text-[10px] text-vault-muted">
        {data?.total != null && `${data.total} total scans`} · Auto-refreshes every 8s
      </div>
    </div>
  );
}
