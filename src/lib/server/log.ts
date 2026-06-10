import pino from 'pino';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

// Level: explicit LOG_LEVEL wins; otherwise debug in dev, info in prod.
const level = env.LOG_LEVEL || (dev ? 'debug' : 'info');

// Transport-free by design. Pino writes newline-delimited JSON to stdout (fd 1), which
// Docker's json-file driver captures and rotates. We deliberately avoid pino's `transport`
// option: it spawns a worker via thread-stream, which Vite can't trace when bundling the
// server and which is flaky on Bun. In dev we instead attach pino-pretty as an *in-process*
// destination stream (same thread, no worker) for readable output. The import is dynamic and
// gated on `dev` so production — where pino-pretty is a stripped devDependency — never loads it.
const stream = dev ? (await import('pino-pretty')).default({ colorize: true }) : undefined;

export const log = stream ? pino({ level }, stream) : pino({ level });
