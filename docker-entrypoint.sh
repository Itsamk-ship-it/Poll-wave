#!/bin/sh
# One image, two roles. Nexlayer forbids a per-pod `command:` (the container's
# ENTRYPOINT runs as-is), so the pod's POD_ROLE env var selects what to run.
set -e

case "$POD_ROLE" in
  backend)
    cd /app/backend
    echo "[entrypoint] backend: pushing Prisma schema to the database..."
    # No migration files exist in this repo, so sync the schema directly.
    # Retry because Postgres may not accept connections the instant we boot.
    n=0
    until ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss; do
      n=$((n + 1))
      if [ "$n" -ge 15 ]; then
        echo "[entrypoint] database not reachable after $n attempts — giving up"
        exit 1
      fi
      echo "[entrypoint] database not ready (attempt $n/15) — retrying in 3s..."
      sleep 3
    done
    echo "[entrypoint] starting API on port ${PORT:-4000}..."
    exec node dist/src/index.js
    ;;
  *)
    # Default role: the Next.js standalone frontend server.
    cd /app
    echo "[entrypoint] starting frontend on port ${PORT:-3000}..."
    exec node frontend/server.js
    ;;
esac
