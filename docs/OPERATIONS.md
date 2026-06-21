# Operations

Logging and backups for the Dominatus container.

## Logging

Logging uses [pino](https://getpino.io). The app emits **one JSON line per request** to
stdout, captured by Docker's `json-file` driver. Each request carries a per-request
`requestId` (via a pino child logger) so all lines from one request can be correlated:

```json
{ "level": 30, "time": 1781127870465, "requestId": "…", "method": "POST", "path": "/campaigns", "status": 303, "ms": 12, "userId": "abc123", "msg": "request" }
```

pino levels are numeric: `info`=30, `warn`=40, `error`=50. Unhandled 500s are logged at
`error` with pino's `err` serializer (type, message, stack) — see `src/hooks.server.ts`.
The `/healthz` probe is excluded to keep the log readable.

**Log level** is set by `LOG_LEVEL` (e.g. `debug`, `info`, `warn`); it defaults to `debug`
in dev and `info` in production.

In route handlers, prefer the request-scoped logger so lines inherit the `requestId`:

```ts
export const actions = {
  default: async ({ locals }) => {
    locals.log.info({ campaignId }, 'campaign created');
  }
};
```

**Development** output is pretty-printed via `pino-pretty`, attached as an in-process
stream (not a worker transport — that breaks under Vite/Bun). No setup needed: `bun run dev`
just shows colorized logs.

View / follow logs in the container:

```sh
docker compose logs -f app
docker compose logs app | grep '"level":50'        # just errors
```

**Rotation** is configured in `docker-compose.yml` (`max-size: 10m`, `max-file: 5`), so
logs are capped at ~50 MB per service. No external log shipper is wired up; the JSON
format is parse-ready if one is added later.

## Backups

The SQLite database (WAL mode) is snapshotted with `VACUUM INTO`, which is safe to run
against the live app. Snapshots land on the `/backups` mount (host bind mount
`/data/dominatus/backups`) and are rotated to the newest `BACKUP_KEEP` (default 14). Runs are manual.

### Take a backup

```sh
docker compose exec app bun scripts/backup.js
```

It writes the snapshot, runs `PRAGMA integrity_check` on it (deleting it if it fails), and
rotates to the newest `BACKUP_KEEP` snapshots (default **14**).

Tunable via env: `BACKUP_DIR` (default `/backups`), `BACKUP_KEEP` (default `14`).

### Copy a snapshot off the host

```sh
docker compose cp app:/backups ./backups-export      # whole dir
# or a single file:
docker compose cp app:/backups/local-2026-06-11T14-32-05-123Z.db ./
```

> Backups are a host bind mount (`/data/dominatus/backups`), so they survive `docker compose down`
> **and** `down -v`. They are not offsite, though — copy critical snapshots off the host until an
> offsite target is added.

### Restore a snapshot (DESTRUCTIVE)

Stop the app so nothing writes during the swap. The restore saves the current DB to
`local.db.pre-restore` first, verifies the snapshot, swaps it in, and drops stale
`-wal`/`-shm` sidecars.

```sh
docker compose exec app bun scripts/restore.js          # lists available snapshots
docker compose stop app
docker compose run --rm app bun scripts/restore.js local-2026-06-11T14-32-05-123Z.db
docker compose start app
```

## Local dev

The same scripts work locally (they default to `/data` and `/backups`; override paths):

```sh
DATABASE_URL=local.db BACKUP_DIR=./backups bun run db:backup
```
