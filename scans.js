// ── routes/scans.js ──────────────────────────────────────────────
const express = require('express');
const { query } = require('../db/pool');
const router = express.Router();

// GET /api/v1/scans — paginated feed for the Hardening Feed UI
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status, site_id } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let p = 1;

    if (status)  { conditions.push(`s.status = $${p++}`);  params.push(status);  }
    if (site_id) { conditions.push(`s.site_id = $${p++}`); params.push(site_id); }

    params.push(Math.min(parseInt(limit), 100));
    params.push(parseInt(offset));

    const result = await query(
      `SELECT
         s.id, s.status, s.factor_qr_pass, s.factor_gps_pass, s.factor_time_pass,
         s.distance_from_centroid_m, s.timestamp_delta_seconds,
         s.points_awarded, s.flagged_reason, s.created_at,
         p.full_name AS participant_name,
         si.name AS site_name,
         b.action_type
       FROM scans s
       JOIN participants p  ON p.id  = s.participant_id
       JOIN sites si         ON si.id = s.site_id
       JOIN boards b         ON b.id  = s.board_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.created_at DESC
       LIMIT $${p++} OFFSET $${p}`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM scans s WHERE ${conditions.join(' AND ')}`,
      params.slice(0, -2)
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/scans/stats — aggregate stats for metric cards
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS scans_today,
        COUNT(*) FILTER (WHERE status = 'hardened' AND created_at >= CURRENT_DATE) AS hardened_today,
        COUNT(*) FILTER (WHERE status = 'flagged' AND created_at >= CURRENT_DATE) AS flagged_today,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'hardened')::numeric /
          NULLIF(COUNT(*), 0) * 100, 1
        ) AS verification_rate_pct,
        SUM(points_awarded) AS total_points_awarded
      FROM scans
    `);

    const co2Stats = await query(`
      SELECT
        ROUND(SUM(s.points_awarded) * 1.8, 1) AS co2_avoided_kg,
        COUNT(DISTINCT s.participant_id) AS active_participants
      FROM scans s
      WHERE s.status = 'hardened'
        AND s.created_at >= NOW() - INTERVAL '30 days'
    `);

    const payoutStats = await query(`
      SELECT COALESCE(SUM(amount_ghs), 0) AS total_payouts_ghs
      FROM payouts WHERE status = 'confirmed'
    `);

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        ...co2Stats.rows[0],
        ...payoutStats.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
