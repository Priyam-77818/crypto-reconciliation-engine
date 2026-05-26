# Crypto Transaction Reconciliation Engine

A production-grade backend system for reconciling cryptocurrency transactions between user records and exchange records. Built with Node.js, TypeScript, Express.js, and MongoDB.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        REST API Layer                        │
│              Express.js + Swagger UI + Rate Limiting         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      Service Layer                           │
│         IngestionService │ ReconciliationService             │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Reconciliation Engine                      │
│    Matcher (priority-based) │ Tolerance Calculator           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   Repository Layer                           │
│  RawTx │ NormalizedTx │ ReconciliationRun │ Results │ Rejected│
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                       MongoDB                                │
│  5 Collections with indexes, enums, and timestamps          │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Service-Repository Pattern**: Clean separation between business logic (services) and data access (repositories). Services never touch Mongoose directly.
- **Streaming CSV Parser**: Uses `csv-parse` in streaming mode to handle large files without loading everything into memory.
- **Priority-Based Matching**: The matcher tries 4 strategies in order — exact ID → exact fields → tolerance window → fuzzy proximity — preventing false positives.
- **Rejected Rows Collection**: Bad rows are never silently dropped. Every rejection is stored with the raw data and reason for auditability.
- **Configurable Tolerances**: Both timestamp and quantity tolerances can be overridden per API request, enabling ad-hoc reconciliation with different parameters.
- **Confidence Scoring**: Each match gets a 0–100 confidence score based on time delta, quantity delta, and match method.

---

## MongoDB Schema Design

| Collection | Purpose |
|---|---|
| `rawtransactions` | Original CSV rows as ingested, before normalization |
| `normalizedtransactions` | Cleaned, validated, normalized transactions |
| `reconciliationruns` | Metadata and summary for each reconciliation run |
| `reconciliationresults` | Per-transaction match results with status and deltas |
| `rejectedrows` | Invalid rows with rejection reasons |

---

## Reconciliation Algorithm

```
1. Load all normalized USER and EXCHANGE transactions from MongoDB

2. Build exchange lookup map:
   key = "ASSET::TYPE" (e.g., "BTC::BUY")
   Special case: TRANSFER_IN is also indexed under TRANSFER_OUT key
   (user TRANSFER_OUT ↔ exchange TRANSFER_IN)

3. For each USER transaction:
   a. Look up exchange candidates by (asset, type) group
   b. Filter out already-matched exchange transactions
   c. Run priority matching:
      Priority 1: Exact transaction_id match → MATCHED (confidence: 100)
      Priority 2: Exact fields (Δt ≤ 1s, Δqty < 0.0001%) → MATCHED
      Priority 3: Within tolerance windows → MATCHED
      Priority 4: Closest candidate (any delta) → CONFLICTING
      No candidates → UNMATCHED_USER

4. Any exchange transactions not matched → UNMATCHED_EXCHANGE

5. Persist all results to reconciliationresults collection
6. Update reconciliationruns with summary statistics
```

### Conflict Reasons

| Reason | Description |
|---|---|
| `timestamp_out_of_range` | Time delta exceeds `TIMESTAMP_TOLERANCE_SECONDS` |
| `quantity_mismatch` | Quantity delta exceeds `QUANTITY_TOLERANCE_PCT` |
| `asset_mismatch` | Assets don't match after normalization |
| `type_mismatch` | Transaction types are incompatible |
| `duplicate_candidate` | Exchange transaction already matched to another user tx |
| `missing_transaction` | No exchange counterpart found at all |

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- MongoDB 7.0+ (or Docker)
- npm 10+

### 1. Clone and Install

```bash
git clone <repo-url>
cd crypto-reconciliation-engine
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI and settings
```

### 3. Start MongoDB

**Option A — Docker (recommended):**
```bash
docker-compose up mongo -d
```

**Option B — Local MongoDB:**
```bash
mongod --dbpath /data/db
```

### 4. Start the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build && npm start
```

The server starts at `http://localhost:3000`.
Swagger UI is available at `http://localhost:3000/api-docs`.

### 5. Docker (Full Stack)

```bash
docker-compose up --build
```

This starts:
- App on port `3000`
- MongoDB on port `27017`
- Mongo Express UI on port `8081`

---

## API Documentation

### Workflow

```
POST /ingest          → Load CSV files into MongoDB
POST /reconcile       → Run the reconciliation engine
GET  /report/:runId   → Retrieve full results
```

