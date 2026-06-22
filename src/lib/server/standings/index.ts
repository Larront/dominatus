import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { battleReport, paintingAward, warband } from '$lib/server/db/schema';
import { FOLD_ORDER } from '$lib/server/reports';
import {
	computeStandings,
	type StandingsReport,
	type StandingsAward,
	type StandingBreakdown,
	type PaintingKind
} from '$lib/domain/standings';
import type { StatReport } from '$lib/domain/stat-block';
import {
	computeMissionAnalytics,
	type MissionAnalytics,
	type MissionReport
} from '$lib/domain/mission-analytics';
import { DEFAULT_PROFILE, type ScoringProfile } from '$lib/domain/scoring-profile';

/** A standings table row: a warband's display info plus its point breakdown. */
export interface StandingRow extends StandingBreakdown {
	id: string;
	name: string;
	short: string;
	color: string;
	/** True when the viewing user commands this warband. */
	you: boolean;
}

const ZERO: StandingBreakdown = {
	win: 0,
	draw: 0,
	underdog: 0,
	narrative: 0,
	loss: 0,
	milestone: 0,
	streak: 0,
	kingkiller: 0,
	painting: 0,
	total: 0
};

const paintingValue = (profile: ScoringProfile, kind: PaintingKind): number =>
	kind === 'unit'
		? profile.paintUnit
		: kind === 'character'
			? profile.paintCharacter
			: profile.paintTerrain;

/**
 * The campaign leaderboard (ADR 0003/0004): every warband with its point breakdown, strongest
 * first, scored by the campaign's profile. Points are derived by folding the report log (the same
 * order control uses) plus painting awards, recomputed on read — no stored standings, so an arbiter
 * report edit or a profile change re-derives it.
 */
