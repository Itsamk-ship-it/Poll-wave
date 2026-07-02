FROM mirror.gcr.io/library/node:20-alpine AS builder
# build-time env seeded from user-provided build-time secrets
ENV NEXT_PUBLIC_API_URL=http://localhost:4000

# Install build dependencies for native modules (needed for Prisma/bcrypt etc)
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

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

# Inject build-time env vars to satisfy validation during build/SSG
ENV NEXT_PUBLIC_API_URL=https://api.placeholder.nexlayer.ai
ENV NEXT_PUBLIC_WS_URL=wss://api.placeholder.nexlayer.ai

RUN cd frontend && NODE_OPTIONS="--max-old-space-size=8192" npm run build

FROM mirror.gcr.io/library/node:20-alpine AS runner

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

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

# The app consists of two parts. Since Nexlayer typically expects one entrypoint per pod,
# and the provided Dockerfile was attempting to run the frontend server.js,
# we stick to that but ensure we have the backend files available.
# Note: In a real multi-pod setup, these would be separate images/pods.
CMD ["node", "frontend/server.js"]
