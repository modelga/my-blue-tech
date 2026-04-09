
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres in Bun-native code. The `api` and `worker` apps use `pg` (node-postgres) because they run alongside `pg-boss` which requires it — don't switch those to `Bun.sql`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Project structure

```
apps/
  api/        Hono REST API — documents, timelines, SSE fan-out (port 3001)
  worker/     pg-boss consumers — initialize-document, process-entry (no port)
  frontend/   Next.js 15 dashboard — auth, timelines, documents (port 3000)
blue-js/      Blue Language monorepo (Nx) — @blue-labs/language, @blue-labs/document-processor
infra/
  postgres/   Docker init scripts (01-grants.sql — GRANT CREATE ON DATABASE blue TO blue)
tests/        Playwright E2E tests (timelines/, documents/, auth/)
```

## Services (docker-compose)

| Service     | Port  | Purpose                          |
|-------------|-------|----------------------------------|
| postgres    | 5432  | Primary database                 |
| api         | 3001  | REST + SSE backend               |
| worker      | —     | Background job processor         |
| frontend    | 3000  | Next.js UI                       |
| dashboard   | 3010  | pg-boss job queue UI             |
| adminer     | 8080  | PostgreSQL admin UI              |

## Database

- `timelines` — named event channels (owner, name, description)
- `timeline_entries` — append-only events (seq, payload JSONB)
- `documents` — Blue Documents with current state (definition JSONB, state JSONB, initialized)
- `document_history` — audit log (seq, event JSONB, diff JSONB[])

`diff` column is `JSONB[]` (native PG array). When inserting via `pg`, serialize each element:
```ts
diff?.map((c) => JSON.stringify(c)) ?? null  // passed as $n::jsonb[]
```

pg_notify channel `document_updated` is used by the worker to signal the API, which fans out to SSE clients.

## Auth

- API: `Bearer user <name>` header — middleware extracts `userName` from the token
- Frontend: NextAuth.js v5 with CredentialsProvider, SQLite session store at `/data/users.db`

## Blue Language validation

Use `blue.jsonValueToNode(json)` to validate any Blue payload. It throws on invalid input.
Use `processor.initializeDocument(node)` to initialize a Blue Document — check `result.capabilityFailure`.

## Hono patterns

- Typed context variables: `type Env = { Variables: Variables & { extraField: T } }` — keep extra variables local to the router file, not in the global `Variables` type.
- Middleware factories: `createMiddleware<Env>(async (c, next) => { ... })` — use for reusable validation steps (e.g. `validateBlueDocumentContracts`).

## Testing

E2E only — Playwright. Run with `bunx playwright test`. No unit tests.

```ts#playwright.config.ts
// Tests expect the full stack running at http://localhost:3000
```

### Playwright rules
- Always use strict single-element locators. Scope to a parent card before querying children.
- Don't rely on module-level `Date.now()` uid for creating unique names across tests — use a per-test counter for uniqueness.
- Each test that needs persistent data must create its own data; don't depend on sibling tests.

## Frontend styles

All shared inline styles are in `apps/frontend/src/lib/styles.ts`.

| Export | Purpose |
|---|---|
| `colors` | Design tokens — blue, white, border, error, etc. |
| `radius` | Border-radius tokens (sm=6, md=8, lg=10, xl=12) |
| `authWrapper`, `authCard`, `authTitle`, `authInput`, `authPrimaryButton`, `authLink` | Auth pages |
| `pageHeader`, `pageTitle`, `newItemButton`, `emptyState` | List page headers |
| `formCard`, `formLabel`, `formInput`, `monoTextarea`, `formActions`, `submitButton`, `cancelButton` | Forms |
| `errorBanner`, `errorDetailList`, `fieldError` | Error display |
| `dashGrid`, `dashCard`, `dashCardTitle`, `dashCardBody` | Dashboard cards |
| `heroSection`, `heroTitle`, `heroSubtitle`, `heroPrimaryButton`, `heroSecondaryButton` | Hero section |

**Rules:** Never define local style objects in new components — check `styles.ts` first. Add missing styles to `styles.ts`. Use tokens (`colors.blue`, `radius.md`) instead of hard-coded values.

## Error component

`<ErrorBanner error={string} details={unknown[]} />` — renders error message + bullet list of stringified details. Import from `@/components/ErrorBanner`.
