# Blue Technologies

A document processing platform built on the **Blue Language** runtime. Documents are defined as structured Blue nodes with contracts; timeline entries drive state transitions deterministically through a worker pipeline.

For a full technical breakdown see [`docs/architecture.md`](docs/architecture.md).

---

## What's inside

```
apps/
  api/          Hono REST API — timelines, documents, SSE (port 3001)
  worker/       pg-boss consumers — document init, entry processing, replay
  frontend/     Next.js 15 dashboard — auth, timelines, documents (port 3000)
  integration-tests/  Bun integration tests — hit the real API over Docker networking
blue-js/        Blue Language monorepo (Nx) — @blue-labs/language, @blue-labs/document-processor
infra/
  postgres/     Docker init SQL (schema DDL, grants)
tests/          Playwright E2E tests
docs/
  architecture.md  Full architecture reference
docker-compose.yml
docker-compose.integration-test.yml
```

---

## Running locally

Requires Docker with the Compose plugin.

```sh
docker compose up --build
```

| URL                         | What                         |
|-----------------------------|------------------------------|
| http://localhost:3000       | Frontend dashboard           |
| http://localhost:3001/health| API health check             |
| http://localhost:3001/swagger-ui | Swagger UI — interactive API explorer |
| http://localhost:3001/openapi | OpenAPI JSON spec           |
| http://localhost:3010       | pg-boss job queue inspector  |
| http://localhost:8080       | Adminer — PostgreSQL web UI  |

The API exposes an OpenAPI 3.0 spec at `/openapi` and an interactive Swagger UI at `/swagger-ui`. All `/api/*` endpoints require `Authorization: Bearer user <username>` — the Swagger UI includes an **Authorize** button to set this header for in-browser requests.

On first start PostgreSQL runs `infra/postgres/01-grants.sql` which grants the `blue` user the `CREATE` privilege required by pg-boss to manage its schema.

---

## Running tests

### Integration tests (Bun, run inside Docker)

Integration tests talk directly to the API over the internal Docker network (`http://api:3001`). The full stack must not be running separately — the compose file starts everything it needs.

```sh
bun run test:integration
```

Expands to:

```sh
docker compose -f docker-compose.integration-test.yml run --build --rm integration-tests
```

`docker-compose.integration-test.yml` uses `include` to pull in the base `docker-compose.yml`, then adds the `integration-tests` service on the same `blue` network. Tests wait for the `api` health check before running.

Test suites (`apps/integration-tests/src/tests/`):

- **Document initialization** — creates a timeline + document, verifies `initialized: true`, initial counter value, and one history entry.
- **Document increment** — pushes three increment entries in sequence, verifies counter after each via `state.counter.value`.
- **Multi-document sync + replay** — creates two documents on a shared timeline, pushes two entries, verifies both documents reach counter = 2, then creates a third document and verifies it catches up to counter = 2 via the replay worker.

### E2E tests (Playwright, browser-level)

E2E tests require the full stack running and drive a real Chromium browser through the frontend UI.

```sh
bun run test:e2e
```

Expands to:

```sh
docker compose up -d && cd tests && bun run test
```

Test suites (`tests/`):

- `auth/` — sign-up and sign-in flows
- `timelines/` — timeline CRUD, entry appending with seq verification
- `documents/` — document creation, increment via timeline entry, multi-document sync and replay

---

## Production readiness

### Concurrency and correctness

- **`SELECT ... FOR UPDATE`** — every `process-entry-document` job acquires a row-level lock on the document before reading its state. Concurrent workers targeting the same document block and then read the freshly committed state, eliminating stale-read races.
- **Per-document serialization via `singletonKey`** — pg-boss enforces at most one active + one queued job per document ID on the `process-entry-document` queue, preventing out-of-order state mutations from concurrent dispatches.
- **Replay runs in-process** — the `replay-document-timelines` worker processes all historical entries sequentially within a single pg-boss job (not by re-dispatching to another queue). This avoids the `singletonNextSlot` deduplication that would silently drop entries when replaying many events across multiple replicas.

