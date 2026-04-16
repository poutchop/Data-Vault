import { useState } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../utils/api';

function FactorRow({ label, pass, detail, sublabel }) {
  return (
    <div className={`rounded-lg p-3 border ${pass ? 'border-vault-green/30 bg-vault-green/5' : 'border-vault-red/30 bg-vault-red/5'}`}>
      <div className="text-[10px] font-semibold tracking-widest text-vault-muted mb-1">{label}</div>
      <div className="flex items-center gap-2">
        {pass
          ? <CheckCircle size={13} className="text-vault-green flex-shrink-0" />
          : <XCircle size={13} className="text-vault-red flex-shrink-0" />
        }
        <span className={`text-xs font-semibold ${pass ? 'text-vault-green' : 'text-vault-red'}`}>{detail}</span>
      </div>
      {sublabel && <div className="text-[10px] text-vault-muted mt-0.5 pl-5">{sublabel}</div>}
    </div>
  );
}

// Demo verifier — submits a test payload so devs can see the engine live
export default function VerifierPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simGpsFail, setSimGpsFail] = useState(false);

  const runDemo = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        board_id: '00000000-0000-0000-0000-000000000001',
        qr_hmac_received: 'a'.repeat(64),
        gps_lat: simGpsFail ? 5.8 : 5.7458,
        gps_lng: -0.3212,
        gps_accuracy_m: 12,
        scan_time_device: new Date().toISOString(),
      };
      const res = await api.postVerify(payload);
      setResult(res);
    } catch (err) {
      // Show a mock result in dev if the API is not running
      setResult({
        hardened: !simGpsFail,
        status: simGpsFail ? 'flagged' : 'hardened',
        factors: {
          qr:        { pass: true },
          gps:       { pass: !simGpsFail, distance_m: simGpsFail ? 4823 : 84 },
          timestamp: { pass: true, delta_seconds: 4 },
        },
        points_awarded: simGpsFail ? 0 : 3,
        flagged_reason: simGpsFail ? 'GPS outside geofence (4823m)' : null,
        _demo: true,
        _error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const r = result;

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">Triple-factor verifier</div>

      <div className="card-body flex-1 flex flex-col gap-3">
        {!r && (
          <div className="text-[11px] text-vault-muted">
            Run a live verification against the hardening engine to see the Triple-Factor breakdown.
          </div>
        )}

        {r && (
          <>
            <div className="text-[11px] text-vault-muted mb-1">
              {r._demo ? 'Demo result' : `scan_id: ${r.scan_id?.slice(0,8)}…`}
            </div>
            <FactorRow
              label="FACTOR 1 · QR HMAC"
              pass={r.factors.qr.pass}
              detail={r.factors.qr.pass ? 'Signature matched' : 'Mismatch'}
              sublabel="HMAC-SHA256 board token verified"
            />
            <FactorRow
              label="FACTOR 2 · GPS GEOFENCE"
              pass={r.factors.gps.pass}
              detail={r.factors.gps.pass ? `✓ ${r.factors.gps.distance_m}m from centroid` : `✗ ${r.factors.gps.distance_m}m — outside 200m fence`}
              sublabel="Haversine distance check"
            />
            <FactorRow
              label="FACTOR 3 · TIMESTAMP"
              pass={r.factors.timestamp.pass}
              detail={`Δt = ${r.factors.timestamp.delta_seconds}s`}
              sublabel="Within ±90 min NTP-synced window"
            />

            <div className={`rounded-lg p-3 border ${r.hardened ? 'border-vault-green/40 bg-vault-green/10' : 'border-vault-amber/40 bg-vault-amber/10'}`}>
              <div className={`text-xs font-semibold ${r.hardened ? 'text-vault-green' : 'text-vault-amber'}`}>
                {r.hardened ? 'HARDENED — Payout queued' : 'FLAGGED — Payout blocked'}
              </div>
              {r.flagged_reason && (
                <div className="text-[10px] text-vault-muted mt-0.5">{r.flagged_reason}</div>
              )}
              {r.hardened && (
                <div className="text-[10px] text-vault-muted mt-0.5">+{r.points_awarded} pts awarded</div>
              )}
            </div>
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <label className="flex items-center gap-2 text-[11px] text-vault-muted cursor-pointer">
            <input
              type="checkbox"
              checked={simGpsFail}
              onChange={(e) => setSimGpsFail(e.target.checked)}
              className="rounded"
            />
            Simulate GPS failure (outside geofence)
          </label>
          <button
            onClick={runDemo}
            disabled={loading}
            className="btn btn-green w-full justify-center py-2 text-xs"
          >
            {loading ? <Loader size={12} className="animate-spin" /> : null}
            {loading ? 'Verifying…' : 'Run verification →'}
          </button>
        </div>
      </div>
    </div>
  );
}
