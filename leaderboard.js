const express = require('express');
const { query } = require('../db/pool');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { site_id, limit = 20 } = req.query;
    const conditions = ['p.active = TRUE'];
    const params = [];
    let p = 1;

    if (site_id) {
      conditions.push(`p.site_id = $${p++}`);
      params.push(site_id);
    }
    params.push(Math.min(parseInt(limit), 50));

    const result = await query(
      `SELECT
         p.id,
         p.full_name,
         p.total_points,
         p.total_payouts_ghs,
         si.name        AS site_name,
         si.cooperative,
         COUNT(s.id) FILTER (WHERE s.status = 'hardened')    AS hardened_scans,
         COUNT(s.id) FILTER (WHERE s.status = 'flagged')     AS flagged_scans,
         MAX(s.created_at)                                    AS last_scan_at,
         RANK() OVER (ORDER BY p.total_points DESC)           AS rank
       FROM participants p
       JOIN sites si ON si.id = p.site_id
       LEFT JOIN scans s ON s.participant_id = p.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id, si.name, si.cooperative
       ORDER BY p.total_points DESC
       LIMIT $${p}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
