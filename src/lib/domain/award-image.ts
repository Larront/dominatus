import type { CampaignRole } from '$lib/server/db/schema/membership';

/**
 * May this actor attach, replace, or remove the image on a painting award? The write is allowed
 * if the actor is the campaign's **arbiter** or the **commander of the awarded warband** — the
 * arbiter sets one when granting; a commander curates the photo on their own warbands' awards.
 * A pure predicate so the rule is tested once and reused by every award-image write action.
 */
export function canWriteAwardImage(actor: {
	role: CampaignRole | null;
	userId: string | undefined;
	/** The commander of the warband the award belongs to. */
	commanderUserId: string;
}): boolean {
	if (actor.role === 'arbiter') return true;
	return !!actor.userId && actor.userId === actor.commanderUserId;
}
