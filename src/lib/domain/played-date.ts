/**
 * The **played date** of a battle: the calendar day the game was fought, as opposed to `createdAt`,
 * the instant its report was filed (CONTEXT: Played Date). Reports fold in played-date order (ADR
 * 0006), so a report filed days late still lands in the log where the battle actually happened.
 *
 * A played date is a *calendar day*, not an instant — "we played on the 6th" carries no time zone —
 * so it is stored and passed around as its own `YYYY-MM-DD` string, never as a timestamp. Anchoring
 * a day to an instant (midnight, or even noon) cannot survive the date line: noon UTC on the 6th is
 * already the 7th at UTC+13, which is exactly where this campaign's players live. As text there is
 * nothing to shift — the value *is* the day, it sorts chronologically because ISO dates sort
 * lexicographically, and it renders the same everywhere.
 *
 * Two battles on the same day therefore tie on played date, and the fold breaks that tie on submit
 * order — which is the intent: within a day, the order they were logged is the only order known.
 */

/** The form, wire, and storage shape of a played date, as `<input type="date">` produces it. */
const PLAYED_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Column width for the stored played date — `YYYY-MM-DD` is always exactly this. */
export const PLAYED_DATE_LENGTH = 10;

/**
 * How far ahead of the server's clock a played date may sit. A commander in UTC+14 picking "today"
 * is up to a day ahead of a server running on UTC, so a naive "no future dates" rule would reject a
 * legitimate same-day report. Two days is comfortably past every real offset while still rejecting
 * a fat-fingered year.
 */
export const PLAYED_DATE_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Is this a played date this app will accept — a real calendar day in `YYYY-MM-DD` form? Rejects
 * rollovers like `2026-02-31`, which a bare `Date` constructor silently reads as 3 March.
 */
export function isPlayedDate(value: string): boolean {
	const m = PLAYED_DATE_RE.exec(value);
	if (!m) return false;
	const [, y, mo, d] = m;
	// Built and read back in UTC purely as a calendar check — no instant is kept. If the parts come
	// back changed, the day asked for does not exist.
	const at = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
	return (
		at.getUTCFullYear() === Number(y) &&
		at.getUTCMonth() === Number(mo) - 1 &&
		at.getUTCDate() === Number(d)
	);
}

/**
 * Today's played date as the *local* calendar reads it. Call this on the client: a commander logging
 * a game at 9am in Auckland means their local day, not the UTC day that is still yesterday.
 */
export function localPlayedDate(now: Date = new Date()): string {
	return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}-${pad(now.getDate(), 2)}`;
}

/**
 * The played date an instant falls on in UTC. The server's own default when it seeds a fresh form
 * (it has no view of the commander's zone — the client corrects it to {@link localPlayedDate}), and
 * the reference point the future check measures against.
 */
export function utcPlayedDate(now: Date = new Date()): string {
	return `${pad(now.getUTCFullYear(), 4)}-${pad(now.getUTCMonth() + 1, 2)}-${pad(now.getUTCDate(), 2)}`;
}

/**
 * Is this played date implausibly far ahead of now — a battle claimed for a day that hasn't
 * happened? Compared as strings, which is chronological for ISO dates. A malformed date is not
 * "in the future" (it fails {@link isPlayedDate} instead), so a caller reports one error, never both.
 */
export function isFuturePlayedDate(value: string, now: Date = new Date()): boolean {
	if (!isPlayedDate(value)) return false;
	return value > utcPlayedDate(new Date(now.getTime() + PLAYED_DATE_GRACE_MS));
}

/**
 * A played date as a number on the epoch-millisecond scale, for sorting a played date against real
 * instants (the Chronicle interleaves battles with awards, musters and corrections on one axis).
 *
 * An **ordering key, never an instant**: it is UTC midnight of the day, which is a monotonic mapping
 * from calendar day to number and nothing more. Do not store it, display it, or hand it to anything
 * that will read a time zone off it — that is precisely the mistake this module exists to avoid.
 * Two battles on the same day map to the same key, so a caller that needs them separated must break
 * the tie itself (the Chronicle uses submit time, matching the fold).
 */
export function playedDateSortKey(value: string): number {
	const m = PLAYED_DATE_RE.exec(value);
	if (!m) return 0;
	const [, y, mo, d] = m;
	return Date.UTC(Number(y), Number(mo) - 1, Number(d));
}

/**
 * A played date for display — `6 Sep 2026`. Built from the string's own parts rather than a locale
 * formatter so the server and the browser always render it identically (no hydration drift, and no
 * zone can shift it a day). Returns the input unchanged if it isn't a played date.
 */
export function formatPlayedDate(value: string): string {
	const m = PLAYED_DATE_RE.exec(value);
	if (!m) return value;
	const [, y, mo, d] = m;
	const month = MONTHS[Number(mo) - 1];
	return month ? `${Number(d)} ${month} ${y}` : value;
}

const pad = (n: number, width: number) => String(n).padStart(width, '0');
