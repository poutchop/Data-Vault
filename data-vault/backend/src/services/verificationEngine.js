const crypto = require('crypto');
const logger  = require('../utils/logger');

// ── Constants ────────────────────────────────────────────────────
const GEOFENCE_RADIUS_M      = 200;    // metres
const TIMESTAMP_WINDOW_SECS  = 90 * 60; // 90 minutes in seconds
const EARTH_RADIUS_M         = 6_371_000;

// ── Haversine distance (metres) ──────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_M * c);
}

// ── HMAC QR verification ─────────────────────────────────────────
// Each board's QR encodes:  boardId|participantId|actionType|issuedAt
// The mobile app sends the HMAC-SHA256 of that payload using the shared secret.
function verifyQrHmac(boardRecord, receivedHmac) {
  const payload  = `${boardRecord.id}|${boardRecord.participant_id}|${boardRecord.action_type}|${boardRecord.issued_at}`;
  const expected = crypto
    .createHmac('sha256', process.env.HMAC_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedHmac, 'hex'));
}

// ── Triple-Factor Verification ────────────────────────────────────
function runTripleVerification({ scanPayload, boardRecord, siteRecord }) {
  const log = {};

  // ── Factor 1: QR HMAC ─────────────────────────────────────────
  let factor1Pass = false;
  try {
    factor1Pass = verifyQrHmac(boardRecord, scanPayload.qr_hmac_received);
  } catch {
    factor1Pass = false;
  }
  log.factor_qr = {
    pass: factor1Pass,
    board_id: boardRecord.id,
    reason: factor1Pass ? 'HMAC signature matched' : 'HMAC signature mismatch or invalid token',
  };

  // ── Factor 2: GPS Geofence ────────────────────────────────────
  const distanceM = haversineDistance(
    parseFloat(siteRecord.centroid_lat),
    parseFloat(siteRecord.centroid_lng),
    parseFloat(scanPayload.gps_lat),
    parseFloat(scanPayload.gps_lng)
  );
  const factor2Pass = distanceM <= (siteRecord.geofence_radius_m || GEOFENCE_RADIUS_M);
  log.factor_gps = {
    pass: factor2Pass,
    distance_m: distanceM,
    geofence_radius_m: siteRecord.geofence_radius_m || GEOFENCE_RADIUS_M,
    scan_lat: scanPayload.gps_lat,
    scan_lng: scanPayload.gps_lng,
    centroid_lat: siteRecord.centroid_lat,
    centroid_lng: siteRecord.centroid_lng,
    reason: factor2Pass
      ? `Within geofence: ${distanceM}m of ${siteRecord.geofence_radius_m}m radius`
      : `Outside geofence: ${distanceM}m exceeds ${siteRecord.geofence_radius_m}m radius`,
  };

  // ── Factor 3: Timestamp delta ─────────────────────────────────
  const serverTime  = new Date();
  const deviceTime  = new Date(scanPayload.scan_time_device);
  const deltaSeconds = Math.abs((serverTime - deviceTime) / 1000);
  const factor3Pass  = deltaSeconds <= TIMESTAMP_WINDOW_SECS;
  log.factor_time = {
    pass: factor3Pass,
    delta_seconds: Math.round(deltaSeconds),
    window_seconds: TIMESTAMP_WINDOW_SECS,
    scan_time_device: scanPayload.scan_time_device,
    scan_time_server: serverTime.toISOString(),
    reason: factor3Pass
      ? `Within window: Δt = ${Math.round(deltaSeconds)}s`
      : `Outside window: Δt = ${Math.round(deltaSeconds)}s exceeds ${TIMESTAMP_WINDOW_SECS}s`,
  };

  const hardened = factor1Pass && factor2Pass && factor3Pass;

  logger.info('Triple-factor verification complete', {
    board_id: boardRecord.id,
    hardened,
    factor1Pass,
    factor2Pass,
    factor3Pass,
    distance_m: distanceM,
    delta_s: Math.round(deltaSeconds),
  });

  return {
    hardened,
    status: hardened ? 'hardened' : 'flagged',
    factor_qr_pass:   factor1Pass,
    factor_gps_pass:  factor2Pass,
    factor_time_pass: factor3Pass,
    distance_from_centroid_m: distanceM,
    timestamp_delta_seconds:  Math.round(deltaSeconds),
    verification_log: log,
    points_awarded: hardened ? resolvePoints(boardRecord.action_type) : 0,
    flagged_reason: hardened ? null : buildFlaggedReason(log),
  };
}

function resolvePoints(actionType) {
  const map = {
    firewood_avoidance:   3,
    nutrition_meal:       2,
    solar_drying:         2,
    organic_fertilizer:   2,
  };
  return map[actionType] || 1;
}

function buildFlaggedReason(log) {
  const reasons = [];
  if (!log.factor_qr.pass)   reasons.push('QR HMAC mismatch');
  if (!log.factor_gps.pass)  reasons.push(`GPS outside geofence (${log.factor_gps.distance_m}m)`);
  if (!log.factor_time.pass) reasons.push(`Timestamp delta too large (${log.factor_time.delta_seconds}s)`);
  return reasons.join('; ');
}

module.exports = { runTripleVerification, haversineDistance, verifyQrHmac };
