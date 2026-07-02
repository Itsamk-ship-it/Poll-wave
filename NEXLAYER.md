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
PollWave is a real-time polling and voting platform featuring JWT authentication, live result updates via Socket.IO, and a comprehensive dashboard for poll analytics.
<!-- nexlayer:end -->

## Technology Stack
<!-- nexlayer:section agent-managed=tech_stack -->
| Name | Kind | Version | Detected From |
|------|------|---------|---------------|
| Next.js | framework | unknown | frontend/Dockerfile |
| Node.js | language | unknown | backend/Dockerfile |
| PostgreSQL | database | 16-alpine | docker-compose.yml |
| Redis | cache | 7-alpine | docker-compose.yml |
| Socket.IO | tool | unknown | README.md |
<!-- nexlayer:end -->

## Repository Structure
<!-- nexlayer:section agent-managed=structure_map -->
- backend/ — Node.js server handling API, Socket.IO and database logic
- frontend/ — Next.js application for the user interface
- docs/ — Project documentation
- docker-compose.yml — Local orchestration for PG, Redis, Backend, and Frontend
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
| `frontend` | `API_URL` | `"http://backend.pod:3000"` | plain |
| `frontend` | `NEXT_PUBLIC_API_URL` | `"http://backend.pod:3000"` | plain |
| `frontend` | `VITE_API_URL` | `"http://backend.pod:3000"` | plain |

### nexlayer.yaml

```yaml
application:
  name: soft-jade-poll-wave
  pods:
    - name: backend
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/poll-wave-backend:9f22d40-fix4"
      path: /api
      servicePorts:
        - 3000
      vars: {}
    - name: frontend
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/poll-wave-frontend:9f22d40-fix4"
      path: /
      servicePorts:
        - 3000
      vars:
        API_URL: "http://backend.pod:3000"
        NEXT_PUBLIC_API_URL: "http://backend.pod:3000"
        VITE_API_URL: "http://backend.pod:3000"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars: {}
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
      vars: {}
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
**Last deployed:** 2026-07-02T12:53:58Z  
**Live URL:** https://vibrant-wasp-soft-jade-poll-wave.cloud.nexlayer.ai  
**Runtime:** multi · **Port:** 3000  
**Deploy branch:** main  

```yaml
application:
  name: soft-jade-poll-wave
  pods:
    - name: backend
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/poll-wave-backend:9f22d40-fix4"
      path: /api
      servicePorts:
        - 3000
      vars: {}
    - name: frontend
      image: "registry.nexlayer.io/user_01kdnss9re3ack631zmxgpra36/poll-wave-frontend:9f22d40-fix4"
      path: /
      servicePorts:
        - 3000
      vars:
        API_URL: "http://backend.pod:3000"
        NEXT_PUBLIC_API_URL: "http://backend.pod:3000"
        VITE_API_URL: "http://backend.pod:3000"
    - name: postgres
      image: mirror.gcr.io/library/postgres:16-alpine
      servicePorts:
        - 5432
      vars: {}
    - name: redis
      image: mirror.gcr.io/library/redis:7-alpine
      servicePorts:
        - 6379
      vars: {}
```
<!-- nexlayer:end -->

## Build History
<!-- nexlayer:section agent-managed=build_history -->
| Date | Status | Notes |
|------|--------|-------|
| 2026-07-02T12:36:19Z | analyzed | initial repo analysis |
| 2026-07-02T12:53:58Z | success | deployed https://vibrant-wasp-soft-jade-poll-wave.cloud.nexlayer.ai |
<!-- nexlayer:end -->
