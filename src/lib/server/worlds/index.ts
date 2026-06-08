import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { world } from '$lib/server/db/schema';
import { deriveControl } from '$lib/domain/control';
import type { WorldWithControl } from '$lib/domain/world';

export type { WorldWithControl };

/** All worlds in a campaign, each with its control shares and the derived owner/contested state. */
export async function getWorldsWithControl(campaignId: string): Promise<WorldWithControl[]> {
	const rows = await db.query.world.findMany({
		where: eq(world.campaignId, campaignId),
		with: { control: true }
	});

	return rows.map((w) => {
		const shares = w.control.map((c) => ({ warbandId: c.warbandId, share: c.share }));
		return {
			id: w.id,
			name: w.name,
			type: w.type,
			render: w.render,
			shares,
			derived: deriveControl(shares)
		};
	});
}