### Fault tolerance

- **`retryDelay: 5, retryLimit: 10`** on `process-entry-document` — transient failures (network, DB overload) are retried up to 10 times before the job is moved to the dead-letter archive.
- **Per-entry try/catch in replay** — a capability failure on one entry logs the error and continues rather than aborting the entire replay, preserving partial progress.
- **Worker horizontal scaling** — `deploy.replicas: 10` in Docker Compose; pg-boss uses `SKIP LOCKED` so replicas never double-process a job.

### Determinism and auditability

- Every state change writes a row to `document_history` with the triggering event and a JSON diff (`JSONB[]`). The full document state at any point in time is reconstructible by replaying history from `definition`.
- Timeline entries are stored append-only with a monotonically increasing `seq` per timeline. Replay always sorts by `created_at ASC, seq ASC` — same inputs always produce the same output.
- `DocumentProcessor` is pure and side-effect-free; all side effects (DB writes, notifications) happen in the worker after processing returns.

### Observability

- **SSE stream** (`GET /api/documents/:id/stream`) — real-time push to the frontend on every state change via `pg_notify`.
- Structured console logs on every worker job with `doc=`, `entry=`, `seq=`, and `jobId=` fields.

### Input validation

- Blue Document contracts are validated at API entry (`blue.jsonValueToNode`) before any DB write, preventing malformed payloads from reaching the worker.
- `MyOS/MyOS Timeline Channel` contracts are checked to reference existing timelines before a document is accepted — no dangling foreign references.

### Local / development helpers

These are included for convenience during development and are not intended for production:

- **Simple bearer auth** — the API accepts `Authorization: Bearer user <name>` with no cryptographic verification. Replace with a proper identity provider (e.g. Auth0, Cognito, or a self-hosted OIDC server) before exposing publicly.
- **pg-boss dashboard** (port 3010) — live view of all queues, job states, retry counts, and dead-letter jobs. Useful during development; should be access-controlled or removed in production.
- **Adminer** (port 8080) — direct PostgreSQL web UI. Useful for inspecting `document_history` and `timeline_entries` during development; must not be exposed in production.

---

## Cloud migration note (AWS)

This stack is self-contained on PostgreSQL, but maps naturally onto AWS managed services.

### Messaging and compute

Replace pg-boss queues and Bun worker processes with **SNS + SQS FIFO** and **Lambda**:

- One SNS topic per event type (`initialize-document`, `process-entry`, etc.).
- One SQS FIFO queue per document, using the document ID as `MessageGroupId` — this preserves per-document ordering and replaces the `singletonKey` mechanism.
- Lambda functions consume from SQS; the same `DocumentEntryProcessor` logic runs inside the handler unchanged.

### Database

Replace PostgreSQL with **DynamoDB**:

- `documents` table — partition key: `id`
- `document_history` table — partition key: `document_id`, sort key: `seq`
- `timeline_entries` table — partition key: `timeline_id`, sort key: `seq`
- **Subscription mapping table** — because DynamoDB has no `jsonb_each` equivalent, an explicit `timeline_document_subscriptions` table (partition key: `timeline_id`, sort key: `document_id`) is needed to look up which documents subscribe to a given timeline when fanning out entries.

## Triggered events from document processing

One open question in the current design is what happens when `DocumentProcessor.processDocument()` returns `triggeredEvents` — events that the document itself emits as a result of processing an incoming entry. Currently these are not routed anywhere.

On AWS, the natural pattern would be:

1. After processing, inspect `result.triggeredEvents`.
2. For each triggered event, determine its target: either a specific document (direct dispatch) or a timeline (append as a new entry, which then fans out to all subscribers).
3. Publish to the appropriate SNS topic or directly to the target document's SQS FIFO queue.

This closes the loop for reactive document behaviours — e.g. one document processing an entry and emitting an event that drives state changes in other documents — without requiring a synchronous call chain.

### Real-time push

Replace `pg_notify` + SSE with **API Gateway WebSocket** or **AppSync subscriptions** for real-time client updates.
