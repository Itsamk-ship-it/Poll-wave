# Nexlayer working build fix

This file is the authoritative, pinned build solution for this repo. Nexlayer uses it verbatim on every run and will not override it. If a future build with this fix fails, Nexlayer appends/updates it rather than regenerating.

## Fixed Dockerfile

```dockerfile
FROM mirror.gcr.io/library/node:20-alpine AS builder

WORKDIR /app

# The previous Dockerfile tried to COPY package*.json ./ from root, 
# but the root of this repo does not have a package.json (it is a monorepo with separate dirs).
# We must install dependencies inside the specific directories.

# Build Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npx prisma generate

# Build Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/

# Fix for Next.js standalone output
RUN sed -i 's/output.*export/output: "standalone"/' frontend/next.config.* 2>/dev/null || true

# Inject build-time env vars to satisfy T3-env/Zod validation during SSG
# Based on the docker-compose and common Next.js patterns
ENV NEXT_PUBLIC_API_URL=https://api.placeholder.nexlayer.ai
ENV NEXT_PUBLIC_WS_URL=wss://api.placeholder.nexlayer.ai

RUN cd frontend && NODE_OPTIONS="--max-old-space-size=8192" npm run build

FROM mirror.gcr.io/library/node:20-alpine AS runner

WORKDIR /app

# Copy built frontend standalone
COPY --from=builder /app/frontend/.next/standalone ./frontend
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

# Copy backend source and prisma client
COPY --from=builder /app/backend ./backend

# Install production dependencies for backend
RUN cd backend && npm install --omit=dev

EXPOSE 3000 4000

# Default entrypoint for the frontend pod
CMD ["node", "frontend/server.js"]
```
