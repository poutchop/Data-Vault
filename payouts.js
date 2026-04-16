const express = require('express');
const { query } = require('../db/pool');
const { confirmPayout } = require('../services/payoutEngine');
const router = express.Router();

// GET /api/v1/payouts — list payouts
router.get('/', async (req, res, next) => {
  try {
    const { status, participant_id, limit = 50, offset = 0 } = req.query;
    const conditions = ['1=1'];
    const params = [];
    let p = 1;

    if (status)         { conditions.push(`py.status = $${p++}`);         params.push(status); }
    if (participant_id) { conditions.push(`py.participant_id = $${p++}`); params.push(participant_id); }

    params.push(Math.min(parseInt(limit), 100));
    params.push(parseInt(offset));

    const result = await query(
      `SELECT py.id, py.status, py.provider, py.msisdn, py.amount_ghs,
              py.initiated_at, py.confirmed_at, py.created_at,
              py.provider_reference, py.failure_reason,
              p.full_name AS participant_name
       FROM payouts py
       JOIN participants p ON p.id = py.participant_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY py.created_at DESC
       LIMIT $${p++} OFFSET $${p}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payouts/webhook — MTN/Telecel confirmation webhook
router.post('/webhook', async (req, res, next) => {
  try {
    const { referenceId, status, financialTransactionId } = req.body;
    if (!referenceId || !status) {
      return res.status(400).json({ success: false, error: 'Missing referenceId or status' });
    }
    await confirmPayout(referenceId, status);
    res.json({ success: true, financialTransactionId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
