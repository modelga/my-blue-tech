# Architecture – MyOS-like Service & Dashboard

## Services

| Service    | Port | Tech              | Role                                               |
|------------|------|-------------------|----------------------------------------------------|
| `postgres` | —    | PostgreSQL 16     | Primary DB, job queue (pg-boss), pub/sub (NOTIFY)  |
| `keycloak` | 8080 | Keycloak 26       | OIDC auth, `blue` realm, PKCE for frontend         |
| `api`      | 3001 | Bun (`Bun.serve`) | REST endpoints, SSE stream, pg-boss producer       |
| `worker`   | —    | Bun               | pg-boss consumer, runs `DocumentProcessor`         |
| `frontend` | 3000 | Next.js 15 + Bun  | Dashboard UI (standalone build)                    |

## Request / Event Flow

```
Frontend  ──SSE──►  /api/sessions/:id/stream  ──LISTEN──►  Postgres
   │                                                           ▲
   └──POST /api/timelines/:id/entries  ──INSERT + enqueue ─────┤
                                                   │           │
                                          pg-boss worker       │
                                                   │           │
                                       DocumentProcessor       │
                                        .processDocument()     │
                                                   │           │
                                       UPDATE session state + NOTIFY
```

### Initialization flow

```
POST /api/sessions  ──enqueue initialize-session──►  worker
                                                        │
                                            DocumentProcessor
                                             .initializeDocument()
                                                        │
                                            INSERT session state + NOTIFY
```

## Key Decisions

### API / Worker split
- **API** (`apps/api`) is I/O-bound — handles HTTP, SSE, DB reads. Scales wide.
- **Worker** (`apps/worker`) is CPU-bound — runs `DocumentProcessor` for each event. Scales independently via `deploy.replicas` in Docker Compose; pg-boss `SKIP LOCKED` ensures no two workers race on the same job.

### Job Queue & Ordering — pg-boss
- Uses PostgreSQL `SKIP LOCKED` for safe concurrent workers without manual locking.
- Writing a Timeline Entry and enqueuing the processing job happen in the same DB transaction — no dual-write problem.
- No separate broker; Postgres is the only infrastructure dependency.
- Two named queues:
  - `initialize-session` — bootstraps a Document Session from a Blue Document YAML
  - `process-entry` — processes a single Timeline Entry against the current session state

### Real-time Push — SSE via PostgreSQL LISTEN/NOTIFY
- API holds one shared `pg` client (outside the connection pool) with `LISTEN session_updated`.
- Worker calls `NOTIFY session_updated, '<payload>'` after each state change.
- NOTIFY payloads are kept under 8 KB — push only a ping, not full state:
  ```json
  { "sessionId": "abc123", "seq": 42, "event": "state_updated" }
  ```
  Frontend receives the ping → fetches current state via `GET /api/sessions/:id`.
- In-process fan-out: one LISTEN connection → `Map<sessionId, Set<ReadableStreamController>>` → N SSE responses.

### Auth — Keycloak
- Realm: `blue` (auto-imported from `infra/keycloak/realm.json` on first start).
- `blue-frontend` client: public, PKCE (`S256`), redirect to `http://localhost:3000/*`.
- `blue-api` client: confidential, service account only (for token introspection).
- API validates Bearer JWTs against `KEYCLOAK_ISSUER` (`/realms/blue`).

### Determinism
- Timeline Entries stored with a monotonically increasing sequence per `timelineId`.
- pg-boss processes jobs in insertion order; `DocumentProcessor` is pure and side-effect-free.
- Same inputs always produce the same final session state — replayable from entry history.

## Project Structure

```
apps/
  api/               # Bun.serve() — REST + SSE, pg-boss producer
    src/index.ts
    Dockerfile
  worker/            # pg-boss consumers — DocumentProcessor runs here
    src/index.ts
    Dockerfile
  frontend/          # Next.js 15, standalone output
    src/app/
    Dockerfile
infra/
  postgres/
    init.sql         # creates the `keycloak` database on first start
  keycloak/
    realm.json       # blue realm definition
docs/
  architecture.todo.md
.env.example
docker-compose.yml
```

## Running locally

```sh
cp .env.example .env
docker compose up --build
```

| URL                              | What                        |
|----------------------------------|-----------------------------|
| http://localhost:3000            | Dashboard (frontend)        |
| http://localhost:3001/health     | API health check            |
| http://localhost:8080            | Keycloak admin console      |
| http://localhost:8080/realms/blue/.well-known/openid-configuration | OIDC discovery |
