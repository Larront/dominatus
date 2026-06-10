import { error, redirect } from '@sveltejs/kit';
import { and, eq, like } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { campaign, membership, world, planetaryEffect } from '$lib/server/db/schema';
import type { CampaignRole } from '$lib/server/db/schema';
import type { ScoringProfile } from '$lib/domain/scoring-profile';
import type { FoundingWorldInput, FoundingEffectInput } from '$lib/schemas/campaign-founding';

/** Campaigns the user belongs to, most recent first. */
export async function getUserCampaigns(userId: string) {
	const rows = await db.query.membership.findMany({
		where: eq(membership.userId, userId),
		with: { campaign: true }
	});
	return rows
		.map((m) => ({ ...m.campaign, role: m.role }))
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Derive a URL-safe slug from a campaign name; empty input falls back to `campaign`. */
function slugify(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return base || 'campaign';
}

// Join codes (CONTEXT: Join Code) — 5 chars from an unambiguous alphabet (no 0/O/1/I/L), so a
// code is easy to read aloud and type. ~28M combinations; collisions are re-rolled at create time.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 5;

export function generateJoinCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
	let code = '';
	for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
	return code;
}

/**
 * Found a new campaign and enlist its creator as the sole arbiter, atomically — campaign (with its
 * scoring profile and generated join code), arbiter membership, the generated worlds, and the
 * planetary-effect pool, all in one synchronous better-sqlite3 transaction. The slug is derived
 * from the name and disambiguated with a numeric suffix; the join code is re-rolled on collision.
 * Worlds get their UUIDs at insert, so orbital positions (derived from id + index) follow.
 */
export function createCampaign(input: {
	name: string;
	subtitle: string | null;
	arbiterUserId: string;
	scoringProfile: ScoringProfile;
	worlds: FoundingWorldInput[];
	effects: FoundingEffectInput[];
}): { slug: string; joinCode: string } {
	return db.transaction((tx) => {
		const base = slugify(input.name);
		const takenSlugs = new Set(
			tx
				.select({ slug: campaign.slug })
				.from(campaign)
				.where(like(campaign.slug, `${base}%`))
				.all()
				.map((r) => r.slug)
		);
		let slug = base;
		for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;

		const takenCodes = new Set(
			tx
				.select({ code: campaign.joinCode })
				.from(campaign)
				.all()
				.map((r) => r.code)
		);
		let joinCode = generateJoinCode();
		while (takenCodes.has(joinCode)) joinCode = generateJoinCode();

		const created = tx
			.insert(campaign)
			.values({
				slug,
				joinCode,
				name: input.name,
				subtitle: input.subtitle,
				scoringProfile: input.scoringProfile
			})
			.returning({ id: campaign.id, slug: campaign.slug, joinCode: campaign.joinCode })
			.get();

		tx.insert(membership)
			.values({ campaignId: created.id, userId: input.arbiterUserId, role: 'arbiter' })
			.run();

		if (input.worlds.length) {
			tx.insert(world)
				.values(
					input.worlds.map((w) => ({
						campaignId: created.id,
						name: w.name,
						type: w.type,
						render: w.render,
						value: w.value || null,
						garrison: w.garrison || null,
						supply: w.supply || null,
						description: w.description || null
					}))
				)
				.run();
		}

		const pool = input.effects.filter((e) => e.title.trim().length > 0);
		if (pool.length) {
			tx.insert(planetaryEffect)
				.values(
					pool.map((e) => ({
						campaignId: created.id,
						title: e.title,
						description: e.description || null
					}))
				)
				.run();
		}

		return { slug: created.slug, joinCode: created.joinCode! };
	});
}

/**
 * Join an existing campaign by its code (its slug). Enlists the user as a commander. Returns a
 * discriminated result rather than throwing so the hub can surface the reason inline.
 */
