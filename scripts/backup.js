// Takes a consistent, compacted snapshot of the live SQLite DB and rotates old ones.
//
// Uses `VACUUM INTO`, which is safe to run against a database in WAL mode while the app
// is serving traffic: SQLite produces a transactionally-consistent copy (a plain `cp` of
// the .db file would miss committed pages still living in the -wal sidecar and could tear).
// The output is a single self-contained file with no -wal/-shm to carry alongside.
//
// Run manually:  docker compose exec app bun scripts/backup.js
//
// Env:
//   DATABASE_URL   source DB path            (default: /data/local.db)
//   BACKUP_DIR     where snapshots are kept  (default: /backups)
//   BACKUP_KEEP    how many to retain        (default: 14)
import { Database } from 'bun:sqlite';
import { readdir, unlink, stat, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const source = process.env.DATABASE_URL || '/data/local.db';
const dir = process.env.BACKUP_DIR || '/backups';
const keep = Number(process.env.BACKUP_KEEP || 14);

// Sortable, filename-safe UTC stamp incl. ms so back-to-back runs don't collide:
// 2026-06-11T14-32-05-123Z
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(dir, `local-${stamp}.db`);

await mkdir(dir, { recursive: true });
const db = new Database(source);
try {
	// VACUUM INTO needs a path literal; it's our own timestamp, no injection surface.
	db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
} finally {
	db.close();
}

// Verify the snapshot opens and passes SQLite's own integrity check before trusting it.
const check = new Database(target, { readonly: true });
const result = check.query('PRAGMA integrity_check').get();
check.close();
const ok = result && Object.values(result)[0] === 'ok';
if (!ok) {
	await unlink(target);
	console.error(JSON.stringify({ level: 'error', msg: 'backup integrity_check failed', target, result }));
	process.exit(1);
}

const size = (await stat(target)).size;
console.log(JSON.stringify({ level: 'info', msg: 'backup created', target, bytes: size }));

// Rotation: keep the newest `keep` snapshots, delete the rest.
const snapshots = (await readdir(dir))
	.filter((f) => f.startsWith('local-') && f.endsWith('.db'))
	.sort(); // timestamp prefix sorts chronologically
const stale = snapshots.slice(0, Math.max(0, snapshots.length - keep));
for (const f of stale) {
	await unlink(join(dir, f));
	console.log(JSON.stringify({ level: 'info', msg: 'backup pruned', file: f }));
}
