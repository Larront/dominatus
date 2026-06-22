/**
 * The Chronicle (issue #7) — a campaign activity feed narrating the campaign as it unfolds. Like
 * standings and control, it is a *pure derivation* of the records the campaign already keeps: the
 * battle-report log, the painting awards, and the warband musters. No chronicle is stored; the feed
 * is rebuilt on read, so an arbiter report edit or a fresh muster simply re-derives it.
 *
 * This slice covers the events derivable from existing records — **battle fought**, **painting
 * award granted**, **cycle advanced**, **warband mustered** — plus **control shift**, the
 * territorial swing read straight off the control replay (issue #10), and **arbiter audit**, the
 * corrections (edit / withdraw) lifted from the changelog audit trail (issue #6) so a control or
 * standings swing caused by an edit has a visible cause.
 *
 * The output is one flat, render-ready list, newest first and grouped by cycle: cycle-advanced
 * dividers head each cycle's block (CONTEXT: Cycle), and the page renders the full campaign with no
 * pagination — the dataset is small at hobby scale.
 */

// Reuse the canonical domain unions rather than re-spelling them, so a new battle side or painting
// kind flows here automatically: control-fold owns the sides, standings owns the award kinds.
import type { FoldSide } from './control-fold';
import { deriveControl, type ControlShare } from './control';
import type { PaintingKind } from './standings';

/** A warband reduced to its feed display fields. */
export interface ChronicleWarband {
	id: string;
	name: string;
	short: string;
	color: string;
}

export type BattleOutcome = FoldSide | 'stalemate';
export type { PaintingKind };

/** A battle report reduced to what the feed narrates. `at` is its `createdAt` (ms epoch). */
export interface ChronicleReport {
	id: string;
	cycle: number;
	at: number;
	worldId: string;
	worldName: string;
	outcome: BattleOutcome;
	attackers: ChronicleWarband[];
	defenders: ChronicleWarband[];
	/**
	 * This report's shares on its world immediately before and after it applied, lifted straight
	 * from the control replay (control-fold) — never recomputed here. A change in the world's derived
	 * owner (majority holder) across this boundary emits a control-shift event. Optional so a caller
	 * (or test) with no replay context simply produces no control-shift events.
	 */
	control?: { pre: ControlShare[]; post: ControlShare[] };
}

/** A painting award reduced to what the feed narrates. */
export interface ChronicleAward {
	id: string;
	cycle: number;
	at: number;
	warband: ChronicleWarband;
	kind: PaintingKind;
	note: string | null;
}

/**
 * A warband's muster into the campaign. Unlike reports and awards it carries no cycle stamp (a
 * warband row records only when it was created), so the builder derives its cycle from the log.
 */
export interface ChronicleMuster {
	/** The warband's id — used as the event id too. */
	id: string;
	at: number;
	warband: ChronicleWarband;
}

/**
 * Whether an arbiter correction amended a report (`edit`) or withdrew it (`delete`). Mirrors the
 * server's `ReportAuditAction` enum; re-spelled here rather than imported because the domain layer
 * can't reach the DB schema (the one exception to this file's reuse-the-canonical-union rule).
 */
export type AuditAction = 'edit' | 'delete';

/**
 * An arbiter correction to the report log, lifted from the changelog audit trail (issue #6). Unlike
 * reports and awards the audit row carries no cycle stamp (only a `createdAt`), so the builder
 * derives its cycle from the log the same way a muster does. The affected world comes from the
 * report's frozen snapshot; a withdrawn report may no longer exist, but its world still does.
 */
export interface ChronicleAudit {
	id: string;
	at: number;
	action: AuditAction;
	worldId: string;
	worldName: string;
	/** The arbiter's optional free-text reason; never required (issue #6). */
	reason: string | null;
}

export interface ChronicleSources {
	reports: ChronicleReport[];
	awards: ChronicleAward[];
	musters: ChronicleMuster[];
	audits: ChronicleAudit[];
	/** The campaign's current cycle — the furthest divider the feed reaches (CONTEXT: Cycle). */
	currentCycle: number;
}

interface EventBase {
	cycle: number;
	/** Source `createdAt` (ms); dividers carry 0 since they sort by cycle, not time. */
	at: number;
}

export interface BattleFoughtEvent extends EventBase {
	type: 'battle-fought';
	id: string;
	worldId: string;
	worldName: string;
	outcome: BattleOutcome;
	attackers: ChronicleWarband[];
	defenders: ChronicleWarband[];
}

export interface PaintingAwardEvent extends EventBase {
	type: 'painting-award';
	id: string;
	warband: ChronicleWarband;
	kind: PaintingKind;
	note: string | null;
}

export interface WarbandMusteredEvent extends EventBase {
	type: 'warband-mustered';
	id: string;
	warband: ChronicleWarband;
}

export interface CycleAdvancedEvent extends EventBase {
	type: 'cycle-advanced';
	/** True for cycle 1 — the campaign's opening, which is the start rather than an advance. */
	opening: boolean;
}

/**
 * How a world's derived owner changed across one report (CONTEXT: Control):
 * - `seized` — `none → W` (an unowned or contested world gains a majority holder)
 * - `lost` — `W → none` (the holder slips below a majority; the world becomes contested)
 * - `wrested` — `W → V` (one holder's majority passes to another)
 *
 * Sub-threshold nudges (owner unchanged) and first-blood (`none → none`, no majority either side)
 * are not shifts and emit nothing.
 */
export type ControlShiftKind = 'seized' | 'lost' | 'wrested';