export async function getStandings(
	campaignId: string,
	profile: ScoringProfile,
	viewerUserId?: string | null
): Promise<StandingRow[]> {
	const [warbands, reports, awards] = await Promise.all([
		db.query.warband.findMany({
			where: eq(warband.campaignId, campaignId),
			columns: { id: true, name: true, short: true, color: true, commanderUserId: true }
		}),
		db.query.battleReport.findMany({
			where: eq(battleReport.campaignId, campaignId),
			// The one shared fold order, so standings replay the log exactly as control does.
			orderBy: FOLD_ORDER,
			columns: { worldId: true, outcome: true, narrative: true },
			with: { combatants: { columns: { warbandId: true, side: true } } }
		}),
		db.query.paintingAward.findMany({
			where: eq(paintingAward.campaignId, campaignId),
			columns: { warbandId: true, kind: true }
		})
	]);

	const foldReports = reports.map<StandingsReport>((r) => ({
		worldId: r.worldId,
		outcome: r.outcome,
		hasNarrative: !!r.narrative?.trim(),
		combatants: r.combatants
	}));

	const points = computeStandings(foldReports, awards as StandingsAward[], profile);

	return warbands
		.map((wb) => ({
			id: wb.id,
			name: wb.name,
			short: wb.short,
			color: wb.color,
			you: viewerUserId ? wb.commanderUserId === viewerUserId : false,
			...(points.get(wb.id) ?? ZERO)
		}))
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/**
 * The whole campaign's battle-report log shaped for the warband stat block, in fold order (oldest
 * first, so streaks read chronologically). Carries every combatant of every report — both sides —
 * since the block reads the opposing side's VP line and the head-to-head filter narrows by it. The
 * pure `computeStatBlock` does the rest under a self filter (and an optional opponent filter), so a
 * single log serves any warband's block and any rivalry the client picks (issue #12).
 *
 * Deliberately a separate read from `getStandings`' fold: the stat block isn't part of the
 * control/standings replay, and it needs columns that fold doesn't (VP and the first-turn side). It
 * can't disagree with the replay because it scores nothing control does.
 */
export async function getStatReports(campaignId: string): Promise<StatReport[]> {
	const reports = await db.query.battleReport.findMany({
		where: eq(battleReport.campaignId, campaignId),
		orderBy: FOLD_ORDER,
		columns: { outcome: true, wentFirst: true },
		with: {
			combatants: {
				columns: {
					warbandId: true,
					side: true,
					primaryVp: true,
					battleReadyVp: true,
					secondaries: true
				}
			}
		}
	});

	return reports.map<StatReport>((r) => ({
		outcome: r.outcome,
		wentFirst: r.wentFirst,
		combatants: r.combatants.map((c) => ({
			warbandId: c.warbandId,
			side: c.side,
			primaryVp: c.primaryVp,
			battleReadyVp: c.battleReadyVp,
			secondaries: c.secondaries
		}))
	}));
}

/**
 * Campaign-wide mission analytics (issue #13): win rate and average score grouped by primary and by
 * secondary mission, over the whole report log. A pure derivation like standings — read the log,
 * fold it through `computeMissionAnalytics`, never stored. Order is irrelevant here (nothing is
 * sequential), so unlike the standings/stat reads this skips the fold order. The domain function
 * constrains both breakdowns to the canonical mission set and excludes unrecorded primaries.
 */
export async function getMissionAnalytics(campaignId: string): Promise<MissionAnalytics> {
	const reports = await db.query.battleReport.findMany({
		where: eq(battleReport.campaignId, campaignId),
		columns: { outcome: true },
		with: {
			combatants: {
				columns: { side: true, primaryMission: true, primaryVp: true, secondaries: true }
			}
		}
	});

	const missionReports = reports.map<MissionReport>((r) => ({
		outcome: r.outcome,
		combatants: r.combatants.map((c) => ({
			side: c.side,
			primaryMission: c.primaryMission,
			primaryVp: c.primaryVp,
			secondaries: c.secondaries
		}))
	}));

	return computeMissionAnalytics(missionReports);
}

/** A warband for the stats selectors: display identity plus its commander, to group the field by who commands what. */
export interface StatWarband {
	id: string;
	name: string;
	short: string;
	color: string;
	commanderUserId: string;
	commanderName: string;
}

/**
 * Every warband in the campaign, with its commander, for the stat-block comparison selectors (issue
 * #12): any warband's block is viewable, and the opponent axis offers a whole commander (all their
 * warbands) or a single warband. Ordered by creation so the lists stay stable across reads.
 */
export async function getStatWarbands(campaignId: string): Promise<StatWarband[]> {
	const rows = await db.query.warband.findMany({
		where: eq(warband.campaignId, campaignId),
		columns: { id: true, name: true, short: true, color: true, commanderUserId: true },
		with: { commander: { columns: { name: true } } },
		orderBy: (w, { asc }) => [asc(w.createdAt)]
	});
	return rows.map((w) => ({
		id: w.id,
		name: w.name,
		short: w.short,
		color: w.color,
		commanderUserId: w.commanderUserId,
		commanderName: w.commander.name
	}));
}

/**
 * Painting awards for a campaign, newest first — for the arbiter's grant/revoke panel. Each award's
 * points are read live from the profile by kind (ADR 0004), so the panel reflects the live rules.
 */
export async function getPaintingAwards(
	campaignId: string,
	profile: ScoringProfile = DEFAULT_PROFILE
) {
	const rows = await db.query.paintingAward.findMany({
		where: eq(paintingAward.campaignId, campaignId),
		orderBy: (a, { desc }) => [desc(a.createdAt)],
		with: { warband: { columns: { name: true, short: true, color: true } } }
	});
	return rows.map((a) => ({
		id: a.id,
		warbandId: a.warbandId,
		warbandName: a.warband.name,
		warbandShort: a.warband.short,
		warbandColor: a.warband.color,
		cycle: a.cycle,
		kind: a.kind,
		points: paintingValue(profile, a.kind),
		note: a.note,
		imagePath: a.imagePath
	}));
}

/** A painting award shaped for the image-curation panel. */
export type EditableAward = Awaited<ReturnType<typeof getPaintingAwards>>[number];

/** One painted-models photo for the gallery: the image plus the caption fields (issue #14). */
export interface GalleryAward {
	id: string;
	warbandId: string;
	warbandName: string;
	warbandShort: string;
	warbandColor: string;
	cycle: number;
	kind: PaintingKind;
	note: string | null;
	/** The stored image filename — always present here (only awards with a photo make the gallery). */
	imagePath: string;
}

/**
 * Every painting award that carries a photo, newest first — the source for the members-only gallery
 * (issue #14) and the per-warband thumbnail strips that link into it. Awards without an image are
 * dropped here so the page never renders an empty frame; the client filters the rest by warband.
 */
export async function getGalleryAwards(campaignId: string): Promise<GalleryAward[]> {
	const rows = await db.query.paintingAward.findMany({
		where: eq(paintingAward.campaignId, campaignId),
		orderBy: (a, { desc }) => [desc(a.createdAt)],
		columns: { id: true, warbandId: true, cycle: true, kind: true, note: true, imagePath: true },
		with: { warband: { columns: { name: true, short: true, color: true } } }
	});
	return rows
		.filter((a): a is typeof a & { imagePath: string } => !!a.imagePath)
		.map((a) => ({
			id: a.id,
			warbandId: a.warbandId,
			warbandName: a.warband.name,
			warbandShort: a.warband.short,
			warbandColor: a.warband.color,
			cycle: a.cycle,
			kind: a.kind,
			note: a.note,
			imagePath: a.imagePath
		}));
}

/**
 * Painting awards a commander may attach images to — those granted to the warbands they command,
 * newest first. The arbiter curates every award through {@link getPaintingAwards}; this is the
 * commander's narrower slice so they only see (and can write images on) their own warbands' awards.
 */
export async function getAwardsForCommander(
	campaignId: string,
	userId: string,
	profile: ScoringProfile = DEFAULT_PROFILE
): Promise<EditableAward[]> {
	const rows = await db.query.paintingAward.findMany({
		where: eq(paintingAward.campaignId, campaignId),
		orderBy: (a, { desc }) => [desc(a.createdAt)],
		with: {
			warband: { columns: { name: true, short: true, color: true, commanderUserId: true } }
		}
	});
	return rows
		.filter((a) => a.warband.commanderUserId === userId)
		.map((a) => ({
			id: a.id,
			warbandId: a.warbandId,
			warbandName: a.warband.name,
			warbandShort: a.warband.short,
			warbandColor: a.warband.color,
			cycle: a.cycle,
			kind: a.kind,
			points: paintingValue(profile, a.kind),
			note: a.note,
			imagePath: a.imagePath
		}));
}

/**
 * Does this stored image belong to an award in this campaign? Gates the award-image serving route
 * so a member of one campaign can't read another's award photo by filename (parallel to
 * `imageInCampaign` for report scoresheets).
 */
export async function imageInAwardForCampaign(campaignId: string, name: string): Promise<boolean> {
	const row = await db.query.paintingAward.findFirst({
		where: and(eq(paintingAward.campaignId, campaignId), eq(paintingAward.imagePath, name)),
		columns: { id: true }
	});
	return !!row;
}

/**
 * Load an award for an image write: its current image and the commander of its warband, scoped to
 * the campaign so a stray id can't reach across campaigns. The caller pairs `commanderUserId` with
 * `canWriteAwardImage` to authorize, and `imagePath` is the prior file to clean up on replace/remove.
 */
export async function getAwardForImageWrite(
	awardId: string,
	campaignId: string
): Promise<{ imagePath: string | null; commanderUserId: string } | null> {
	const row = await db.query.paintingAward.findFirst({
		where: and(eq(paintingAward.id, awardId), eq(paintingAward.campaignId, campaignId)),
		columns: { imagePath: true },
		with: { warband: { columns: { commanderUserId: true } } }
	});
	if (!row) return null;
	return { imagePath: row.imagePath, commanderUserId: row.warband.commanderUserId };
}

/** Point an award at a stored image (or null to clear it), scoped to its campaign. */
export async function setAwardImagePath(
	awardId: string,
	campaignId: string,
	imagePath: string | null
): Promise<void> {
	await db
		.update(paintingAward)
		.set({ imagePath })
		.where(and(eq(paintingAward.id, awardId), eq(paintingAward.campaignId, campaignId)));
}

/**
 * Grant a painting award. Only the kind is recorded — its point value is read from the campaign's
 * scoring profile at compute time (ADR 0004). Caller has already checked the arbiter role.
 */
export async function grantPaintingAward(input: {
	campaignId: string;
	warbandId: string;
	cycle: number;
	kind: PaintingKind;
	note?: string | null;
	/** An optional already-stored image filename the arbiter attached at grant time. */
	imagePath?: string | null;
	grantedByUserId: string;
}): Promise<void> {
	await db.insert(paintingAward).values({
		campaignId: input.campaignId,
		warbandId: input.warbandId,
		cycle: input.cycle,
		kind: input.kind,
		note: input.note?.trim() || null,
		imagePath: input.imagePath ?? null,
		grantedByUserId: input.grantedByUserId
	});
}

/**
 * Revoke a painting award, scoped to its campaign so a stray id can't reach across campaigns.
 * Returns the revoked award's image filename (or null) so the caller can clean up the stored file.
 */
export async function revokePaintingAward(
	id: string,
	campaignId: string
): Promise<{ imagePath: string | null }> {
	const rows = await db
		.delete(paintingAward)
		.where(and(eq(paintingAward.id, id), eq(paintingAward.campaignId, campaignId)))
		.returning({ imagePath: paintingAward.imagePath });
	return { imagePath: rows[0]?.imagePath ?? null };
}
