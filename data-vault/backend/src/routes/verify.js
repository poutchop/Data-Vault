const express = require('express');
const { body, validationResult } = require('express-validator');
const { query }  = require('../db/pool');
const { runTripleVerification } = require('../services/verificationEngine');
const { queuePayout, dispatchMtnPayout } = require('../services/payoutEngine');
const logger     = require('../utils/logger');

const router = express.Router();

// ── Validation rules ─────────────────────────────────────────────
const verifyValidation = [
  body('board_id').isUUID().withMessage('board_id must be a valid UUID'),
  body('qr_hmac_received').isLength({ min: 64, max: 64 }).withMessage('qr_hmac_received must be 64 hex chars'),
  body('gps_lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('gps_lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('scan_time_device').isISO8601().withMessage('scan_time_device must be ISO 8601'),
  body('gps_accuracy_m').optional().isFloat({ min: 0 }),
  body('photo_sha256').optional().isLength({ min: 64, max: 64 }),
  body('photo_s3_key').optional().isString(),
];

// ── POST /api/v1/verify ──────────────────────────────────────────
// The core dMRV hardening endpoint. Receives a field scan,
// runs Triple-Factor Verification, persists the result, and
// queues a Mobile Money payout if the scan is hardened.
router.post('/', verifyValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    board_id,
    qr_hmac_received,
    gps_lat,
    gps_lng,
    gps_accuracy_m,
    scan_time_device,
    photo_s3_key,
    photo_sha256,
  } = req.body;

  try {
    // 1. Load board record (validates board exists and is active)
    const boardResult = await query(
      `SELECT b.*, p.site_id AS participant_site_id
       FROM boards b
       JOIN participants p ON p.id = b.participant_id
       WHERE b.id = $1 AND b.active = TRUE`,
      [board_id]
    );
    if (!boardResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Board not found or inactive' });
    }
    const boardRecord = boardResult.rows[0];

    // 2. Load site record for geofence data
    const siteResult = await query(
      'SELECT * FROM sites WHERE id = $1 AND active = TRUE',
      [boardRecord.site_id]
    );
    if (!siteResult.rows.length) {
      return res.status(404).json({ success: false, error: 'Site not found or inactive' });
    }
    const siteRecord = siteResult.rows[0];

    // 3. Run Triple-Factor Verification
    const verification = runTripleVerification({
      scanPayload: { board_id, qr_hmac_received, gps_lat, gps_lng, scan_time_device },
      boardRecord,
      siteRecord,
    });

    // 4. Persist scan record
    const scanResult = await query(
      `INSERT INTO scans (
        board_id, participant_id, site_id,
        qr_hmac_received, scan_time_device, scan_time_server,
        gps_lat, gps_lng, gps_accuracy_m,
        distance_from_centroid_m, timestamp_delta_seconds,
        photo_s3_key, photo_sha256,
        factor_qr_pass, factor_gps_pass, factor_time_pass,
        status, verification_log, points_awarded, flagged_reason
      ) VALUES (
        $1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      ) RETURNING *`,
      [
        board_id,
        boardRecord.participant_id,
        boardRecord.site_id,
        qr_hmac_received,
        scan_time_device,
        gps_lat,
        gps_lng,
        gps_accuracy_m || null,
        verification.distance_from_centroid_m,
        verification.timestamp_delta_seconds,
        photo_s3_key || null,
        photo_sha256 || null,
        verification.factor_qr_pass,
        verification.factor_gps_pass,
        verification.factor_time_pass,
        verification.status,
        JSON.stringify(verification.verification_log),
        verification.points_awarded,
        verification.flagged_reason,
      ]
    );
    const scan = scanResult.rows[0];

    // 5. Update participant points if hardened
    if (verification.hardened) {
      await query(
        'UPDATE participants SET total_points = total_points + $1 WHERE id = $2',
        [verification.points_awarded, boardRecord.participant_id]
      );
    }

    // 6. Queue payout if hardened (non-blocking — failure doesn't roll back the scan)
    let payoutResult = null;
    if (verification.hardened) {
      try {
        const queued = await queuePayout(scan);
        if (!queued.duplicate && !queued.skipped) {
          await dispatchMtnPayout(queued.payout);
          payoutResult = queued.payout;
        }
      } catch (payoutErr) {
        logger.error('Payout failed (scan still recorded)', {
          scan_id: scan.id,
          error: payoutErr.message,
        });
      }
    }

    // 7. Respond
    return res.status(200).json({
      success: true,
      scan_id: scan.id,
      status: verification.status,
      hardened: verification.hardened,
      factors: {
        qr:        { pass: verification.factor_qr_pass },
        gps:       { pass: verification.factor_gps_pass, distance_m: verification.distance_from_centroid_m },
        timestamp: { pass: verification.factor_time_pass, delta_seconds: verification.timestamp_delta_seconds },
      },
      points_awarded: verification.points_awarded,
      flagged_reason: verification.flagged_reason || null,
      payout_queued:  payoutResult !== null,
      payout_id:      payoutResult?.id || null,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
