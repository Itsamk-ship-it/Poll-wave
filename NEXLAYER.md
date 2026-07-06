# Nexlayer — Poll-wave

<!-- nexlayer:meta version=1 analyzed=2026-07-02T12:36:19Z repo=https://github.com/Itsamk-ship-it/Poll-wave branch=main -->

> **For AI agents (Claude Code, Cursor, Gemini CLI, Copilot):**
> This file is the **project context** for this Nexlayer deployment — tech stack, env vars, secrets, live URL.
> For full platform detail (nexlayer.yaml schema, Dockerfile rules, CI/CD, task recipes) read **`nexlayer.skills`** in this repo.
>
> **Critical rules (full detail in `nexlayer.skills`):**
> - Inter-pod refs: `${podName:port}` only — never `localhost` or bare hostnames
> - Docker Hub images: prefix with `mirror.gcr.io/library/` — bare tags fail on the cluster
> - Secrets: set in the Nexlayer dashboard — never commit to `nexlayer.yaml` or Dockerfile
>
> **This file:** `agent-managed` sections update automatically. `user-editable` sections (Local Development Setup, Nexlayer Deployment Plan, Build Notes) are yours — preserved across re-analysis.

## Project Summary
<!-- nexlayer:section agent-managed=project_summary -->
PollWave is a real-time polling and voting platform featuring live results via WebSockets, multiple poll types, and a comprehensive dashboard for analytics and user management.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Next.js | framework | 15.1 | Dockerfile, docker-compose.yml |
| Node.js | language | 20 | Dockerfile |
| PostgreSQL | database | 16 | docker-compose.yml |
| Redis | cache | 7 | docker-compose.yml |
| Prisma | tool | latest | Dockerfile |
| Socket.IO | infra | latest | README.md |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- backend/ — Express/Node.js API, Prisma schema, and business logic
- frontend/ — Next.js application with App Router and UI components
- docs/ — Project documentation
<!-- nexlayer:end -->

## External Services Required
<!-- nexlayer:section agent-managed=external_deps -->
_No external services detected._
<!-- nexlayer:end -->

## Local Development Setup
<!-- nexlayer:section user-editable=local_setup -->
### Prerequisites

- Node.js >= 18
- Docker
- Docker Compose

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL=postgresql://pollwave:pollwave@localhost:5432/pollwave
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=dev_access_secret_change_me
JWT_REFRESH_SECRET=dev_refresh_secret_change_me
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Steps

1. `docker compose up -d` — Start all services including database and cache
2. `curl http://localhost:4000/docs` — Verify API is running via Swagger
3. `open http://localhost:3000` — Access the frontend application

<!-- nexlayer:end -->

## Nexlayer Setup
<!-- nexlayer:section agent-managed=nexlayer_setup -->
### Pod Environment Variables

| Pod | Variable | Value | Kind |
|-----|----------|-------|------|
| `frontend` | `POD_ROLE` | `frontend` | plain |
| `backend` | `POD_ROLE` | `backend` | plain |
| `backend` | `NODE_ENV` | `production` | plain |
| `backend` | `PORT` | `"4000"` | plain |
| `backend` | `DATABASE_URL` | `postgresql://pollwave:${POSTGRES_PASSWORD}@postgres.pod:5432/pollwave?schema=public` | inter-pod |
| `backend` | `REDIS_URL` | `redis://redis.pod:6379` | plain |
| `backend` | `CORS_ORIGIN` | `https://vibrant-wasp-poll-wave.cloud.nexlayer.ai` | plain |
| `backend` | `JWT_ACCESS_SECRET` | `"${JWT_ACCESS_SECRET}"` | inter-pod |
| `backend` | `JWT_REFRESH_SECRET` | `"${JWT_REFRESH_SECRET}"` | inter-pod |
| `backend` | `JWT_ACCESS_EXPIRES` | `"${JWT_ACCESS_EXPIRES}"` | inter-pod |
| `backend` | `JWT_REFRESH_EXPIRES` | `"${JWT_REFRESH_EXPIRES}"` | inter-pod |
| `postgres` | `POSTGRES_USER` | `pollwave` | plain |
| `postgres` | `POSTGRES_PASSWORD` | `"${POSTGRES_PASSWORD}"` | inter-pod |
| `postgres` | `POSTGRES_DB` | `pollwave` | plain |
| `postgres` | `POSTGRES_HOST_AUTH_METHOD` | _(set via Nexlayer dashboard)_ | secret |

