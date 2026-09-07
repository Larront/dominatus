import { describe, it, expect } from 'vitest';
import { battleReportSchema } from './battle-report';
import { COMBAT_PATROL } from '$lib/domain/battle-sizes';
import { COMBAT_PATROL_PRIMARY_MISSIONS, PRIMARY_MISSIONS } from '$lib/domain/missions';

/**
 * The form-boundary rules that can't be expressed in the object shape: side sizing (one or two
 * each, and NOT necessarily balanced) and each slot being either a league warband or a named
 * outside opponent. The DB's check constraint mirrors the second rule as a backstop.
 */

type Slot = {
	side: 'attacker' | 'defender';
	warbandId?: string;
	guestName?: string | null;
	/** Set only by the battle-size tests, where the legal pack depends on the report's size. */
	primaryMission?: string;
};

const wb = (side: 'attacker' | 'defender', warbandId: string): Slot => ({ side, warbandId });
const guest = (side: 'attacker' | 'defender', guestName = 'Walk-in Bob'): Slot => ({
	side,
	warbandId: '',
	guestName
});

const parse = (combatants: Slot[], report: Record<string, unknown> = {}) =>
	battleReportSchema.safeParse({
		worldId: 'w1',
		cycle: 1,
		playedOn: '2026-09-06',
		outcome: 'attacker',
		...report,
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

/**
 * Battle size is one picker covering both "how big" and "which game": Combat Patrol sits alongside
 * the points sizes because that is the single choice made at the table. Picking it changes what a
 * side can legally score — a different primary pack, and no secondaries at all.
 */
describe('battleReportSchema — battle size', () => {
	const sides: Slot[] = [wb('attacker', 'a'), wb('defender', 'b')];
	const withSize = (battleSize: unknown, slots: Slot[] = sides) => parse(slots, { battleSize });

	it('accepts a size off the canonical ladder', () => {
		expect(withSize('2000').success).toBe(true);
	});

	it('accepts a Combat Patrol game', () => {
		expect(withSize(COMBAT_PATROL).success).toBe(true);
	});

	it('accepts an unrecorded size', () => {
		expect(withSize('').success).toBe(true);
		expect(withSize(null).success).toBe(true);
		expect(parse(sides).success).toBe(true);
	});

	it('rejects a size that is neither on the ladder nor a bare number', () => {
		const r = withSize('apocalypse');
		expect(r.success).toBe(false);
		expect(messagesFor(r, ['battleSize'])).toContain('Choose a battle size from the list');
	});

	it('accepts an off-ladder number, so a legacy report survives an amend', () => {
		// The field used to be a free points input; a report written then must still re-submit.
		expect(withSize('1250').success).toBe(true);
	});
});

describe('battleReportSchema — the played date', () => {
	const sides: Slot[] = [wb('attacker', 'a'), wb('defender', 'b')];
	const on = (playedOn: unknown) => parse(sides, { playedOn });

	it('accepts a calendar day', () => {
		expect(on('2026-09-06').success).toBe(true);
	});

	it('requires a played date — the fold has nothing to order by without one', () => {
		expect(on(undefined).success).toBe(false);
		expect(on('').success).toBe(false);
		expect(on(null).success).toBe(false);
	});

	it('rejects a date that is not a real day, or not a bare YYYY-MM-DD', () => {
		for (const bad of ['2026-02-30', '2026-9-6', '06/09/2026', '2026-09-06T00:00:00Z']) {
			expect(on(bad).success, bad).toBe(false);
			expect(messagesFor(on(bad), ['playedOn'])).toContain('Enter the date the battle was fought');
		}
	});

	it('says nothing about future dates — that check needs a clock, so it lives at the action', () => {
		// Deliberate: this schema runs on the client too, where the clock is the user's.
		expect(on('2099-01-01').success).toBe(true);
	});
});

describe('battleReportSchema — Combat Patrol scoring', () => {
	const sides: Slot[] = [wb('attacker', 'a'), wb('defender', 'b')];
	const combatPatrol = (slots: unknown[]) =>
		battleReportSchema.safeParse({
			worldId: 'w1',
			cycle: 1,
			playedOn: '2026-09-06',
			outcome: 'attacker',
			battleSize: COMBAT_PATROL,
			combatants: slots
		});

	it('rejects secondaries on a Combat Patrol report', () => {
		const r = combatPatrol([
			{ ...sides[0], secondaries: [{ name: 'Bring It Down', victoryPoints: 5 }] },
			{ ...sides[1], secondaries: [] }
		]);
		expect(r.success).toBe(false);
		expect(messagesFor(r, ['combatants', 0, 'secondaries'])).toContain(
			'A Combat Patrol game scores no secondary missions'
		);
	});

	it('accepts a Combat Patrol report with no secondaries', () => {
		expect(
			combatPatrol([
				{ ...sides[0], secondaries: [] },
				{ ...sides[1], secondaries: [] }
			]).success
		).toBe(true);
	});

	it('accepts a Combat Patrol primary mission on a Combat Patrol report', () => {
		const r = combatPatrol([
			{ ...sides[0], secondaries: [], primaryMission: COMBAT_PATROL_PRIMARY_MISSIONS[0] },
			{ ...sides[1], secondaries: [] }
		]);
		expect(r.success).toBe(true);
	});

	it('rejects a Combat Patrol mission at a points size', () => {
		// The packs do not overlap, so each is only valid at its own battle size.
		const r = parse(
			[{ ...sides[0], primaryMission: COMBAT_PATROL_PRIMARY_MISSIONS[0] }, sides[1]],
			{ battleSize: '2000' }
		);
		expect(r.success).toBe(false);
	});

	it('rejects a matched-play primary mission on a Combat Patrol report', () => {
		// The packs are separate: a Strike Force mission is not a Combat Patrol one.
		const r = combatPatrol([
			{ ...sides[0], secondaries: [], primaryMission: PRIMARY_MISSIONS[0] },
			{ ...sides[1], secondaries: [] }
		]);
		expect(r.success).toBe(false);
		expect(messagesFor(r, ['combatants', 0, 'primaryMission'])).toContain(
			'Choose a primary mission from the list'
		);
	});

	it('still accepts a matched-play primary mission at a points size', () => {
		const r = parse([{ ...sides[0], primaryMission: PRIMARY_MISSIONS[0] }, sides[1]], {
			battleSize: '2000'
		});
		expect(r.success).toBe(true);
	});

	it('rejects an off-pack primary mission at a points size', () => {
		const r = parse([{ ...sides[0], primaryMission: 'Not A Mission' }, sides[1]], {
			battleSize: '2000'
		});
		expect(r.success).toBe(false);
		expect(messagesFor(r, ['combatants', 0, 'primaryMission'])).toContain(
			'Choose a primary mission from the list'
		);
	});
});
