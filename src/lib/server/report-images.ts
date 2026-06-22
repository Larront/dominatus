import { env } from '$env/dynamic/private';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Storage for confirmed battle-report scoresheets. The image is evidence attached to a
 * human-confirmed report (it never seeds control or scoring — see ADR 0001); it's written
 * only on submit and lives next to the SQLite file on the data volume, so a single mounted
 * volume carries both the DB and its scoresheets and `scripts/backup.js` can mirror them.
 */

/** A few-MB photo at most; cap so a stray upload can't tie up OCR or fill the volume. */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

/** The only image types we accept, mapped to the extension a stored file gets. */
const EXT_BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

/** A stored filename is a UUID + known extension — the only shape the serving route trusts. */
const STORED_NAME =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

const CONTENT_TYPE: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp'
};

function isErrno(e: unknown, code: string): boolean {
	return typeof e === 'object' && e !== null && (e as { code?: string }).code === code;
}

/** Scoresheets live in `<dir of DATABASE_URL>/images` — alongside the DB on the data volume. */
function imagesDir(): string {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	return join(dirname(env.DATABASE_URL), 'images');
}

/** The outcome of validating an uploaded scoresheet, before we commit it to disk. */
export type ImageCheck =
	| { kind: 'none' }
	| { kind: 'ok'; file: File }
	| { kind: 'error'; message: string; status: 400 | 413 };

/**
 * Validate a multipart `image` field shared by the analyze endpoint and the report form: no
 * file is fine (`none`); a wrong type or oversize one is a user error; otherwise it's `ok`.
 */
export function checkImageUpload(value: FormDataEntryValue | null): ImageCheck {
	if (!(value instanceof File) || value.size === 0) return { kind: 'none' };
	if (!EXT_BY_TYPE[value.type])
		return {
			kind: 'error',
			message: 'Scoresheet must be a JPEG, PNG, or WebP image.',
			status: 400
		};
	if (value.size > MAX_IMAGE_BYTES)
		return { kind: 'error', message: 'That image is too large (max 12 MB).', status: 413 };
	return { kind: 'ok', file: value };
}

/** Persist a confirmed report's scoresheet; returns the stored filename to keep on the row. */
export async function saveReportImage(file: File): Promise<string> {
	const ext = EXT_BY_TYPE[file.type];
	if (!ext) throw new Error(`Unsupported image type: ${file.type}`);
	const name = `${crypto.randomUUID()}.${ext}`;
	const dir = imagesDir();
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
	return name;
}

/** Remove a stored scoresheet (on report delete or replacement); a missing file is ignored. */
export async function deleteReportImage(name: string | null | undefined): Promise<void> {
	if (!name || !STORED_NAME.test(name)) return;
	try {
		await unlink(join(imagesDir(), name));
	} catch (e) {
		if (!isErrno(e, 'ENOENT')) throw e;
	}
}

/** Read a stored scoresheet for the serving route; null on a bad name or a missing file. */
export async function readReportImage(
	name: string
): Promise<{ body: Buffer; contentType: string } | null> {
	if (!STORED_NAME.test(name)) return null;
	const ext = name.slice(name.lastIndexOf('.') + 1);
	try {
		return { body: await readFile(join(imagesDir(), name)), contentType: CONTENT_TYPE[ext] };
	} catch (e) {
		if (isErrno(e, 'ENOENT')) return null;
		throw e;
	}
}
