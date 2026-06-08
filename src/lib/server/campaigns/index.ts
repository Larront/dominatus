import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { campaign, membership } from '$lib/server/db/schema';
import type { CampaignRole } from '$lib/server/db/schema';

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

export async function getCampaignBySlug(slug: string) {
	return db.query.campaign.findFirst({ where: eq(campaign.slug, slug) });
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
