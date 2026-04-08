FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# ── Development: mounts source via compose watch, restarts on changes ────────
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["bun", "--watch", "src/index.ts"]

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production

CMD ["bun", "src/index.ts"]
