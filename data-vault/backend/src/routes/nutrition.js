// ── routes/nutrition.js ──────────────────────────────────────────
const expressN = require('express');
const { query: dbQuery } = require('../db/pool');
const routerN = expressN.Router();

// GET /api/v1/nutrition — Provost portal data
routerN.get('/', async (req, res, next) => {
  try {
    const { site_id, from, to, format } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let p = 1;

    if (site_id) { conditions.push(`p.site_id = $${p++}`); params.push(site_id); }
    if (from)    { conditions.push(`n.log_date >= $${p++}`); params.push(from); }
    if (to)      { conditions.push(`n.log_date <= $${p++}`); params.push(to); }

    const result = await dbQuery(
      `SELECT
         n.id, n.log_date, n.meal_description, n.protein_g, n.kcal,
         n.nutrition_score, n.dietary_diversity, n.researcher_verified, n.notes,
         p.full_name AS participant_name,
         si.name AS site_name,
         si.cooperative
       FROM nutrition_logs n
       JOIN participants p ON p.id = n.participant_id
       JOIN sites si ON si.id = p.site_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY n.log_date DESC`,
      params
    );

    if (format === 'csv') {
      const headers = ['date','participant','site','cooperative','meal','protein_g','kcal','nutrition_score','dietary_diversity','verified'];
      const rows = result.rows.map(r => [
        r.log_date, r.participant_name, r.site_name, r.cooperative,
        `"${(r.meal_description||'').replace(/"/g,'""')}"`,
        r.protein_g, r.kcal, r.nutrition_score, r.dietary_diversity,
        r.researcher_verified
      ].join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="carbon_clarity_nutrition.csv"');
      return res.send([headers.join(','), ...rows].join('\n'));
    }

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/nutrition/aggregate — weekly averages for charts
routerN.get('/aggregate', async (req, res, next) => {
  try {
    const result = await dbQuery(`
      SELECT
        DATE_TRUNC('week', log_date) AS week_start,
        ROUND(AVG(nutrition_score)::numeric, 1) AS avg_score,
        ROUND(AVG(protein_g)::numeric, 1) AS avg_protein_g,
        ROUND(AVG(kcal)::numeric) AS avg_kcal,
        COUNT(*) AS log_count
      FROM nutrition_logs
      WHERE log_date >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', log_date)
      ORDER BY week_start ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = routerN;


// ── routes/leaderboard.js ────────────────────────────────────────
const expressL = require('express');
const { query: lbQuery } = require('../db/pool');
const routerL = expressL.Router();

routerL.get('/', async (req, res, next) => {
  try {
    const { site_id, limit = 20 } = req.query;
    const conditions = ['p.active = TRUE'];
    const params = [];
    let p = 1;
    if (site_id) { conditions.push(`p.site_id = $${p++}`); params.push(site_id); }
    params.push(parseInt(limit));

    const result = await lbQuery(
      `SELECT
         p.id, p.full_name, p.total_points, p.total_payouts_ghs,
         si.name AS site_name, si.cooperative,
         COUNT(s.id) FILTER (WHERE s.status = 'hardened') AS hardened_scans,
         RANK() OVER (ORDER BY p.total_points DESC) AS rank
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

module.exports = { nutrition: routerN, leaderboard: routerL };
