import { describe, it, expect } from 'vitest';
import {
	buildChronicle,
	type ChronicleWarband,
	type ChronicleReport,
	type ChronicleAward,
	type ChronicleMuster,
	type ChronicleEvent
} from './chronicle';

/** Terse builders so the sources read as a campaign, not object soup. */
const wb = (id: string): ChronicleWarband => ({
	id,
	name: id.toUpperCase(),
	short: id.slice(0, 2).toUpperCase(),
	color: '#abc'
});

const report = (
	id: string,
	at: number,
	cycle: number,
	opts: {
		world?: string;
		outcome?: ChronicleReport['outcome'];
		att?: string[];
		def?: string[];
	} = {}
): ChronicleReport => ({
	id,
	at,
	cycle,
	worldId: opts.world ?? 'w',
	worldName: (opts.world ?? 'w').toUpperCase(),
	outcome: opts.outcome ?? 'attacker',
	attackers: (opts.att ?? ['a']).map(wb),
	defenders: (opts.def ?? ['b']).map(wb)
});

const award = (
	id: string,
	at: number,
	cycle: number,
	opts: { warband?: string; kind?: ChronicleAward['kind']; note?: string | null } = {}
): ChronicleAward => ({
	id,
	at,
	cycle,
	warband: wb(opts.warband ?? 'a'),
	kind: opts.kind ?? 'unit',
	note: opts.note ?? null
});

const muster = (warbandId: string, at: number): ChronicleMuster => ({
	id: warbandId,
	at,
	warband: wb(warbandId)
});

/** Build with empty sources unless supplied; currentCycle defaults to 1. */
const build = (
	src: {
		reports?: ChronicleReport[];
		awards?: ChronicleAward[];
		musters?: ChronicleMuster[];
		currentCycle?: number;
	} = {}
): ChronicleEvent[] =>
	buildChronicle({
		reports: src.reports ?? [],
		awards: src.awards ?? [],
		musters: src.musters ?? [],
		currentCycle: src.currentCycle ?? 1
	});

/** The (type, cycle) shape of each event — most ordering assertions only care about this. */
const shape = (events: ChronicleEvent[]) => events.map((e) => [e.type, e.cycle] as const);

describe('buildChronicle', () => {
	it('emits just the opening divider for an empty cycle-1 campaign', () => {
		const events = build();
		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({ type: 'cycle-advanced', cycle: 1, opening: true });
	});

	it('derives a battle-fought event from a report, carrying its sides and world', () => {
		const events = build({
			reports: [report('r1', 100, 1, { world: 'p', att: ['a'], def: ['b'] })]
		});
		const battle = events.find((e) => e.type === 'battle-fought');
		expect(battle).toMatchObject({
			type: 'battle-fought',
			id: 'r1',
			cycle: 1,
			worldId: 'p',
			worldName: 'P',
			outcome: 'attacker'
		});
		expect(battle?.type === 'battle-fought' && battle.attackers.map((w) => w.id)).toEqual(['a']);
		expect(battle?.type === 'battle-fought' && battle.defenders.map((w) => w.id)).toEqual(['b']);
	});

	it('derives a painting-award event, carrying kind and note', () => {
		const events = build({
			awards: [award('aw1', 100, 1, { warband: 'a', kind: 'character', note: 'Bio-Titan' })]
		});
		expect(events.find((e) => e.type === 'painting-award')).toMatchObject({
			type: 'painting-award',
			id: 'aw1',
			cycle: 1,
			kind: 'character',
			note: 'Bio-Titan'
		});
	});

	it('derives a warband-mustered event from a join record', () => {
		const events = build({ musters: [muster('a', 50)] });
		expect(events.find((e) => e.type === 'warband-mustered')).toMatchObject({
			type: 'warband-mustered',
			id: 'a',
			cycle: 1
		});
	});

	it('emits one cycle divider per cycle up to the current cycle, opening only on cycle 1', () => {
		const events = build({ currentCycle: 3 });
		const dividers = events.filter((e) => e.type === 'cycle-advanced');
		expect(dividers.map((d) => d.cycle)).toEqual([3, 2, 1]); // newest cycle first
		expect(dividers.map((d) => d.type === 'cycle-advanced' && d.opening)).toEqual([
			false,
			false,
			true
		]);
	});

	it('extends dividers to a record that sits ahead of the current cycle', () => {
		// A report stamped cycle 4 while the campaign still reads cycle 2 — the chronicle covers it.
		const events = build({ reports: [report('r1', 100, 4)], currentCycle: 2 });
		const dividers = events.filter((e) => e.type === 'cycle-advanced');
		expect(dividers.map((d) => d.cycle)).toEqual([4, 3, 2, 1]);
	});

	it('groups newest cycle first, each divider heading its cycle, newest events first within it', () => {
		const events = build({
			reports: [report('r1', 100, 1), report('r2', 200, 1), report('r3', 300, 2)],
			currentCycle: 2
		});
		expect(shape(events)).toEqual([
			['cycle-advanced', 2],
			['battle-fought', 2], // r3
			['cycle-advanced', 1],
			['battle-fought', 1], // r2 (at 200) before r1 (at 100)
			['battle-fought', 1]
		]);
		// Within cycle 1, the newer report leads.
		const cycle1BattleIds = events
			.filter((e) => e.type === 'battle-fought' && e.cycle === 1)
			.map((e) => ('id' in e ? e.id : ''));
		expect(cycle1BattleIds).toEqual(['r2', 'r1']);
	});

	it('interleaves the three record kinds within a cycle by timestamp, newest first', () => {
		const events = build({
			reports: [report('r1', 100, 1)],
			awards: [award('aw1', 300, 1)],
			musters: [muster('a', 200)]
		});
		expect(events.map((e) => e.type)).toEqual([
			'cycle-advanced', // header
			'painting-award', // at 300
			'warband-mustered', // at 200
			'battle-fought' // at 100
		]);
	});

	describe('muster cycle derivation', () => {
		it('assigns a muster the cycle current at its timestamp (monotonic over the log)', () => {
			// Cycle advances to 2 at t=200 (a cycle-2 report). A muster at t=150 is still cycle 1;
			// a muster at t=250 is cycle 2.
			const events = build({
				reports: [report('r1', 100, 1), report('r2', 200, 2)],
				musters: [muster('a', 150), muster('b', 250)],
				currentCycle: 2
			});
			const musterCycle = (id: string) =>
				events.find((e) => e.type === 'warband-mustered' && e.id === id)?.cycle;
			expect(musterCycle('a')).toBe(1);
			expect(musterCycle('b')).toBe(2);
		});

		it('places a muster before any stamped record in cycle 1', () => {
			const events = build({ reports: [report('r1', 500, 3)], musters: [muster('a', 100)] });
			expect(events.find((e) => e.type === 'warband-mustered')?.cycle).toBe(1);
		});
	});

	it('renders a quiet cycle as just its divider', () => {
		// Cycle 2 has no records; it still appears as a divider between cycle 3 and cycle 1.
		const events = build({
			reports: [report('r1', 100, 1), report('r3', 300, 3)],
			currentCycle: 3
		});
		expect(shape(events)).toEqual([
			['cycle-advanced', 3],
			['battle-fought', 3],
			['cycle-advanced', 2],
			['cycle-advanced', 1],
			['battle-fought', 1]
		]);
	});

	it('does not mutate its inputs', () => {
		const reports = [report('r1', 100, 1)];
		const musters = [muster('a', 50)];
		const before = JSON.stringify({ reports, musters });
		build({ reports, musters });
		expect(JSON.stringify({ reports, musters })).toBe(before);
	});
});