export async function joinCampaign(input: {
	code: string;
	userId: string;
}): Promise<{ ok: true; slug: string } | { ok: false; reason: 'not-found' | 'already-member' }> {
	const found = await getCampaignByJoinCode(input.code.trim().toUpperCase());
	if (!found) return { ok: false, reason: 'not-found' };

	const existing = await getMembership(found.id, input.userId);
	if (existing) return { ok: false, reason: 'already-member' };

	await db
		.insert(membership)
		.values({ campaignId: found.id, userId: input.userId, role: 'commander' });
	return { ok: true, slug: found.slug };
}

export async function getCampaignBySlug(slug: string) {
	return db.query.campaign.findFirst({ where: eq(campaign.slug, slug) });
}

/** Resolve a campaign by its join code (the credential a commander enters to enlist). */
export async function getCampaignByJoinCode(code: string) {
	return db.query.campaign.findFirst({ where: eq(campaign.joinCode, code) });
}

/**
 * Re-roll a campaign's join code, revoking the old one (CONTEXT: Join Code) — for when a code has
 * been shared too widely. Re-rolls on the rare collision. Caller has asserted the arbiter role.
 */
export function regenerateJoinCode(campaignId: string): string {
	return db.transaction((tx) => {
		const taken = new Set(
			tx
				.select({ code: campaign.joinCode })
				.from(campaign)
				.all()
				.map((r) => r.code)
		);
		let code = generateJoinCode();
		while (taken.has(code)) code = generateJoinCode();
		tx.update(campaign).set({ joinCode: code }).where(eq(campaign.id, campaignId)).run();
		return code;
	});
}

/**
 * Update an arbiter-editable campaign's details. Slug and id are immutable (links stay stable);
 * the cycle is clamped to ≥1. Caller has already asserted the arbiter role.
 */
export async function updateCampaignDetails(
	campaignId: string,
	details: { name: string; subtitle: string | null; currentCycle: number }
): Promise<void> {
	await db
		.update(campaign)
		.set({
			name: details.name,
			subtitle: details.subtitle,
			currentCycle: Math.max(1, Math.trunc(details.currentCycle))
		})
		.where(eq(campaign.id, campaignId));
}

/** Replace a campaign's scoring profile (ADR 0004). Standings recompute on read, so this
 * re-scores history. Caller has asserted the arbiter role. */
export async function updateScoringProfile(
	campaignId: string,
	profile: ScoringProfile
): Promise<void> {
	await db.update(campaign).set({ scoringProfile: profile }).where(eq(campaign.id, campaignId));
}

export async function getMembership(campaignId: string, userId: string) {
	return db.query.membership.findFirst({
		where: and(eq(membership.campaignId, campaignId), eq(membership.userId, userId))
	});
}

/**
 * Resolve a campaign by slug and assert the user is a member. Throws 404 if the
 * campaign doesn't exist or the user has no business seeing it (don't leak existence).
 */
export async function requireCampaignAccess(slug: string, userId: string) {
	const found = await getCampaignBySlug(slug);
	if (!found) throw error(404, 'Campaign not found');
	const member = await getMembership(found.id, userId);
	if (!member) throw error(404, 'Campaign not found');
	return { campaign: found, role: member.role as CampaignRole };
}

/**
 * The single seam for arbiter authority (CONTEXT.md — campaign authority): an anonymous visitor is
 * sent to login, a non-member gets a 404 (don't leak existence), and a commander gets a 403. The
 * one place every wholly-arbiter route action crosses, so authority is decided here, not re-stated
 * per action. Mixed-authority actions (e.g. report submit-or-edit) still compose `requireCampaignAccess`
 * with their own conditional check.
 */
export async function requireArbiter(slug: string, userId: string | undefined) {
	if (!userId) throw redirect(302, '/');
	const access = await requireCampaignAccess(slug, userId);
	if (access.role !== 'arbiter') throw error(403, 'Only the arbiter can manage this campaign.');
	// `userId` is proven present here — return it so actions don't re-narrow `locals.user`.
	return { ...access, userId };
}
