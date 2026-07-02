# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# PollWave — single image, two runtime roles (frontend + backend).
# Nexlayer builds one image and forbids per-pod `command:`, so the entrypoint
# branches on POD_ROLE. See docker-entrypoint.sh and nexlayer.yaml.
# ─────────────────────────────────────────────────────────────────────────────
FROM mirror.gcr.io/library/node:20-alpine AS builder

# Native module + Prisma engine prerequisites.
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# ── Backend: install deps, generate Prisma client, compile TS → dist/ ────────
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npm run build   # prisma generate && tsc  → dist/src/index.js

# ── Frontend: install deps, then build ───────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/

# Empty NEXT_PUBLIC_* → the client uses same-origin relative URLs (`/api`,
# `/api/socket.io`). NEXT_PUBLIC_* are inlined at build time, so they MUST be
# correct here — setting them in nexlayer.yaml at runtime has no effect.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_WS_URL=""
RUN cd frontend && NODE_OPTIONS="--max-old-space-size=8192" npm run build

# ─────────────────────────────────────────────────────────────────────────────
FROM mirror.gcr.io/library/node:20-alpine AS runner

# openssl is required by the Prisma query engine at runtime.
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone binds to HOSTNAME; default to all interfaces so the
# platform can reach it. PORT defaults to 3000 (frontend); the backend pod
# overrides PORT=4000 via nexlayer.yaml.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Frontend: Next.js standalone output.
COPY --from=builder /app/frontend/.next/standalone ./frontend
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

# Backend: bring the built app WITH its node_modules (includes the generated
# Prisma client and the Prisma CLI used by the entrypoint to push the schema).
COPY --from=builder /app/backend ./backend

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000 4000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
