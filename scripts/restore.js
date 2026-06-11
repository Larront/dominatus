// Restores a snapshot over the live DB. DESTRUCTIVE — replaces DATABASE_URL.
//
// IMPORTANT: stop the app first so nothing is writing during the swap, e.g.
//   docker compose stop app
//   docker compose run --rm app bun scripts/restore.js <snapshot>
//   docker compose start app
//
// Before swapping it saves the current DB to <DATABASE_URL>.pre-restore so a bad restore
// is itself reversible, verifies the snapshot with integrity_check, then drops any stale
// -wal/-shm sidecars (they belong to the old DB and would corrupt the restored one).
//
// Arg: snapshot filename (in BACKUP_DIR) or an absolute path. Omit to list available.
//
// Env: DATABASE_URL (default /data/local.db), BACKUP_DIR (default /backups)
import { Database } from 'bun:sqlite';
import { readdir, copyFile, rename, rm, stat, mkdir } from 'node:fs/promises';
import { join, isAbsolute, dirname } from 'node:path';

const dest = process.env.DATABASE_URL || '/data/local.db';
const dir = process.env.BACKUP_DIR || '/backups';
const arg = process.argv[2];

if (!arg) {
	const snapshots = (await readdir(dir)).filter((f) => f.startsWith('local-') && f.endsWith('.db')).sort();
	console.error('Usage: bun scripts/restore.js <snapshot>\n\nAvailable in ' + dir + ':');
	for (const f of snapshots) console.error('  ' + f);
	process.exit(1);
}

const source = isAbsolute(arg) ? arg : join(dir, arg);
await stat(source); // throws a clear ENOENT if the snapshot doesn't exist

// Verify the snapshot before we touch the live DB.
const check = new Database(source, { readonly: true });
const result = check.query('PRAGMA integrity_check').get();
check.close();
if (!result || Object.values(result)[0] !== 'ok') {
	console.error(JSON.stringify({ level: 'error', msg: 'snapshot failed integrity_check; aborting', source, result }));
	process.exit(1);
}

// Keep the current DB recoverable in case this restore is itself a mistake.
try {
	await copyFile(dest, dest + '.pre-restore');
	console.log(JSON.stringify({ level: 'info', msg: 'saved current db', to: dest + '.pre-restore' }));
} catch (e) {
	if (e?.code !== 'ENOENT') throw e; // no existing DB to preserve — fine on a fresh volume
}

// Swap in the snapshot and remove the old WAL sidecars.
await copyFile(source, dest + '.tmp');
await rename(dest + '.tmp', dest); // atomic replace on the same filesystem
await rm(dest + '-wal', { force: true });
await rm(dest + '-shm', { force: true });

console.log(JSON.stringify({ level: 'info', msg: 'restore complete', from: source, to: dest }));

// Bring back the scoresheet images the restored DB rows reference. Images are write-once, so we
// only copy ones the live dir is missing; existing files (and any orphans) are left untouched.
const imagesSrc = join(dir, 'images');
const imagesDest = join(dirname(dest), 'images');
try {
	const files = await readdir(imagesSrc);
	await mkdir(imagesDest, { recursive: true });
	const have = new Set(await readdir(imagesDest).catch(() => []));
	let restored = 0;
	for (const f of files) {
		if (have.has(f)) continue;
		await copyFile(join(imagesSrc, f), join(imagesDest, f));
		restored++;
	}
	console.log(JSON.stringify({ level: 'info', msg: 'images restored', restored, to: imagesDest }));
} catch (e) {
	if (e?.code !== 'ENOENT') throw e; // no image mirror in this backup — nothing to restore
}

console.log('Start the app again, e.g. `docker compose start app`.');
