# AGENTS.md – AI Agent Guidelines for blue-technologies

---

## What is Blue Language?

**Blue Language** is a universal data and contract description language that enables:
- Unambiguous typing of every entity (each type has a unique BlueId — a content hash)
- Type inheritance and extension
- Describing instances and their processing rules (contracts)
- Collaboration between humans, AI, and services without a central server

Every type and instance is identified by a **BlueId** — a deterministic hash of its content.

```json
// Reference by BlueId
{ "type": { "blueId": "6E93TBwTYYZ3zaWQhryCWz4rnJgGisaDgPrU8RnVLWuC" } }
```

---

## Project Overview

This is a **job-queue-driven, real-time collaborative document system** built on Blue Language.

### Processing Pipeline

```
POST /api/documents
  → API validates Blue Document (blue.jsonValueToNode)
  → API creates DB record
  → API sends `initialize-document` job via pg-boss
  → Worker picks up job
  → Worker calls DocumentProcessor.initializeDocument()
  → Worker saves state + diff to document_history
  → Worker sends pg_notify('document_updated', ...)
  → API pg listener receives notification
  → API fans out to SSE clients (GET /api/documents/:id/stream)
```

### Timeline Entry Pipeline

```
POST /api/timelines/:id/entries
  → API validates payload (blue.jsonValueToNode)
  → API appends entry to timeline_entries
  → API sends `process-entry` job via pg-boss
  → Worker picks up job (implementation pending)
  → Worker processes affected documents
  → Worker sends pg_notify for each affected document
```

---

## Architecture

### Apps

| App | Tech | Purpose |
|-----|------|---------|
| `apps/api` | Hono + Bun + pg | REST API, SSE fan-out, pg-boss producer |
| `apps/worker` | Bun + pg + pg-boss | Background job consumer |
| `apps/frontend` | Next.js 15 + NextAuth v5 | Dashboard UI |

### Key Libraries

| Library | Version | Used in |
|---------|---------|---------|
| `@blue-labs/language` | 3.9.2 | api, worker |
| `@blue-labs/document-processor` | latest | worker |
| `@blue-repository/types` | 0.25.0 | api |
| `hono` | 4.12.12 | api |
| `pg-boss` | ^12.15.0 | api, worker |
| `pg` | ^8.20.0 | api, worker |
| `json-diff-ts` | 4.10.4 | worker |
| `radash` | 12.1.1 | api |
| `js-yaml` | 4.1.1 | frontend |
| `next-auth` | 5.0.0-beta.25 | frontend |

---

## Database Schema

```sql
timelines        (id TEXT PK, owner TEXT, name TEXT, description TEXT, created_at)
timeline_entries (id TEXT PK, timeline_id FK, seq INT, payload JSONB, created_at)
                  UNIQUE(timeline_id, seq)

documents        (id TEXT PK, owner TEXT, name TEXT, definition JSONB,
                  state JSONB, initialized BOOL, created_at, updated_at)
document_history (id BIGSERIAL PK, document_id FK, seq INT, event JSONB,
                  diff JSONB[], created_at)
                  UNIQUE(document_id, seq)
```

**`diff` is `JSONB[]`** — a native PostgreSQL array of JSONB values. When inserting via `pg` driver:
```ts
// Serialize each element to string, cast in SQL
[documentId, event, diff?.map(c => JSON.stringify(c)) ?? null]
// SQL: VALUES ($1, ..., $2, $3::jsonb[])
```

**Triggers:** `notify_document_updated` fires on `UPDATE OF state ON documents` → `pg_notify('document_updated', ...)`.

---

## Key Concepts

- **Blue Document**: Input document containing channel definitions linked to timelines. Validated via `blue.jsonValueToNode()`.
- **Timeline**: An append-only event stream owned by a user.
- **Timeline Entry**: A single event appended to a timeline. Must be a valid Blue payload.
- **Document Session / History**: Each state change is recorded in `document_history` with a seq number and diff (IChange[] from json-diff-ts).
- **Determinism**: Document processing must be deterministic — same inputs always produce the same state. Process entries in `seq` order; use SKIP LOCKED in pg-boss.
- **BlueId**: Content hash used as the canonical type identifier. Use it to identify types, never string-match type names.

---

## API Auth

- Header: `Authorization: Bearer user <username>`
- Middleware extracts `userName` from the token and sets it in Hono context via `Variables`
- Frontend uses NextAuth v5 with CredentialsProvider; sessions stored in SQLite at `/data/users.db`

---

## Hono Patterns

