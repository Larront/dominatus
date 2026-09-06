import { describe, it, expect } from 'vitest';
import { battleReportSchema } from './battle-report';

/**
 * The form-boundary rules that can't be expressed in the object shape: side sizing (one or two
 * each, and NOT necessarily balanced) and each slot being either a league warband or a named
 * outside opponent. The DB's check constraint mirrors the second rule as a backstop.
 */

type Slot = {
	side: 'attacker' | 'defender';
	warbandId?: string;
	guestName?: string | null;
};

const wb = (side: 'attacker' | 'defender', warbandId: string): Slot => ({ side, warbandId });
const guest = (side: 'attacker' | 'defender', guestName = 'Walk-in Bob'): Slot => ({
	side,
	warbandId: '',
	guestName
});

const parse = (combatants: Slot[]) =>
	battleReportSchema.safeParse({
		worldId: 'w1',
		cycle: 1,
		outcome: 'attacker',
		combatants: combatants.map((c) => ({ secondaries: [], ...c }))
	});

/** The messages attached to a given field path, for asserting *why* a parse failed. */
const messagesFor = (result: ReturnType<typeof parse>, path: (string | number)[]): string[] =>
	result.success
		? []
		: result.error.issues.filter((i) => i.path.join('.') === path.join('.')).map((i) => i.message);

describe('battleReportSchema — side sizing', () => {
	it('accepts a 1v1', () => {
		expect(parse([wb('attacker', 'a'), wb('defender', 'b')]).success).toBe(true);
	});

	it('accepts a 2v2', () => {
		const r = parse([
			wb('attacker', 'a'),
			wb('attacker', 'b'),
			wb('defender', 'c'),
			wb('defender', 'd')
		]);
		expect(r.success).toBe(true);
	});

	it('accepts an uneven 1v2', () => {
		expect(parse([wb('attacker', 'a'), wb('defender', 'b'), wb('defender', 'c')]).success).toBe(
			true
		);
	});

	it('accepts an uneven 2v1', () => {
		expect(parse([wb('attacker', 'a'), wb('attacker', 'b'), wb('defender', 'c')]).success).toBe(
			true
		);
	});

	it('rejects an empty side', () => {
		const r = parse([wb('attacker', 'a'), wb('attacker', 'b')]);
		expect(messagesFor(r, ['combatants'])).toContain('Each side needs one or two combatants');
	});

	it('rejects three on a side', () => {
		const r = parse([
			wb('attacker', 'a'),
			wb('attacker', 'b'),
			wb('attacker', 'c'),
			wb('defender', 'd')
		]);
		expect(messagesFor(r, ['combatants'])).toContain('Each side needs one or two combatants');
	});

	it('rejects the same warband appearing twice', () => {
		const r = parse([wb('attacker', 'a'), wb('defender', 'a')]);
		expect(messagesFor(r, ['combatants'])).toContain('A warband cannot appear twice');
	});
});

describe('battleReportSchema — outside opponents', () => {
	it('accepts a warband against a guest', () => {
		expect(parse([wb('attacker', 'a'), guest('defender')]).success).toBe(true);
	});

	it('accepts a guest in an uneven 1v2', () => {
		expect(parse([wb('attacker', 'a'), wb('defender', 'b'), guest('defender')]).success).toBe(true);
	});

	it('rejects a slot that is neither a warband nor a guest', () => {
		const r = parse([wb('attacker', 'a'), { side: 'defender', warbandId: '' }]);
		expect(messagesFor(r, ['combatants', 1, 'warbandId'])).toContain(
			'Select a warband, or name an outside opponent'
		);
	});

	it('treats a whitespace-only guest name as unnamed', () => {
		const r = parse([wb('attacker', 'a'), guest('defender', '   ')]);
		expect(messagesFor(r, ['combatants', 1, 'warbandId'])).toContain(
			'Select a warband, or name an outside opponent'
		);
	});

	it('rejects a slot that is both a warband and a guest', () => {
		const r = parse([wb('attacker', 'a'), { side: 'defender', warbandId: 'b', guestName: 'Bob' }]);
		expect(messagesFor(r, ['combatants', 1, 'guestName'])).toContain(
			'A slot is either a warband or a guest, not both'
		);
	});

	it('rejects a report with no league warband at all', () => {
		const r = parse([guest('attacker', 'Bob'), guest('defender', 'Sue')]);
		expect(messagesFor(r, ['combatants'])).toContain(
			'At least one combatant must be a warband in this campaign'
		);
	});

	it('allows two guests to share a name — they are not deduplicated like warbands', () => {
		expect(
			parse([wb('attacker', 'a'), guest('defender', 'Bob'), guest('defender', 'Bob')]).success
		).toBe(true);
	});
});
