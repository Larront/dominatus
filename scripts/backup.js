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
import { readdir, unlink, stat, mkdir, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const source = process.env.DATABASE_URL || '/data/local.db';
const dir = process.env.BACKUP_DIR || '/backups';
const keep = Number(process.env.BACKUP_KEEP || 14);

// Scoresheet images live next to the DB on the data volume (see src/lib/server/report-images.ts).
const imagesSrc = join(dirname(source), 'images');
const imagesDest = join(dir, 'images');

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
	console.error(
		JSON.stringify({ level: 'error', msg: 'backup integrity_check failed', target, result })
	);
	process.exit(1);
}

const size = (await stat(target)).size;
console.log(JSON.stringify({ level: 'info', msg: 'backup created', target, bytes: size }));

// Mirror the scoresheet images. They're write-once (UUID filenames, never rewritten), so we keep
// a single growing mirror in the backup dir and only copy files we don't already have — far
// cheaper than duplicating every image per snapshot, and a restore can copy it straight back.
try {
	const live = await readdir(imagesSrc);
	await mkdir(imagesDest, { recursive: true });
	const have = new Set(await readdir(imagesDest).catch(() => []));
	let copied = 0;
	for (const f of live) {
		if (have.has(f)) continue;
		await copyFile(join(imagesSrc, f), join(imagesDest, f));
		copied++;
	}
	if (copied)
		console.log(JSON.stringify({ level: 'info', msg: 'images mirrored', copied, dir: imagesDest }));
} catch (e) {
	if (e?.code !== 'ENOENT') throw e; // no images dir yet — nothing to mirror
}

// Rotation: keep the newest `keep` snapshots, delete the rest.
const snapshots = (await readdir(dir))
	.filter((f) => f.startsWith('local-') && f.endsWith('.db'))
	.sort(); // timestamp prefix sorts chronologically
const stale = snapshots.slice(0, Math.max(0, snapshots.length - keep));
for (const f of stale) {
	await unlink(join(dir, f));
	console.log(JSON.stringify({ level: 'info', msg: 'backup pruned', file: f }));
}
