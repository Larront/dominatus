# syntax=docker/dockerfile:1

# --- Build stage: install all deps, compile the app + native addons ---
FROM oven/bun:1 AS build
WORKDIR /app

# Toolchain for compiling better-sqlite3's native addon.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build
# Reinstall only production deps; keeps better-sqlite3's compiled binary.
RUN bun install --production --frozen-lockfile

# --- Runtime stage: slim image with only what the server needs ---
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=/data/local.db

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.js ./scripts/migrate.js
COPY --from=build /app/package.json ./package.json

# Mount point for the SQLite volume; owned by the non-root runtime user.
USER root
RUN mkdir -p /data && chown bun:bun /data
USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD bun -e "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply migrations against the volume DB, then start the standalone server.
CMD ["sh", "-c", "bun scripts/migrate.js && bun build/index.js"]
