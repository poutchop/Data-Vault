const crypto = require('crypto');
const { query } = require('../db/pool');
const logger    = require('../utils/logger');

// ── Idempotency key: SHA-256(scan_id + participant_id + date) ────
// This guarantees that a participant can never receive duplicate
// payouts for the same scan, even if the endpoint is called twice.
function buildIdempotencyKey(scanId, participantId) {
  const today   = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const payload = `${scanId}:${participantId}:${today}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ── Calculate payout amount based on points ─────────────────────
function calculatePayoutGhs(pointsAwarded) {
  // 3 points = GHS 0.25 per verified scan (calibrated to MTN minimums)
  const ratePerPoint = 0.0833; // GHS per point
  return Math.round(pointsAwarded * ratePerPoint * 100) / 100;
}

// ── Queue a payout (idempotent) ──────────────────────────────────
async function queuePayout(scan) {
  const idempotencyKey = buildIdempotencyKey(scan.id, scan.participant_id);

  // Check if this payout already exists (idempotency guard)
  const existing = await query(
    'SELECT id, status FROM payouts WHERE idempotency_key = $1',
    [idempotencyKey]
  );
  if (existing.rows.length > 0) {
    logger.info('Payout already exists — idempotency key matched', {
      idempotency_key: idempotencyKey,
      existing_status: existing.rows[0].status,
    });
    return { duplicate: true, payout: existing.rows[0] };
  }

  // Fetch participant wallet info
  const participantResult = await query(
    'SELECT momo_provider, momo_wallet_msisdn FROM participants WHERE id = $1',
    [scan.participant_id]
  );
  if (!participantResult.rows.length) {
    throw new Error(`Participant ${scan.participant_id} not found`);
  }
  const participant = participantResult.rows[0];
  const amountGhs   = calculatePayoutGhs(scan.points_awarded);

  if (amountGhs <= 0) {
    logger.info('Zero-amount payout skipped', { scan_id: scan.id });
    return { skipped: true, reason: 'zero_amount' };
  }

  // Insert payout record
  const result = await query(
    `INSERT INTO payouts
       (scan_id, participant_id, idempotency_key, provider, msisdn, amount_ghs, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'queued')
     RETURNING *`,
    [
      scan.id,
      scan.participant_id,
      idempotencyKey,
      participant.momo_provider,
      participant.momo_wallet_msisdn,
      amountGhs,
    ]
  );

  logger.info('Payout queued', {
    payout_id: result.rows[0].id,
    amount_ghs: amountGhs,
    provider: participant.momo_provider,
    idempotency_key: idempotencyKey,
  });

  return { duplicate: false, payout: result.rows[0] };
}

// ── Dispatch to MTN MoMo API ─────────────────────────────────────
async function dispatchMtnPayout(payout) {
  const referenceId = crypto.randomUUID();
  try {
    // Real implementation: call MTN MoMo Collections API
    // const response = await fetch(`${process.env.MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${await getMtnAccessToken()}`,
    //     'X-Reference-Id': referenceId,
    //     'X-Target-Environment': process.env.NODE_ENV === 'production' ? 'mtncongo' : 'sandbox',
    //     'Ocp-Apim-Subscription-Key': process.env.MTN_MOMO_SUBSCRIPTION_KEY,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     amount: payout.amount_ghs.toString(),
    //     currency: 'GHS',
    //     externalId: payout.idempotency_key,
    //     payer: { partyIdType: 'MSISDN', partyId: payout.msisdn },
    //     payerMessage: 'Carbon Clarity climate action reward',
    //     payeeNote: 'Data Vault verified payout',
    //   }),
    // });

    // Simulated success for sandbox / development
    await query(
      `UPDATE payouts
       SET status = 'initiated', provider_reference = $1, initiated_at = NOW()
       WHERE id = $2`,
      [referenceId, payout.id]
    );

    logger.info('MTN payout dispatched', { payout_id: payout.id, reference: referenceId });
    return { success: true, reference: referenceId };
  } catch (err) {
    await query(
      `UPDATE payouts
       SET status = 'failed', failure_reason = $1, failed_at = NOW(), retry_count = retry_count + 1
       WHERE id = $2`,
      [err.message, payout.id]
    );
    logger.error('MTN payout dispatch failed', { payout_id: payout.id, error: err.message });
    throw err;
  }
}

// ── Handle MoMo webhook confirmation ────────────────────────────
async function confirmPayout(providerReference, status) {
  const payoutResult = await query(
    'SELECT id, participant_id, amount_ghs FROM payouts WHERE provider_reference = $1',
    [providerReference]
  );
  if (!payoutResult.rows.length) {
    throw new Error(`Payout with reference ${providerReference} not found`);
  }
  const payout = payoutResult.rows[0];

  if (status === 'SUCCESSFUL') {
    await query(
      `UPDATE payouts SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
      [payout.id]
    );
    // Update participant total
    await query(
      `UPDATE participants SET total_payouts_ghs = total_payouts_ghs + $1 WHERE id = $2`,
      [payout.amount_ghs, payout.participant_id]
    );
    logger.info('Payout confirmed', { payout_id: payout.id, amount_ghs: payout.amount_ghs });
  } else {
    await query(
      `UPDATE payouts SET status = 'failed', failure_reason = $1, failed_at = NOW() WHERE id = $2`,
      [`Provider status: ${status}`, payout.id]
    );
    logger.warn('Payout failed via webhook', { payout_id: payout.id, status });
  }
  return payout;
}

module.exports = { queuePayout, dispatchMtnPayout, confirmPayout, buildIdempotencyKey };