```ts
// Local Env type for per-router context extensions — do NOT add to global Variables
type Env = { Variables: Variables & { blueDoc: BlueNode } };

// Middleware factory
function validateBlueDocumentContracts(timelineRepo: TimelineRepository) {
  return createMiddleware<Env>(async (c, next) => {
    // validate, c.set("blueDoc", doc), await next()
  });
}

// Apply
app.post("/", validateBlueDocumentContracts(timelineRepo), async (c) => { ... });
```

---

## Blue Language Usage

```ts
import { blue } from "../lib/blue";
import { DocumentProcessor } from "@blue-labs/document-processor";

// Validate any Blue payload
const node = blue.jsonValueToNode(json); // throws on invalid

// Initialize a document
const processor = new DocumentProcessor();
const result = await processor.initializeDocument(node);
if (result.capabilityFailure) throw new Error(result.failureReason);

// Serialize back to plain JSON
const plainJson = blue.nodeToJson(result.document);
```

---

## Contract Validation (Timeline Channels)

When creating a Blue Document, contracts of type `MyOS/MyOS Timeline Channel` must reference an existing timeline:

```ts
const contracts = _.listify(doc.getContracts() ?? {}, (key, value) => ({ contract: value, key }));
// For each contract: check contract.getType()?.getBlueId() === repository.packages.myos.aliases["MyOS/MyOS Timeline Channel"]
// Then: contract.getProperties()?.timelineId?.getValue() → verify timeline exists in DB
// Serialize errors as .message strings (Error objects serialize as {} in JSON)
```

---

## Document History & Diffing

```ts
import { diff } from "json-diff-ts";

const changeset = diff(oldState, newState); // IChange[] — always an array
// Store in document_history.diff (JSONB[])
await repo.appendHistory(documentId, { type: "initialized" }, changeset);
```

---

## Worker Job Handlers

```ts
// pg-boss v12 — work() receives an array of jobs
boss.work<JobData>("queue-name", async ([job]) => {
  const { field } = job.data;
  // ... process
  await notifyDocumentUpdated(pool, documentId, entry.seq, "initialized");
});
```

`notifyDocumentUpdated` in `apps/worker/src/notify.ts`:
```ts
await pool.query("SELECT pg_notify($1, $2)", [
  "document_updated",
  JSON.stringify({ documentId, seq, event }),
]);
```

---

## Frontend Guidelines

### Styles
All shared inline styles live in `apps/frontend/src/lib/styles.ts`. Never define local style objects — extend `styles.ts` if needed. Use design tokens (`colors.blue`, `radius.md`).

### Error Display
```tsx
import { ErrorBanner } from "@/components/ErrorBanner";
<ErrorBanner error="Something went wrong" details={["detail 1", "detail 2"]} />
```

### API calls from server components
Use server actions in `apps/frontend/src/lib/api.ts`. Auth header: `Bearer user ${session.user.name}`. Forward to internal API at `process.env.API_URL`.

---

## Testing (Playwright)

All tests are E2E. No unit tests.

```sh
bunx playwright test               # headless
bunx playwright test --ui          # interactive
bunx playwright test --headed      # visible browser
bunx playwright show-report        # view results
```

### Rules
1. Use strict single-element locators — scope to parent card before querying children.
2. Use per-test counters for unique names, not module-level `Date.now()`.
3. Each test must create its own data — never depend on sibling tests.
4. Copy UUIDs from `span[title]` using `.getAttribute("title")`.

---

## AI Agent Rules

1. **Minimize code changes** — fix the specific thing asked; don't refactor surrounding code.
2. **No new files unless necessary** — prefer editing existing files.
3. **Check `styles.ts` before adding styles** — never define local style objects in components.
4. **Guarantee determinism** — process timeline entries in `seq` order; no race conditions.
5. **Validate at boundaries** — use `blue.jsonValueToNode()` for all Blue payloads entering the system.
6. **Serialize errors as strings** — `Error[]` from `_.tryit` must be `.map(e => e.message)` before `c.json()`.
7. **JSONB[] needs explicit cast** — `$n::jsonb[]` + `string[]` serialization when inserting diff arrays.
8. **Don't skip hooks or use --no-verify** — fix the underlying issue instead.
9. **Don't delete code without asking** — prefer debugging and logging over removing functionality.
10. **Keep UI simple** — no decorative elements; functional and minimal.

---

## Useful References

- Blue Language introduction: https://language.blue/docs/language/introduction
- MyOS 101 course: https://developers.myos.blue/docs/tutorials/myos-101/
- pg-boss v12 docs: https://github.com/timgit/pg-boss
