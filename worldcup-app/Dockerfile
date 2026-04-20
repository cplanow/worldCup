# Next.js 16 / React 19 — multi-stage build using the "standalone" output
# mode. Requires `output: "standalone"` in next.config.ts.
#
# Build: docker compose up -d --build (from repo root)
# Run:   container listens on port 3000 inside the container

FROM node:22-alpine AS deps
WORKDIR /app
# libc6-compat needed by Next.js SWC binaries on Alpine
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ----------------------------------------------------------------------------

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Turso is reached during `next build`'s data-collection phase for any
# route that queries the DB at module load (e.g. /bracket/[username]
# which calls db.select() directly). Pass these as build args so the
# builder stage can reach Turso. These values do NOT end up in the
# final runner image (they're only in the builder stage) but they DO
# appear in build logs — acceptable for a trusted build host.
ARG TURSO_CONNECTION_URL
ARG TURSO_AUTH_TOKEN
ENV TURSO_CONNECTION_URL=${TURSO_CONNECTION_URL}
ENV TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ----------------------------------------------------------------------------

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Unprivileged user
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what the standalone server needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
