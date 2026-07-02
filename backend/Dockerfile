# syntax=docker/dockerfile:1

# ---- Build stage: install deps, generate Prisma client, compile TS ----
FROM node:22-alpine AS build
WORKDIR /app

# Prisma needs OpenSSL (libssl) present to load its engines on Alpine/musl.
RUN apk add --no-cache openssl libc6-compat

# Install dependencies (uses lockfile when present).
COPY package*.json ./
RUN npm install

# Generate Prisma client from schema before compiling.
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source and build (build script runs `prisma generate && tsc`).
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Runtime also needs OpenSSL for the Prisma query engine.
RUN apk add --no-cache openssl libc6-compat

# Copy runtime artifacts from the build stage.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 4000

# Push the schema (no migration files exist) then launch the server.
# tsconfig rootDir is ".", so src/index.ts compiles to dist/src/index.js.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/src/index.js"]
