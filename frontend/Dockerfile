# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build args injected at build-time (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_HLS_BASE
ARG NEXT_PUBLIC_PROJECT_PREFIX
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_HLS_BASE=${NEXT_PUBLIC_HLS_BASE} \
    NEXT_PUBLIC_PROJECT_PREFIX=${NEXT_PUBLIC_PROJECT_PREFIX} \
    NEXT_TELEMETRY_DISABLED=1

RUN bun run build

FROM oven/bun:1.3-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7765 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache curl tini && \
    addgroup -S app && adduser -S app -G app

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 7765

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["bun", "server.js"]
