# Nexlayer working build fix

This file is the authoritative, pinned build solution for this repo. Nexlayer uses it verbatim on every run and will not override it. If a future build with this fix fails, Nexlayer appends/updates it rather than regenerating.

## Fixed Dockerfile

```dockerfile
FROM mirror.gcr.io/library/node:20-alpine AS builder

# Build dependencies for native modules / Prisma engines.
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Backend: install deps, generate the Prisma client, compile TS -> dist/src.
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npm run build

# Frontend: install deps, then build.
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/

# NEXT_PUBLIC_* are inlined into the bundle at BUILD time (runtime env is
# ignored by the client), so they must be correct here. Empty => the client
# uses same-origin relative URLs (/api and /api/socket.io). At runtime those
# resolve to the real deployment URL the browser is already on — no
# placeholder host, and nothing to change if the deployment URL changes.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_WS_URL=""
RUN cd frontend && NODE_OPTIONS="--max-old-space-size=8192" npm run build

FROM mirror.gcr.io/library/node:20-alpine AS runner

# openssl is required by the Prisma query engine at runtime.
RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone binds to HOSTNAME; bind all interfaces. PORT defaults to
# 3000 (frontend); the backend pod overrides PORT=4000 via nexlayer.yaml.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Frontend: Next.js standalone output.
COPY --from=builder /app/frontend/.next/standalone ./frontend
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

# Backend: bring the built app WITH its node_modules (includes the generated
# Prisma client and the Prisma CLI used below to push the schema on boot).
COPY --from=builder /app/backend ./backend

EXPOSE 3000 4000

# One image, two roles. Nexlayer runs the container CMD as-is (no per-pod
# command override), so the pod's POD_ROLE env selects the process:
#  - backend: push the Prisma schema (no migration files exist), retrying
#    until Postgres accepts connections, then start the API.
#  - default: run the Next.js standalone frontend server.
CMD ["sh","-c","if [ \"$POD_ROLE\" = \"backend\" ]; then cd /app/backend; i=0; until ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss; do i=$((i+1)); [ $i -ge 20 ] && exit 1; echo \"db not ready, retry $i/20\"; sleep 3; done; exec node dist/src/index.js; else cd /app; exec node frontend/server.js; fi"]

```

## Fixed nexlayer.yaml

```yaml
application:
  name: poll-wave
  pods:
    # Nexlayer prefixes each pod's resources with the app name (e.g. the
    # 'backend' pod becomes deployment 'poll-wave-backend'), so these generic
    # names do NOT collide with other apps. Keeping them lets a redeploy update
    # the existing poll-wave-* pods in place instead of scheduling a new set.
    - name: frontend
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/poll-wave:19f23884afb"
      path: /
      servicePorts:
        - 3000
      vars:
        POD_ROLE: frontend
    - name: backend
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/poll-wave:19f23884afb"
      path: /api
      servicePorts:
        - 4000
      vars:
        POD_ROLE: backend
        NODE_ENV: production
        PORT: "4000"
        DATABASE_URL: postgresql://pollwave:pollwave@postgres.pod:5432/pollwave?schema=public
        REDIS_URL: redis://redis.pod:6379
        CORS_ORIGIN: https://vibrant-wasp-poll-wave.cloud.nexlayer.ai
        # Concrete signing keys so auth never falls back to the insecure
        # hardcoded dev defaults. Rotate these (or move to dashboard secrets)
        # for a production app.
        JWT_ACCESS_SECRET: "a9003340cac834bf4e6394dfbad4f787364a282583f94f5f849d3831df41dd0fe5ed337bcf3baf1cbea70bb38d3b13b6"
        JWT_REFRESH_SECRET: "732dccc7a6e0b5513c3f9155662224e275bdeaf6597e0de1a926c022c31e4d15d9d69e3f9bdfbad5426b7994982ba6ec"
        JWT_ACCESS_EXPIRES: "15m"
        JWT_REFRESH_EXPIRES: "7d"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: pollwave
        POSTGRES_PASSWORD: pollwave
        POSTGRES_DB: pollwave
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379

```
