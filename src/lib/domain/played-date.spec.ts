import { describe, it, expect } from 'vitest';
import {
	PLAYED_DATE_GRACE_MS,
	formatPlayedDate,
	isFuturePlayedDate,
	isPlayedDate,
	localPlayedDate,
	utcPlayedDate
} from './played-date';

describe('played date', () => {
	it('accepts a real calendar day', () => {
		for (const d of ['2026-01-01', '2026-09-06', '2026-12-31', '1999-06-15', '2028-02-29']) {
			expect(isPlayedDate(d), d).toBe(true);
		}
	});

	it('rejects a day that does not exist rather than rolling it forward', () => {
		// A bare Date would happily turn these into early March / the 1st of the next month.
		for (const d of ['2026-02-30', '2025-02-29', '2026-04-31', '2026-13-01', '2026-00-10']) {
			expect(isPlayedDate(d), d).toBe(false);
		}
	});

	it('rejects anything that is not a bare YYYY-MM-DD', () => {
		for (const bad of [
			'',
			'2026-9-6',
			'06-09-2026',
			'2026/09/06',
			'2026-09-06T12:00:00Z',
			'yesterday'
		]) {
			expect(isPlayedDate(bad), bad).toBe(false);
		}
	});

	it('sorts chronologically as plain strings', () => {
		// The reason the played date is stored as text: fold order is a string sort, and it has to be
		// the same order a calendar is in.
		const days = ['2026-09-10', '2025-12-31', '2026-01-02', '2026-09-06'];
		expect([...days].sort()).toEqual(['2025-12-31', '2026-01-02', '2026-09-06', '2026-09-10']);
	});

	describe('local vs UTC today', () => {
		it('reads local today off the local calendar', () => {
			// 9am in Auckland (UTC+12) is still the previous day in UTC — the form must offer the local day.
			const auckland9am = new Date(2026, 8, 6, 9, 0, 0);
			expect(localPlayedDate(auckland9am)).toBe('2026-09-06');
		});

		it('reads UTC today off the instant', () => {
			expect(utcPlayedDate(new Date('2026-09-06T23:30:00.000Z'))).toBe('2026-09-06');
			expect(utcPlayedDate(new Date('2026-09-07T00:30:00.000Z'))).toBe('2026-09-07');
		});
	});

	describe('future dates', () => {
		const now = new Date('2026-09-06T00:00:00.000Z');

		it('allows a commander in the furthest-ahead zone to log their own today', () => {
			// UTC+14's 7 Sep begins at 6 Sep 10:00 UTC. Their "today" is a day ahead of the server's
			// and must not read as a future battle.
			expect(isFuturePlayedDate('2026-09-07', new Date('2026-09-06T10:00:00.000Z'))).toBe(false);
		});

		it('allows today and any past day', () => {
			expect(isFuturePlayedDate('2026-09-06', now)).toBe(false);
			expect(isFuturePlayedDate('2026-09-01', now)).toBe(false);
			expect(isFuturePlayedDate('2024-03-11', now)).toBe(false);
		});

		it('rejects a battle claimed well beyond the grace window', () => {
			expect(isFuturePlayedDate('2026-09-30', now)).toBe(true);
			expect(isFuturePlayedDate('2030-01-01', now)).toBe(true);
		});

		it('draws the line at the grace window', () => {
			// now + grace lands on the 8th, so the 8th is the last day accepted and the 9th is not.
			expect(utcPlayedDate(new Date(now.getTime() + PLAYED_DATE_GRACE_MS))).toBe('2026-09-08');
			expect(isFuturePlayedDate('2026-09-08', now)).toBe(false);
			expect(isFuturePlayedDate('2026-09-09', now)).toBe(true);
		});

		it('calls a malformed date malformed, not future', () => {
			expect(isFuturePlayedDate('2026-02-30', now)).toBe(false);
			expect(isPlayedDate('2026-02-30')).toBe(false);
		});
	});

	it('formats for display without a locale or a zone', () => {
		expect(formatPlayedDate('2026-09-06')).toBe('6 Sep 2026');
		expect(formatPlayedDate('2026-01-01')).toBe('1 Jan 2026');
		expect(formatPlayedDate('2026-12-25')).toBe('25 Dec 2026');
	});

	it('passes a non-date through the formatter unchanged', () => {
		expect(formatPlayedDate('not a date')).toBe('not a date');
	});
});
