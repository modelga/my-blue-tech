# Architecture – MyOS-like Service & Dashboard

## Services

| Service     | Port | Tech                     | Role                                                  |
|-------------|------|--------------------------|-------------------------------------------------------|
| `postgres`  | 5432 | PostgreSQL 16            | Primary DB, job queue (pg-boss), pub/sub (NOTIFY)     |
| `api`       | 3001 | Hono + Bun               | REST endpoints, SSE fan-out, pg-boss producer         |
| `worker`    | —    | Bun                      | pg-boss consumers, runs `DocumentProcessor`           |
| `frontend`  | 3000 | Next.js 15 + NextAuth v5 | Dashboard UI (standalone build)                       |
| `dashboard` | 3010 | @pg-boss/dashboard       | pg-boss job queue inspector                           |
| `adminer`   | 8080 | Adminer                  | PostgreSQL web admin UI                               |

## Database Schema

```
timelines        (id, owner, name, description, created_at)
timeline_entries (id, timeline_id FK, seq, payload JSONB, created_at)
                  UNIQUE(timeline_id, seq)

documents        (id, owner, name, definition JSONB,
                  state JSONB, initialized BOOL, created_at, updated_at)
document_history (id BIGSERIAL, document_id FK, seq INT,
                  event JSONB, diff JSONB[], created_at)
                  UNIQUE(document_id, seq)
```

Trigger `notify_document_updated` fires on `UPDATE OF state ON documents`
and broadcasts via `pg_notify('document_updated', { documentId, seq, event })`.

## Worker Queues

| Queue                       | Producer                                      | Consumer                     | Purpose                                                                             |
|-----------------------------|-----------------------------------------------|------------------------------|-------------------------------------------------------------------------------------|
| `initialize-document`       | API (`POST /api/documents`)                   | `document.worker.ts`         | Run `initializeDocument()`, persist state + diff, schedule replay                  |
| `replay-document-timelines` | `document.worker.ts`                          | `document-replay.worker.ts`  | Dispatch existing timeline entries in causal order for a freshly initialized document |
| `process-entry`             | API (`POST /api/timelines/:id/entries`)       | `timeline.worker.ts`         | Fan-out: find documents referencing the timeline, dispatch one job per document     |
| `process-entry-document`    | `timeline.worker.ts` + `document-replay.worker.ts` | `document-session.worker.ts` | Process one timeline entry against one document; serialized per document via `singletonKey` |

## Request / Event Flow

### Document creation & initialization

```
POST /api/documents
  → validate Blue Document (blue.jsonValueToNode)
  → validate MyOS/MyOS Timeline Channel contracts reference existing timelines
  → INSERT documents
  → boss.send("initialize-document", { documentId, definition })

initialize-document  (document.worker)
  → DocumentProcessor.initializeDocument()
  → INSERT document_history  seq=1, event=initialize, diff=changeset
  → UPDATE documents SET state, initialized=true
  → pg_notify("document_updated", { documentId, seq, event="initialized" })
  → boss.send("replay-document-timelines", { documentId }, { singletonKey: documentId })

replay-document-timelines  (document-replay.worker)
  → SELECT timeline IDs from document contracts  (jsonb_each)
  → SELECT timeline_entries WHERE timeline_id = ANY([...])
      ORDER BY created_at ASC, seq ASC           ← causal order across timelines
  → for each entry:
      boss.send("process-entry-document",
        { documentId, entryId, timelineId, payload },
        { singletonKey: documentId, singletonNextSlot: true })
```

### Timeline entry push & document processing

```
POST /api/timelines/:id/entries
  → validate Blue payload (blue.jsonValueToNode)
  → INSERT timeline_entries
  → boss.send("process-entry", { timelineId, entryId, payload })

process-entry  (timeline.worker)
  → SELECT documents WHERE contracts contain timelineId  (jsonb_each, initialized=true)
  → for each affected document:
      boss.send("process-entry-document",
        { documentId, entryId, timelineId, payload },
        { singletonKey: documentId, singletonNextSlot: true })

process-entry-document  (document-session.worker, localConcurrency=10)
  → DocumentProcessor.processDocument(currentState, event)
  → diff(currentState, updatedState)
  → INSERT document_history  seq=N, event=payload, diff=changeset
  → UPDATE documents SET state=updatedState
  → pg_notify("document_updated", { documentId, seq, event="entry_processed" })
```

### Real-time SSE

```
GET /api/documents/:id/stream
  API holds one dedicated pg client: LISTEN document_updated
  pg_notify arrives → Map<documentId, Set<writeCallback>> → N SSE responses
  frontend receives ping → reloads state via GET /api/documents/:id
```

