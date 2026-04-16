require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const logger    = require('./utils/logger');
const verifyRouter  = require('./routes/verify');
const scansRouter   = require('./routes/scans');
const payoutsRouter = require('./routes/payouts');
const nutritionRouter = require('./routes/nutrition');
const leaderboardRouter = require('./routes/leaderboard');
const { errorHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting ────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Body parsing + logging ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'carbon-clarity-data-vault', ts: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────────
app.use('/api/v1/verify',      verifyRouter);
app.use('/api/v1/scans',       scansRouter);
app.use('/api/v1/payouts',     payoutsRouter);
app.use('/api/v1/nutrition',   nutritionRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);

// ── Error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Data Vault API running on port ${PORT} — environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
