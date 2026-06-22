import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	user,
	membership,
	warband,
	battleReport,
	paintingAward,
	reportAudit,
	campaign
} from '$lib/server/db/schema';

/**
 * Account deletion preserves campaign integrity rather than cascading a departing commander's
 * data away (decided 2026-06-11). Their warbands, filed reports, and granted awards are reassigned
 * to this sentinel user so opponents' battle history and the standings stay intact; their login
 * and memberships are removed. Deletion is blocked while they arbiter a campaign — leaving it
 * adminless — so they must hand it off or delete it first.
 */
export const DELETED_COMMANDER_ID = 'deleted-commander';

/** Idempotently ensure the tombstone user exists. It has no account row, so it can never log in. */
export async function ensureDeletedCommander(): Promise<void> {
	await db
		.insert(user)
		.values({
			id: DELETED_COMMANDER_ID,
			name: 'Deleted Commander',
			email: 'deleted-commander@dominatus.invalid',
			emailVerified: true
		})
		.onConflictDoNothing();
}

/** Campaigns where this user is the arbiter — deletion is blocked while any exist. */
export async function arbiterCampaignsFor(userId: string): Promise<{ id: string; name: string }[]> {
	return db
		.select({ id: campaign.id, name: campaign.name })
		.from(membership)
		.innerJoin(campaign, eq(membership.campaignId, campaign.id))
		.where(and(eq(membership.userId, userId), eq(membership.role, 'arbiter')));
}

/**
 * Detach a departing commander from the campaign world before their user row is deleted.
 * Throws if they still arbiter a campaign (the caller surfaces this to the user / aborts the
 * delete). Runs in Better Auth's `beforeDelete` hook.
 */
export async function anonymizeDepartingUser(userId: string): Promise<void> {
	const arbitered = await arbiterCampaignsFor(userId);
	if (arbitered.length > 0) {
		throw new Error(
			`Cannot delete account while you arbiter ${arbitered.length} campaign(s). Hand them off or delete them first.`
		);
	}

	await ensureDeletedCommander();

	await db
		.update(warband)
		.set({ commanderUserId: DELETED_COMMANDER_ID })
		.where(eq(warband.commanderUserId, userId));
	await db
		.update(battleReport)
		.set({ submittedByUserId: DELETED_COMMANDER_ID })
		.where(eq(battleReport.submittedByUserId, userId));
	await db
		.update(paintingAward)
		.set({ grantedByUserId: DELETED_COMMANDER_ID })
		.where(eq(paintingAward.grantedByUserId, userId));
	// The audit trail is append-only and must outlive its actor — reassign, never cascade away.
	await db
		.update(reportAudit)
		.set({ actorUserId: DELETED_COMMANDER_ID })
		.where(eq(reportAudit.actorUserId, userId));

	// Memberships are the user's active seats — drop them (cascade may be off in bun:sqlite, so
	// do it explicitly). Warbands persist under the tombstone; the seat does not.
	await db.delete(membership).where(eq(membership.userId, userId));
}
