# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# ── Dependencies (cached layer) ───────────────────────────
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production=false

# ── Build (Prisma generate) ───────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate --config prisma/prisma.config.ts

# ── Runtime (lean image, non-root user) ───────────────────
FROM oven/bun:1.3-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# curl สำหรับ healthcheck
RUN apk add --no-cache curl tini && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app /app

USER app
EXPOSE 7766

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "src/index.ts"]