export interface ControlShiftEvent extends EventBase {
	type: 'control-shift';
	/** The report whose fold flipped ownership; one report touches one world, so at most one shift. */
	id: string;
	worldId: string;
	worldName: string;
	kind: ControlShiftKind;
	/** The new majority holder — set for `seized` and `wrested`; null when the world was lost to contest. */
	owner: ChronicleWarband | null;
	/** The former majority holder — set for `lost` and `wrested`; null when seized from no owner. */
	previous: ChronicleWarband | null;
}

/**
 * An arbiter correction surfaced in the feed (issue #6): `edit` reads as "amended", `delete` as
 * "withdrew". Renders with the affected world and, when present, the arbiter's reason.
 */
export interface AuditEvent extends EventBase {
	type: 'audit';
	id: string;
	action: AuditAction;
	worldId: string;
	worldName: string;
	reason: string | null;
}

export type ChronicleEvent =
	| BattleFoughtEvent
	| PaintingAwardEvent
	| WarbandMusteredEvent
	| CycleAdvancedEvent
	| ControlShiftEvent
	| AuditEvent;

/**
 * Build the chronicle from a campaign's records. Pure: no I/O, inputs never mutated.
 *
 * The one derivation that isn't a straight projection is a muster's cycle. A warband row records
 * only its creation time, but cycle is monotonic over the campaign (it only ever rises), so the
 * cycle current at any instant is the highest stamp on a report or award at-or-before it — and 1
 * before the first stamped record (a campaign opens in cycle 1).
 */
export function buildChronicle(src: ChronicleSources): ChronicleEvent[] {
	// Cycle stamps come from reports and awards; sort once so `cycleAt` can scan them in time order.
	const stamped = [
		...src.reports.map((r) => ({ at: r.at, cycle: r.cycle })),
		...src.awards.map((a) => ({ at: a.at, cycle: a.cycle }))
	].sort((a, b) => a.at - b.at);

	const cycleAt = (at: number): number => {
		let c = 1;
		for (const s of stamped) {
			if (s.at > at) break;
			if (s.cycle > c) c = s.cycle;
		}
		return c;
	};

	const events: ChronicleEvent[] = [];

	for (const r of src.reports) {
		events.push({
			type: 'battle-fought',
			cycle: r.cycle,
			at: r.at,
			id: r.id,
			worldId: r.worldId,
			worldName: r.worldName,
			outcome: r.outcome,
			attackers: r.attackers,
			defenders: r.defenders
		});

		// Control shift: did the world's derived owner change as this report folded? Owner is read
		// (not recomputed) from the replay's before/after shares via the same `deriveControl` Control
		// uses, so the chronicle can never disagree with the map. The new and former owners are always
		// combatants of this very report — a winner gains the majority, a loser sheds it — so resolve
		// their display info from the report's own sides rather than a campaign-wide lookup.
		if (r.control) {
			const before = deriveControl(r.control.pre).owner;
			const after = deriveControl(r.control.post).owner;
			if (before !== after) {
				const find = (id: string) =>
					[...r.attackers, ...r.defenders].find((w) => w.id === id) ?? null;
				events.push({
					type: 'control-shift',
					cycle: r.cycle,
					at: r.at,
					id: r.id,
					worldId: r.worldId,
					worldName: r.worldName,
					kind: before === null ? 'seized' : after === null ? 'lost' : 'wrested',
					owner: after === null ? null : find(after),
					previous: before === null ? null : find(before)
				});
			}
		}
	}
	for (const a of src.awards) {
		events.push({
			type: 'painting-award',
			cycle: a.cycle,
			at: a.at,
			id: a.id,
			warband: a.warband,
			kind: a.kind,
			note: a.note
		});
	}
	for (const m of src.musters) {
		events.push({
			type: 'warband-mustered',
			cycle: cycleAt(m.at),
			at: m.at,
			id: m.id,
			warband: m.warband
		});
	}
	// Audit rows, like musters, carry no cycle stamp — derive the cycle current at the correction's
	// timestamp. The corrected report's own cycle is in reach (on the snapshot), but the feed groups a
	// correction by *when the arbiter made it*, not the cycle of the battle it touched — the chronicle
	// narrates the campaign's timeline, and a correction is an event at its own moment.
	for (const au of src.audits) {
		events.push({
			type: 'audit',
			cycle: cycleAt(au.at),
			at: au.at,
			id: au.id,
			action: au.action,
			worldId: au.worldId,
			worldName: au.worldName,
			reason: au.reason
		});
	}

	// One divider per cycle from 1 to the furthest cycle reached — the campaign's current cycle, or a
	// later cycle if a record sits ahead of it (a report stamped past the campaign's read). A quiet
	// cycle with no records still gets its divider, so the feed shows that the campaign moved on.
	const maxCycle = events.reduce((m, e) => Math.max(m, e.cycle), Math.max(src.currentCycle, 1));
	for (let c = 1; c <= maxCycle; c++) {
		events.push({ type: 'cycle-advanced', cycle: c, at: 0, opening: c === 1 });
	}

	// Newest first, grouped by cycle: cycle descending; within a cycle the divider heads the block,
	// then events newest first; a stable id tiebreak keeps same-timestamp events deterministic.
	const isDivider = (e: ChronicleEvent) => (e.type === 'cycle-advanced' ? 1 : 0);
	const id = (e: ChronicleEvent) => (e.type === 'cycle-advanced' ? '' : e.id);
	return events.sort((a, b) => {
		if (a.cycle !== b.cycle) return b.cycle - a.cycle;
		if (isDivider(a) !== isDivider(b)) return isDivider(b) - isDivider(a);
		if (a.at !== b.at) return b.at - a.at;
		return id(b).localeCompare(id(a));
	});
}
