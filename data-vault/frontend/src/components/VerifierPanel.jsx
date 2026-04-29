import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader, MapPin, AlertTriangle, Keyboard } from 'lucide-react';
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

export default function VerifierPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simGpsFail, setSimGpsFail] = useState(false);
  
  // GPS Hardening State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsTimeout, setGpsTimeout] = useState(false);
  const [timer, setTimer] = useState(10);
  const [manualMode, setManualMode] = useState(false);
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  
  const timerRef = useRef(null);

  const startGpsAcquisition = () => {
    setGpsLoading(true);
    setGpsTimeout(false);
    setTimer(10);
    setManualMode(false);
    
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGpsLoading(false);
          setGpsTimeout(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopGpsAcquisition = (success = true) => {
    clearInterval(timerRef.current);
    setGpsLoading(false);
    if (success) runDemo();
  };

  const runDemo = async () => {
    setLoading(true);
    setResult(null);
    try {
      const finalLat = manualMode ? parseFloat(coords.lat) : (simGpsFail ? 5.8 : 5.7458);
      const finalLng = manualMode ? parseFloat(coords.lng) : -0.3212;

      const payload = {
        board_id: '00000000-0000-0000-0000-000000000001',
        qr_hmac_received: 'a'.repeat(64),
        gps_lat: finalLat,
        gps_lng: finalLng,
        gps_accuracy_m: manualMode ? 0 : 12,
        scan_time_device: new Date().toISOString(),
      };
      const res = await api.postVerify(payload);
      setResult(res);
    } catch (err) {
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
      });
    } finally {
      setLoading(false);
      setGpsTimeout(false);
      setManualMode(false);
    }
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header flex items-center justify-between">
        <span>Triple-factor verifier</span>
        {gpsLoading && (
          <span className="flex items-center gap-1.5 text-vault-amber text-[10px] font-mono">
            <Loader size={10} className="animate-spin" /> {timer}s
          </span>
        )}
      </div>

      <div className="card-body flex-1 flex flex-col gap-3">
        {!result && !gpsLoading && !gpsTimeout && !manualMode && (
          <div className="text-[11px] text-vault-muted">
            Run a live verification against the hardening engine to see the Triple-Factor breakdown.
          </div>
        )}

        {/* GPS Acquisition UI */}
        {gpsLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-vault-amber/10 flex items-center justify-center mb-4 animate-pulse">
              <MapPin className="text-vault-amber" size={24} />
            </div>
            <div className="text-sm font-semibold text-vault-text mb-1">Acquiring GPS Satellite...</div>
            <p className="text-[11px] text-vault-muted max-w-[200px]">
              Waiting for high-accuracy coordinates from your device.
            </p>
            <button 
              onClick={() => stopGpsAcquisition(true)}
              className="mt-6 text-[10px] text-vault-muted hover:text-vault-text underline uppercase tracking-wider"
            >
              Skip Wait (Demo Only)
            </button>
          </div>
        )}

        {/* GPS Timeout / Manual Fallback UI */}
        {gpsTimeout && !manualMode && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-vault-red/10 flex items-center justify-center mb-4">
              <AlertTriangle className="text-vault-red" size={24} />
            </div>
            <div className="text-sm font-semibold text-vault-text mb-1">GPS Lock Failed</div>
            <p className="text-[11px] text-vault-muted mb-6 leading-relaxed">
              Connectivity is poor. Satellite acquisition timed out after 10 seconds.
            </p>
            <div className="flex flex-col w-full gap-2">
              <button 
                onClick={() => setManualMode(true)}
                className="btn border border-white/[0.1] bg-vault-surface2 hover:bg-vault-surface text-xs justify-center py-2"
              >
                <Keyboard size={14} className="mr-2" /> Manual Entry
              </button>
              <button 
                onClick={startGpsAcquisition}
                className="btn btn-green text-xs justify-center py-2"
              >
                Retry GPS Scan
              </button>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        {manualMode && (
          <div className="flex-1 flex flex-col gap-4 p-2">
            <div className="text-xs font-semibold text-vault-text">Manual Coordinate Entry</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-vault-muted uppercase">Latitude</label>
                <input 
                  type="number" 
                  value={coords.lat}
                  onChange={(e) => setCoords({...coords, lat: e.target.value})}
                  className="w-full bg-vault-surface2 border border-white/[0.1] rounded p-2 text-xs text-vault-text"
                  placeholder="5.7458"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-vault-muted uppercase">Longitude</label>
                <input 
                  type="number" 
                  value={coords.lng}
                  onChange={(e) => setCoords({...coords, lng: e.target.value})}
                  className="w-full bg-vault-surface2 border border-white/[0.1] rounded p-2 text-xs text-vault-text"
                  placeholder="-0.3212"
                />
              </div>
            </div>
            <button 
              onClick={runDemo}
              className="btn btn-green w-full justify-center py-2 mt-auto text-xs"
            >
              Verify with Manual Coords
            </button>
          </div>
        )}

        {/* Result UI */}
        {result && (
          <>
            <div className="text-[11px] text-vault-muted mb-1">
              {result._demo ? 'Demo result' : `scan_id: ${result.scan_id?.slice(0,8)}…`}
            </div>
            <FactorRow
              label="FACTOR 1 · QR HMAC"
              pass={result.factors.qr.pass}
              detail={result.factors.qr.pass ? 'Signature matched' : 'Mismatch'}
              sublabel="HMAC-SHA256 board token verified"
            />
            <FactorRow
              label="FACTOR 2 · GPS GEOFENCE"
              pass={result.factors.gps.pass}
              detail={result.factors.gps.pass ? `✓ ${result.factors.gps.distance_m}m from centroid` : `✗ ${result.factors.gps.distance_m}m — outside 200m fence`}
              sublabel="Haversine distance check"
            />
            <FactorRow
              label="FACTOR 3 · TIMESTAMP"
              pass={result.factors.timestamp.pass}
              detail={`Δt = ${result.factors.timestamp.delta_seconds}s`}
              sublabel="Within ±90 min NTP-synced window"
            />

            <div className={`rounded-lg p-3 border ${result.hardened ? 'border-vault-green/40 bg-vault-green/10' : 'border-vault-amber/40 bg-vault-amber/10'}`}>
              <div className={`text-xs font-semibold ${result.hardened ? 'text-vault-green' : 'text-vault-amber'}`}>
                {result.hardened ? 'HARDENED — Payout queued' : 'FLAGGED — Payout blocked'}
              </div>
              {result.flagged_reason && (
                <div className="text-[10px] text-vault-muted mt-0.5">{result.flagged_reason}</div>
              )}
            </div>
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {!gpsLoading && !gpsTimeout && !manualMode && (
            <>
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
                onClick={startGpsAcquisition}
                disabled={loading}
                className="btn btn-green w-full justify-center py-2 text-xs"
              >
                {loading ? <Loader size={12} className="animate-spin" /> : null}
                {loading ? 'Verifying…' : 'Run verification →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