### Endpoints

#### `GET /health`
Health check.

```json
{
  "status": "ok",
  "service": "crypto-reconciliation-engine",
  "version": "1.0.0",
  "timestamp": "2024-03-01T09:00:00.000Z"
}
```

#### `POST /ingest`
Ingests both CSV files from configured paths.

```json
{
  "success": true,
  "data": {
    "user": { "totalParsed": 25, "inserted": 20, "skipped": 1, "rejected": 4 },
    "exchange": { "totalParsed": 25, "inserted": 25, "skipped": 0, "rejected": 0 }
  }
}
```

#### `POST /reconcile`
Triggers a reconciliation run. Optional config overrides:

```json
{
  "timestampToleranceSeconds": 300,
  "quantityTolerancePct": 0.01
}
```

Response:
```json
{
  "success": true,
  "data": {
    "runId": "uuid-here",
    "status": "COMPLETED",
    "summary": {
      "totalUser": 20,
      "totalExchange": 25,
      "matched": 17,
      "conflicting": 1,
      "unmatchedUser": 2,
      "unmatchedExchange": 7,
      "matchRate": 85.0,
      "durationMs": 234
    }
  }
}
```

#### `GET /report/:runId`
Full report. Add `?format=csv` for CSV download.

#### `GET /report/:runId/summary`
Summary statistics only.

#### `GET /report/:runId/unmatched`
Unmatched transactions. Supports `?limit=100&skip=0`.

#### `GET /runs`
Paginated list of all reconciliation runs.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/crypto_reconciliation` | MongoDB connection string |
| `TIMESTAMP_TOLERANCE_SECONDS` | `300` | Default timestamp tolerance (5 minutes) |
| `QUANTITY_TOLERANCE_PCT` | `0.01` | Default quantity tolerance (0.01%) |
| `LOG_LEVEL` | `info` | Pino log level |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Requests per window |
| `USER_CSV_PATH` | `./data/user-transactions.csv` | Path to user CSV |
| `EXCHANGE_CSV_PATH` | `./data/exchange-transactions.csv` | Path to exchange CSV |

---

## Running Tests

```bash
# Run all tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npx jest --watch
```

---

## Edge Cases Handled

| Edge Case | Handling |
|---|---|
| Duplicate rows in CSV | Detected by `transaction_id` within file; stored in `rejectedrows` |
| Malformed timestamps (`2024-03-09T`) | Validation rejects row; stored with reason |
| Negative quantities | Validation rejects row |
| Missing timestamp entirely | Validation rejects row |
| Asset name variants (`bitcoin` → `BTC`) | Normalization map in `config/normalization.ts` |
| TRANSFER_OUT ↔ TRANSFER_IN cross-source | Counterpart map handles directional matching |
| Floating point precision (`0.3` vs `0.3001`) | Percentage-based tolerance comparison |
| Duplicate pairing prevention | `usedExchangeIds` Set tracks matched exchange transactions |
| Missing price_usd (transfers) | Stored as `null`, not rejected |

---

## Scaling Considerations

1. **Worker Queue**: Replace synchronous reconciliation with a Bull/BullMQ queue. The `POST /reconcile` endpoint enqueues a job and returns a job ID immediately. Clients poll `GET /runs/:runId` for status.

2. **Streaming Ingestion**: The CSV parser already streams. For very large files (millions of rows), add batch size limits (e.g., 1000 rows per MongoDB bulk write).

3. **Horizontal Scaling**: The service is stateless. Run multiple instances behind a load balancer. MongoDB handles concurrent writes via the upsert pattern.

4. **Redis Caching**: Cache `GET /report/:runId/summary` responses in Redis with a short TTL (30s). Invalidate on new run completion.

5. **Pagination**: All list endpoints support `limit`/`skip`. For cursor-based pagination at scale, switch to `_id`-based cursors.

6. **Index Optimization**: Current indexes cover the main query patterns. For time-range queries across large datasets, add a compound index on `(source, timestamp)`.

---

## Future Improvements

- [ ] WebSocket/SSE for real-time reconciliation progress
- [ ] Multi-account support (tenant isolation)
- [ ] Scheduled reconciliation via cron
- [ ] Webhook notifications on run completion
- [ ] ML-based fuzzy matching for complex conflict resolution
- [ ] Audit trail for manual overrides
- [ ] Support for additional CSV formats (Excel, JSON)
