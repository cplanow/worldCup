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

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Drizzle needs TURSO_* to compile the client config at build time in some setups,
# but runtime reads from process.env. Provide empty defaults so `next build`
# doesn't complain about undefined env at build, if it does.
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