## Key Decisions

### API / Worker split
- **API** (`apps/api`) is I/O-bound — handles HTTP, SSE, DB reads. Scales wide.
- **Worker** (`apps/worker`) is CPU-bound — runs `DocumentProcessor` for each event. Scales independently via `deploy.replicas` in Docker Compose; pg-boss `SKIP LOCKED` ensures no two workers race on the same job.

### Per-document serialization
- `singletonKey: documentId` on `process-entry-document` ensures at most one active + one queued job per document — prevents concurrent state mutations.
- `singletonNextSlot: true` allows one job to be staged while another is active, preserving forward progress without blocking the dispatcher.
- `localConcurrency: 10` allows up to 10 different documents to process in parallel within one worker replica.

### Replay on initialization
- When a document is created against a timeline that already has entries, those entries are replayed immediately after initialization in causal order.
- The replay dispatcher reuses the same `process-entry-document` queue as live events — no special-case processing path.

### Job Queue — pg-boss
- Uses PostgreSQL `SKIP LOCKED` for safe concurrent workers without manual locking.
- No separate broker; Postgres is the only infrastructure dependency.
- pg-boss schema creation requires `GRANT CREATE ON DATABASE blue TO blue` (applied by `infra/postgres/01-grants.sql` on first start).

### Real-time Push — SSE via PostgreSQL LISTEN/NOTIFY
- API holds one dedicated `pg` client (outside the pool) with `LISTEN document_updated`.
- Worker sends `SELECT pg_notify(...)` after each state change.
- NOTIFY payload is a small ping — `{ documentId, seq, event }` — frontend fetches full state separately.
- In-process fan-out: one LISTEN connection → `Map<documentId, Set<(data: string) => void>>` → N SSE responses.

### Auth
- Frontend uses **NextAuth v5** with `CredentialsProvider`; user records stored in SQLite at `/data/users.db` (Docker volume).
- API receives `Authorization: Bearer user <username>`; Hono middleware extracts `userName` into request context.

### Blue Document validation
- All Blue payloads validated at API entry via `blue.jsonValueToNode()` — throws on invalid input.
- `MyOS/MyOS Timeline Channel` contracts are checked to reference existing timelines before a document is accepted (`validateBlueDocumentContracts` Hono middleware).

### Determinism
- Timeline entries stored with a monotonically increasing `seq` per `timeline_id`.
- Replay sorts entries globally by `created_at ASC, seq ASC` — same inputs always produce the same document state.
- `DocumentProcessor` is pure and side-effect-free; state is fully replayable from `document_history`.

## Project Structure

```
apps/
  api/                          # Hono — REST + SSE, pg-boss producer
    src/
      index.ts                  # app bootstrap, pg LISTEN, SSE fan-out
      migrate.sql               # schema DDL (timelines, documents, document_history)
      lib/
        auth.ts                 # Bearer user <name> middleware
        blue.ts                 # Blue singleton
        types.ts                # Hono Variables
      repositories/
        document.repository.ts
        timeline.repository.ts
      routes/
        documents.ts            # CRUD + validateBlueDocumentContracts middleware
        timelines.ts            # CRUD + entries
    Dockerfile
  worker/                       # pg-boss consumers
    src/
      index.ts                  # starts all four workers
      notify.ts                 # pg_notify helper
      repositories/
        document.repository.ts
        timeline.repository.ts
      workers/
        document.worker.ts          # initialize-document
        document-replay.worker.ts   # replay-document-timelines  (dispatcher)
        document-session.worker.ts  # process-entry-document     (processor)
        timeline.worker.ts          # process-entry              (fan-out dispatcher)
    Dockerfile
  frontend/                     # Next.js 15, standalone output
    src/app/
      documents/
        page.tsx                # document list with changes_count
        new/page.tsx            # create document form (Blue YAML/JSON editor)
        [id]/page.tsx           # document detail: state viewer + history + diff log
      timelines/
        page.tsx
        [id]/page.tsx           # timeline detail + push entry form
    Dockerfile
infra/
  postgres/
    01-grants.sql               # GRANT CREATE ON DATABASE blue TO blue
docs/
  architecture.todo.md
docker-compose.yml
```

## Running locally

```sh
docker compose up --build
```

| URL                          | What                          |
|------------------------------|-------------------------------|
| http://localhost:3000        | Dashboard (frontend)          |
| http://localhost:3001/health | API health check              |
| http://localhost:3010        | pg-boss job queue dashboard   |
| http://localhost:8080        | Adminer (PostgreSQL admin UI) |
