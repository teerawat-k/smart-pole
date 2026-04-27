FROM oven/bun:1 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate --config prisma/prisma.config.ts || true

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 7766
CMD ["bun", "src/index.ts"]
