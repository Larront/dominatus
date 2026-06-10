# Operations

Logging for the Dominatus container.

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
