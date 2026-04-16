# Carbon Clarity — Data Vault

> **dMRV Platform** — Bridging rural Ghana with global carbon markets through triple-verified field data.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue)](https://postgresql.org)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org)

---

## What is Carbon Clarity?

Carbon Clarity is a **dMRV (digital Monitoring, Reporting, and Verification)** venture that solves the "Integrity Gap" in last-mile climate finance. Rural women in Ghana's Berekuso region perform significant climate-positive work — using clean cookstoves, reducing firewood consumption, and practising sustainable agriculture — but have no way to prove it to global carbon markets or international NGO donors.

The **Data Vault** is the technical backbone that changes this. It receives field scans from physical **Visual Bridge** tracking boards, runs them through a **Triple-Factor Verification Engine**, stores audit-ready records, and automatically triggers **Mobile Money (MTN/Telecel) payouts** to participants when actions are verified.

This platform is built in partnership with:
- **Ashesi University** — providing institutional oversight and research infrastructure
- **Catalyste+** — providing technical advisory (Global Affairs Canada funded)
- **The Berekuso Women's Agricultural Cooperative** — the primary pilot community

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  FIELD LAYER (Rural Ghana)                                      │
│  Visual Bridge Board → QR Scan → GPS + Photo + Timestamp       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS POST /api/v1/verify
┌─────────────────────▼───────────────────────────────────────────┐
│  TRIPLE-FACTOR VERIFICATION ENGINE (Node.js)                    │
│  Factor 1: HMAC-SHA256 QR signature check                       │
│  Factor 2: Haversine GPS geofence (≤ 200m from site centroid)  │
│  Factor 3: Timestamp delta (≤ 90 min, NTP-synced)              │
└──────────┬──────────────────────────┬───────────────────────────┘
           │ hardened                 │ flagged
┌──────────▼─────────┐    ┌──────────▼─────────────────────────┐
│  PAYOUT ENGINE      │    │  REVIEW QUEUE                      │
│  Idempotency key   │    │  Queen Mother supervisor flags     │
│  MTN MoMo API      │    │  Manual review workflow            │
│  Telecel API        │    └────────────────────────────────────┘
└──────────┬──────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│  POSTGRESQL + POSTGIS (Audit-Ready Storage)                     │
│  scans · participants · boards · payouts · nutrition_logs       │
│  audit_log triggers on every table (GAC compliance)            │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
┌──────────▼──────────┐   ┌──────────▼─────────────────────────┐
│  DATA VAULT UI       │   │  PROVOST PORTAL                    │
│  React + Tailwind    │   │  Food & Nutrition research export   │
│  Hardening Feed      │   │  CSV / JSON / REST API             │
│  Climate Analytics   │   │  Academic reporting format         │
│  Leaderboard         │   └────────────────────────────────────┘
└─────────────────────┘
```

---

## Repository Structure

```
carbon-clarity-data-vault/
├── package.json                    # Monorepo root (npm workspaces)
├── .env.example                    # Environment variable template
│
├── backend/
│   ├── package.json
│   ├── schema.sql                  # PostgreSQL schema + audit triggers
│   └── src/
│       ├── index.js                # Express app entry point
│       ├── db/
│       │   └── pool.js             # PostgreSQL connection pool
│       ├── services/
│       │   ├── verificationEngine.js  # Triple-Factor core logic
│       │   └── payoutEngine.js        # Idempotent MoMo payout logic
│       ├── routes/
│       │   ├── verify.js           # POST /api/v1/verify
│       │   ├── scans.js            # GET  /api/v1/scans
│       │   ├── payouts.js          # GET  /api/v1/payouts + webhook
│       │   ├── nutrition.js        # GET  /api/v1/nutrition (Provost)
│       │   └── leaderboard.js      # GET  /api/v1/leaderboard
│       ├── middleware/
│       │   └── errorHandler.js
│       └── utils/
│           └── logger.js           # Winston structured logging
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Tab routing + layout
        ├── index.css               # Tailwind base + component layer
        ├── utils/
        │   └── api.js              # All API calls
        ├── hooks/
        │   └── useData.js          # Data-fetching hooks with polling
        └── components/
            ├── Topbar.jsx
            ├── MetricCards.jsx
            ├── HardeningFeed.jsx   # Real-time scan log
            ├── VerifierPanel.jsx   # Live Triple-Factor tester
            ├── ClimateAnalytics.jsx
            ├── CommunityLeaderboard.jsx
            └── ProvostPortal.jsx   # Research hub + CSV export
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| PostgreSQL | 14.x with PostGIS extension |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/carbon-clarity-data-vault.git
cd carbon-clarity-data-vault
```

### 2. Install all dependencies

```bash
npm run install:all
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your local PostgreSQL credentials and secrets
```

Required variables to set before starting:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 32-char random string for auth |
| `HMAC_SECRET` | 32-char random string for QR signing |
| `MTN_MOMO_API_KEY` | MTN Mobile Money API key |
| `TELECEL_API_KEY` | Telecel API key |

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Initialise the database

```bash
# Create the database
createdb data_vault

# Run the schema (creates all tables, indexes, triggers, and seed data)
psql data_vault < backend/schema.sql
```

### 5. Start the development servers

```bash
npm run dev
# Backend:  http://localhost:4000
# Frontend: http://localhost:5173
```

---

## API Reference

### `POST /api/v1/verify`

The core hardening endpoint. Submit a field scan for Triple-Factor Verification.

**Request body:**
```json
{
  "board_id":          "uuid-of-the-board",
  "qr_hmac_received":  "64-char-hex-hmac-sha256",
  "gps_lat":           5.7456,
  "gps_lng":          -0.3214,
  "gps_accuracy_m":   12,
  "scan_time_device":  "2026-04-15T09:42:11Z",
  "photo_s3_key":      "scans/2026-04/photo.jpg",
  "photo_sha256":      "64-char-hex"
}
```

**Response (hardened):**
```json
{
  "success":       true,
  "scan_id":       "scn-uuid",
  "status":        "hardened",
  "hardened":      true,
  "factors": {
    "qr":        { "pass": true },
    "gps":       { "pass": true, "distance_m": 84 },
    "timestamp": { "pass": true, "delta_seconds": 4 }
  },
  "points_awarded": 3,
  "payout_queued":  true,
  "payout_id":      "pay-uuid"
}
```

**Response (flagged):**
```json
{
  "success":        true,
  "status":         "flagged",
  "hardened":       false,
  "flagged_reason": "GPS outside geofence (340m)",
  "payout_queued":  false
}
```

### `GET /api/v1/scans`

Paginated feed of all scans.

Query params: `status`, `site_id`, `limit` (max 100), `offset`

### `GET /api/v1/scans/stats`

Aggregate metrics for the dashboard metric cards.

### `GET /api/v1/leaderboard`

Ranked list of participants by total points.

Query params: `site_id`, `limit`

### `GET /api/v1/nutrition`

Food and nutrition log for Provost research portal.

Query params: `site_id`, `from` (ISO date), `to` (ISO date), `format` (`json` or `csv`)

CSV export: add `?format=csv` to download directly.

### `POST /api/v1/payouts/webhook`

MTN/Telecel MoMo confirmation webhook. Called by the provider to confirm or fail a payment.

```json
{
  "referenceId":            "provider-uuid",
  "status":                 "SUCCESSFUL",
  "financialTransactionId": "ft-12345"
}
```

---

## Triple-Factor Verification Logic

The verification engine (`backend/src/services/verificationEngine.js`) requires **all three factors** to pass for a scan to be marked `hardened`:

### Factor 1 — QR HMAC
Each Visual Bridge board has a unique QR code encoding:
```
boardId|participantId|actionType|issuedAt
```
The mobile app computes `HMAC-SHA256(payload, HMAC_SECRET)` and sends the hex digest. The engine recomputes and compares using `crypto.timingSafeEqual()` to prevent timing attacks.

### Factor 2 — GPS Geofence
The engine computes the [Haversine distance](https://en.wikipedia.org/wiki/Haversine_formula) between the scan's GPS coordinates and the site's registered centroid. The scan must be within `geofence_radius_m` (default: 200m). This prevents scans from being submitted from anywhere other than the actual field site.

### Factor 3 — Timestamp Window
The scan's device timestamp (`scan_time_device`) must be within ±90 minutes of the server's NTP-synced time (`scan_time_server`). This prevents backdating of climate actions.

**Any single factor failure** results in `status: flagged`, zero points awarded, and no payout triggered. The scan is still recorded with the full `verification_log` JSON for Queen Mother review.

---

## Payout Idempotency

The payout engine (`backend/src/services/payoutEngine.js`) uses a deterministic idempotency key:

```
SHA-256(scan_id + ":" + participant_id + ":" + YYYY-MM-DD)
```

Before dispatching any MoMo API call, the engine checks whether a payout with this key already exists. If it does, the request is silently deduplicated. This guarantees that network retries, webhook replays, or accidental double-calls **never result in a double payment**.

---

## Database Schema

Key design decisions for GAC audit compliance:

- **`audit_log` table** — every `INSERT`, `UPDATE`, and `DELETE` on `scans`, `payouts`, `participants`, and `nutrition_logs` is captured by PostgreSQL triggers with `old_values` and `new_values` as JSONB. This provides a complete, tamper-evident change history for any data point.
- **`verification_log` JSONB column** on `scans` — stores the complete reasoning for every factor decision, including raw GPS coordinates, distance calculations, and timestamp deltas. GAC auditors can inspect exactly why any scan was hardened or flagged.
- **`idempotency_key` UNIQUE constraint** on `payouts` — database-level guarantee against duplicate payouts, independent of application logic.
- **PostGIS** — the `sites` table stores centroid coordinates as native PostGIS geometry, enabling indexed geospatial queries for future geofence reporting.

---

## Deployment

### Environment: Production

1. Set `NODE_ENV=production` in your environment
2. Use a managed PostgreSQL service (AWS RDS, Supabase, Neon) with SSL enabled
3. Set `DATABASE_URL` with `?sslmode=require`
4. Deploy the backend as a Docker container or on Railway/Render/Fly.io
5. Deploy the frontend to Vercel or Netlify (`npm run build` → `frontend/dist/`)
6. Configure the MTN MoMo API with your production subscription key and target environment

### Docker (backend)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package.json .
RUN npm install --production
COPY backend/src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

```bash
docker build -t data-vault-api .
docker run -p 4000:4000 --env-file .env data-vault-api
```

---

## The dMRV Mission

Carbon Clarity's dMRV system is designed to meet the **Gold Standard for VERs (Verified Emission Reductions)** and the **Global Affairs Canada (GAC) Accelerated Women Empowerment Project** reporting requirements.

Every hardened scan is a timestamped, GPS-verified, cryptographically authenticated record of a real climate action performed by a real woman in rural Ghana. The Data Vault turns these records into:

- **Carbon credits** — audit-ready evidence for voluntary carbon markets
- **ESG assets** — investable impact data for institutional investors
- **Research data** — academic-grade nutrition records for Ashesi University's Provost research programme
- **Direct cash** — immediate GHS Mobile Money rewards to the women who perform the actions

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss significant changes. All contributions must include tests for the verification engine logic.

---

## License

MIT — see [LICENSE](LICENSE)

---

## Acknowledgements

Built by **Pout Chop Jal Madeng** (Founder & CEO, Carbon Clarity) in partnership with Ashesi University, Catalyste+, and the Berekuso Women's Agricultural Cooperative.

*Mastercard Foundation Scholar · Ashesi University · Berekuso, Ghana*
