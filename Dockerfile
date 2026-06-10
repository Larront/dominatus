# syntax=docker/dockerfile:1

# --- Build stage: install all deps and build the app ---
# No native toolchain needed: the app uses bun:sqlite (built into the Bun runtime), not a
# compiled addon, so there is nothing to apt-get install here.
FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lock ./
# --ignore-scripts: the dev-only @better-auth/cli pulls in better-sqlite3 (a native addon) as a
# hard dep. We never compile or load it — the app uses bun:sqlite — so skip postinstall builds
# and avoid needing a C toolchain. The production reinstall below excludes @better-auth/cli (and
# thus better-sqlite3) entirely.
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
# `bun run build` evaluates server modules (incl. src/lib/server/db) during SSR/prerender, and
# that module requires DATABASE_URL at import. Provide a throwaway build-time path — no DB is
# touched during the build; the runtime stage sets the real volume path below.
ENV DATABASE_URL=/tmp/build.db
RUN bun run build
# Reinstall only production deps to slim the node_modules carried into the runtime image.
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
