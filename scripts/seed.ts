/**
 * Dev seed — creates a login + the Vorhast campaign so the map renders with real data.
 *
 * Run with `bun run db:seed`. Standalone (no $lib/$env aliases) so it runs outside
 * SvelteKit; Bun auto-loads .env for DATABASE_URL / BETTER_AUTH_SECRET.
 *
 * Idempotent: re-running wipes and recreates the `vorhast` campaign (cascades to its
 * worlds/warbands/control) but leaves the dev user in place.
 */
import { eq } from 'drizzle-orm';
// Seed runs under Bun, so it uses bun:sqlite rather than the app's Node better-sqlite3
// driver. Both read/write the same local.db file.
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from '../src/lib/server/db/schema';

const { user, campaign, membership, warband, world, worldControl } = schema;

const DEV_EMAIL = 'castellan@vorhast.dev';
const DEV_PASSWORD = 'cogitator';

const client = new Database(process.env.DATABASE_URL ?? 'local.db');
// Required for the campaign delete to cascade to worlds/warbands/control.
client.exec('PRAGMA foreign_keys = ON');
const db = drizzle(client, { schema });

// Standalone auth instance (no sveltekit cookies plugin) just to create the dev user
// with a properly hashed credential account.
const auth = betterAuth({
	baseURL: process.env.ORIGIN ?? 'http://localhost:5173',
	secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret',
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true }
});

async function ensureDevUser() {
	const existing = await db.query.user.findFirst({ where: eq(user.email, DEV_EMAIL) });
	if (existing) return existing;
	await auth.api.signUpEmail({
		body: { email: DEV_EMAIL, password: DEV_PASSWORD, name: 'Castellan Vorne Adrec' }
	});
	const created = await db.query.user.findFirst({ where: eq(user.email, DEV_EMAIL) });
	if (!created) throw new Error('Failed to create dev user');
	return created;
}

async function main() {
	const dev = await ensureDevUser();

	// Fresh campaign each run (cascade clears its children).
	await db.delete(campaign).where(eq(campaign.slug, 'vorhast'));
	const [camp] = await db
		.insert(campaign)
		.values({
			slug: 'vorhast',
			name: 'The Vorhast Conflict',
			subtitle: 'Vorhast System Theatre',
			currentCycle: 4
		})
		.returning();

	await db.insert(membership).values({ campaignId: camp.id, userId: dev.id, role: 'arbiter' });

	const warbandRows = await db
		.insert(warband)
		.values([
			{ campaignId: camp.id, commanderUserId: dev.id, name: 'Iron Wardens', short: 'IW', color: '#5f93c4' },
			{ campaignId: camp.id, commanderUserId: dev.id, name: 'Ashen Covenant', short: 'AC', color: '#cf4b34' },
			{ campaignId: camp.id, commanderUserId: dev.id, name: 'Verdant Scourge', short: 'VS', color: '#46ad72' },
			{ campaignId: camp.id, commanderUserId: dev.id, name: 'Gilded Synod', short: 'GS', color: '#d6a23c' },
			{ campaignId: camp.id, commanderUserId: dev.id, name: 'Void Reavers', short: 'VR', color: '#9778cf' }
		])
		.returning();
	const wb = Object.fromEntries(warbandRows.map((w) => [w.short, w.id])) as Record<string, string>;

	const worldRows = await db
		.insert(world)
		.values([
			{
				campaignId: camp.id,
				name: 'Cindermaw',
				type: 'Forge World',
				value: 'Critical',
				garrison: 'Cohort Theta',
				supply: 'Stable',
				render: 'lava',
				description:
					'A planet-wide foundry chained to Vorhast’s heat. Whoever holds Cindermaw arms the war.'
			},
			{
				campaignId: camp.id,
				name: 'Veska Prime',
				type: 'Cardinal Hive World',
				value: 'Decisive',
				garrison: 'Contested',
				supply: 'Strained',
				render: 'hive',
				description: 'The crown of the system — a hive-sprawl of eighty billion souls.'
			},
			{
				campaignId: camp.id,
				name: 'Coralis Tertius',
				type: 'Ocean World',
				value: 'Moderate',
				garrison: 'Tide-Wardens',
				supply: 'Stable',
				render: 'ocean',
				description: 'A drowned world of archipelago refineries harvesting promethium from the deep.'
			}
		])
		.returning();
	const wd = Object.fromEntries(worldRows.map((w) => [w.name, w.id])) as Record<string, string>;

	await db.insert(worldControl).values([
		// Cindermaw — Gilded Synod hold (owner)
		{ worldId: wd['Cindermaw'], warbandId: wb['GS'], share: 64 },
		{ worldId: wd['Cindermaw'], warbandId: wb['IW'], share: 21 },
		{ worldId: wd['Cindermaw'], warbandId: wb['AC'], share: 15 },
		// Veska Prime — contested, no majority
		{ worldId: wd['Veska Prime'], warbandId: wb['AC'], share: 44 },
		{ worldId: wd['Veska Prime'], warbandId: wb['IW'], share: 39 },
		{ worldId: wd['Veska Prime'], warbandId: wb['VR'], share: 12 },
		{ worldId: wd['Veska Prime'], warbandId: wb['GS'], share: 5 },
		// Coralis Tertius — Verdant Scourge hold (owner)
		{ worldId: wd['Coralis Tertius'], warbandId: wb['VS'], share: 58 },
		{ worldId: wd['Coralis Tertius'], warbandId: wb['VR'], share: 27 },
		{ worldId: wd['Coralis Tertius'], warbandId: wb['IW'], share: 15 }
	]);

	console.log('Seeded campaign:', camp.slug);
	console.log(`  ${warbandRows.length} warbands, ${worldRows.length} worlds`);
	console.log(`Dev login → ${DEV_EMAIL} / ${DEV_PASSWORD}`);
	console.log(`Map → /campaigns/${camp.slug}`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