### Secrets Required

Set these in the Nexlayer dashboard before deploying:

- `POSTGRES_HOST_AUTH_METHOD` (`postgres` pod)

### nexlayer.yaml

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
        DATABASE_URL: postgresql://pollwave:${POSTGRES_PASSWORD}@postgres.pod:5432/pollwave?schema=public
        REDIS_URL: redis://redis.pod:6379
        CORS_ORIGIN: https://vibrant-wasp-poll-wave.cloud.nexlayer.ai
        # Concrete signing keys so auth never falls back to the insecure
        # hardcoded dev defaults. Rotate these (or move to dashboard secrets)
        # for a production app.
        JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET}"
        JWT_REFRESH_SECRET: "${JWT_REFRESH_SECRET}"
        JWT_ACCESS_EXPIRES: "${JWT_ACCESS_EXPIRES}"
        JWT_REFRESH_EXPIRES: "${JWT_REFRESH_EXPIRES}"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: pollwave
        POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
        POSTGRES_DB: pollwave
        # Nexlayer's managed-credential substitution was leaving POSTGRES_PASSWORD
        # empty in this pod, so Postgres refused to initialize. `trust` lets it
        # init and accept in-cluster connections regardless of the resolved
        # password (Postgres has no public path, so this is internal-only).
        POSTGRES_HOST_AUTH_METHOD: trust
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
```
<!-- nexlayer:end -->

## Nexlayer Deployment Plan
<!-- nexlayer:section user-editable=deployment_plan -->
### Pod Topology

| Pod | Image | Port | Role |
|-----|-------|------|------|
| postgres | mirror.gcr.io/library/postgres:16-alpine | 5432 | database |
| redis | mirror.gcr.io/library/redis:7-alpine | 6379 | cache |
| backend | mirror.gcr.io/library/node:22-alpine | 4000 | worker |
| frontend | mirror.gcr.io/library/node:22-alpine | 3000 | web |

### Deployment notes

- Backend pod connects to PostgreSQL via postgres.pod:5432
- Backend pod connects to Redis via redis.pod:6379
- Frontend is built with NEXT_PUBLIC_API_URL pointing to backend.pod:4000 for server-side requests

<!-- nexlayer:end -->

## Build Notes
<!-- nexlayer:section user-editable=build_notes -->
<!-- Add notes for future builds here — preserved across re-analysis -->
<!-- nexlayer:end -->

## Nexlayer Configuration
<!-- nexlayer:section agent-managed=nexlayer_config -->
**Last deployed:** 2026-07-06T13:33:59Z  
**Live URL:** https://vibrant-wasp-poll-wave.cloud.nexlayer.ai  
**Runtime:**  · **Port:** auto-detected  
**Deploy branch:** nexlayer  

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
        DATABASE_URL: postgresql://pollwave:${POSTGRES_PASSWORD}@postgres.pod:5432/pollwave?schema=public
        REDIS_URL: redis://redis.pod:6379
        CORS_ORIGIN: https://vibrant-wasp-poll-wave.cloud.nexlayer.ai
        # Concrete signing keys so auth never falls back to the insecure
        # hardcoded dev defaults. Rotate these (or move to dashboard secrets)
        # for a production app.
        JWT_ACCESS_SECRET: "${JWT_ACCESS_SECRET}"
        JWT_REFRESH_SECRET: "${JWT_REFRESH_SECRET}"
        JWT_ACCESS_EXPIRES: "${JWT_ACCESS_EXPIRES}"
        JWT_REFRESH_EXPIRES: "${JWT_REFRESH_EXPIRES}"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars:
        POSTGRES_USER: pollwave
        POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
        POSTGRES_DB: pollwave
        # Nexlayer's managed-credential substitution was leaving POSTGRES_PASSWORD
        # empty in this pod, so Postgres refused to initialize. `trust` lets it
        # init and accept in-cluster connections regardless of the resolved
        # password (Postgres has no public path, so this is internal-only).
        POSTGRES_HOST_AUTH_METHOD: trust
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
```
<!-- nexlayer:end -->

## Build History
<!-- nexlayer:section agent-managed=build_history -->
| Date | Status | Notes |
|------|--------|-------|
| 2026-07-06T13:32:05Z | analyzed | initial repo analysis |
| 2026-07-06T13:33:59Z | success | deployed https://vibrant-wasp-poll-wave.cloud.nexlayer.ai |
<!-- nexlayer:end -->









