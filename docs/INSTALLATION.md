# Installation Guide

## Option A — Docker (recommended)

**Requirements:** Docker Desktop (or Docker Engine + Compose v2).

```bash
cd pollwave
docker compose up --build
```

This starts four services:

| Service    | Port | Notes |
|------------|------|-------|
| frontend   | 3000 | Next.js app |
| backend    | 4000 | Express API + Socket.IO + Swagger at `/docs` |
| postgres   | 5432 | Postgres 16 (volume-persisted) |
| redis      | 6379 | Redis 7 (append-only persisted) |

On first boot the backend:
1. waits for Postgres/Redis health checks,
2. runs `prisma db push` to create the schema,
3. seeds demo data (because `SEED_ON_START=true`).

Open http://localhost:3000. Log in with `admin@pollwave.dev` / `Admin123!`.

To reset all data:

```bash
docker compose down -v   # removes postgres_data & redis_data volumes
docker compose up --build
```

## Option B — Local (Node 20+ / 22)

Configuration comes from the single root [`.env`](../.env) — no per-service copies needed. Its defaults already point at `localhost`.

1. Start infra only: `docker compose up postgres redis -d`
2. **Backend**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npm run seed
   npm run dev
   ```
3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Environment variables

Everything is configured in the single root [`.env`](../.env). Key values:

- `DATABASE_URL` — Postgres connection string
- `REDIS_URL` — Redis connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — **change in production**
- `JWT_ACCESS_EXPIRES` (default `15m`), `JWT_REFRESH_EXPIRES` (default `7d`)
- `CORS_ORIGIN` — comma-separated allowed origins (frontend URL)
- `SEED_ON_START` — seed demo data on first backend boot if DB is empty
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` — frontend → backend URLs (baked into the browser bundle at build time)

## Troubleshooting

- **Frontend can't reach API:** confirm `NEXT_PUBLIC_API_URL` matches the backend origin and that CORS_ORIGIN includes the frontend origin.
- **DB connection refused:** wait for the `postgres` health check; the backend retries via compose `depends_on`.
- **Port already in use:** stop the conflicting process or edit port mappings in `docker-compose.yml`.
