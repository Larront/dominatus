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
// Pure domain fold (ADR 0002) — control is derived from the report log, not hand-set.
import { foldControl, type FoldReport } from '../src/lib/domain/control-fold';
import { DEFAULT_PROFILE } from '../src/lib/domain/scoring-profile';

const {
	user,
	campaign,
	membership,
	warband,
	world,
	worldControl,
	battleReport,
	battleReportCombatant
} = schema;

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
			joinCode: 'VRH42',
			name: 'The Vorhast Conflict',
			subtitle: 'Vorhast System Theatre',
			scoringProfile: DEFAULT_PROFILE,
			currentCycle: 4
		})
		.returning();

	await db.insert(membership).values({ campaignId: camp.id, userId: dev.id, role: 'arbiter' });

	const warbandRows = await db
		.insert(warband)
		.values([
			{
				campaignId: camp.id,
				commanderUserId: dev.id,
				name: 'Iron Wardens',
				short: 'IW',
				color: '#5f93c4'
			},
			{
				campaignId: camp.id,
				commanderUserId: dev.id,
				name: 'Ashen Covenant',
				short: 'AC',
				color: '#cf4b34'
			},
			{
				campaignId: camp.id,
				commanderUserId: dev.id,
				name: 'Verdant Scourge',
				short: 'VS',
				color: '#46ad72'
			},
			{
				campaignId: camp.id,
				commanderUserId: dev.id,
				name: 'Gilded Synod',
				short: 'GS',
				color: '#d6a23c'
			},
			{
				campaignId: camp.id,
				commanderUserId: dev.id,
				name: 'Void Reavers',
				short: 'VR',
				color: '#9778cf'
			}
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
				description:
					'A drowned world of archipelago refineries harvesting promethium from the deep.'
			}
		])
		.returning();
	const wd = Object.fromEntries(worldRows.map((w) => [w.name, w.id])) as Record<string, string>;

	// Battle reports drive everything: control is the fold of this log (ADR 0002), never
	// hand-set, so worlds start uncontested and these games produce the standings. Each
	// entry is one game over a world; `win` is attacker-victory, `draw` moves no control.
	type SeedReport = {
		world: string;
		cycle: number;
		pts: number;
		win: boolean; // false → stalemate
		att: string;
		def: string;
		narrative: string;
	};
	const win = (
		world: string,
		att: string,
		def: string,
		cycle: number,
		pts: number,
		narrative: string
	): SeedReport => ({ world, cycle, pts, win: true, att, def, narrative });
	const draw = (
		world: string,
		att: string,
		def: string,
		cycle: number,
		pts: number,
		narrative: string
	): SeedReport => ({ world, cycle, pts, win: false, att, def, narrative });

	// Chronological order; control reflects the *recent* games, so later wins stick.
	const log: SeedReport[] = [
		// Cindermaw — a Gilded Synod ascendancy (ends GS 60% owner, IW 20%).
		win('Cindermaw', 'GS', 'AC', 1, 1000, 'Synod batteries break the first Ashen push at the slag-walls.'),
		win('Cindermaw', 'GS', 'AC', 1, 1500, 'The magma-tap stations fall to the Synod.'),
		win('Cindermaw', 'GS', 'IW', 2, 1500, 'Iron Wardens repulsed from the primary forge-gate.'),
		win('Cindermaw', 'GS', 'AC', 2, 2000, 'Ashen supply lines to the southern hemisphere severed.'),
		win('Cindermaw', 'GS', 'IW', 3, 2000, 'The Synod hold the foundry-spires against a Warden night-assault.'),
		win('Cindermaw', 'GS', 'AC', 3, 2000, 'Cindermaw all but cast in Synod gold.'),
		win('Cindermaw', 'IW', 'AC', 4, 1500, 'Iron Wardens claw back the northern refineries from the Ashen.'),
		win('Cindermaw', 'IW', 'AC', 4, 2000, 'A second Warden gain along the cooling-canals.'),

		// Veska Prime — a three-way grind that ends contested (IW 20 / VR 10 / AC 10).
		win('Veska Prime', 'AC', 'IW', 1, 1000, 'Ashen Covenant seize the cathedral district.'),
		win('Veska Prime', 'AC', 'VR', 1, 1500, 'Void Reavers driven from the relic-vaults.'),
		win('Veska Prime', 'AC', 'IW', 2, 2000, 'The Covenant tighten their grip on Spire Primus.'),
		win('Veska Prime', 'AC', 'VR', 2, 2000, 'Another Reaver boarding-party repelled.'),
		draw('Veska Prime', 'IW', 'AC', 3, 2000, 'Brutal hab-block fighting; neither side claims the command pinnacle.'),
		win('Veska Prime', 'IW', 'AC', 3, 2000, 'Iron Wardens storm forty levels of the spire.'),
		win('Veska Prime', 'IW', 'AC', 4, 1500, 'The Wardens break the Ashen hold on the upper hives.'),
		win('Veska Prime', 'VR', 'AC', 4, 1000, 'Void Reavers seize a foothold amid the collapse.'),

		// Coralis Tertius — lightly fought, Verdant Scourge ahead but far from owning it.
		win('Coralis Tertius', 'VS', 'VR', 2, 1500, 'Tide-Wardens swamp a Reaver landing at high tide.'),
		win('Coralis Tertius', 'VS', 'VR', 3, 2000, 'Verdant counter-batteries sweep the floating rigs clean.'),
		win('Coralis Tertius', 'VS', 'IW', 3, 2000, 'Iron Wardens fail to hold the promethium platforms.'),
		win('Coralis Tertius', 'VR', 'IW', 4, 1500, 'Void Reavers raid the deep-derricks under cover of storm.')
	];

	// Stamp each report into the past in array order so the DB's submit-time fold order
	// matches the chronology folded here. (Live submissions land after `base`.)
	const base = Date.now();
	const reportRows = log.map((e, i) => ({
		id: crypto.randomUUID(),
		campaignId: camp.id,
		worldId: wd[e.world],
		cycle: e.cycle,
		outcome: (e.win ? 'attacker' : 'stalemate') as 'attacker' | 'stalemate',
		pointsSize: e.pts,
		narrative: e.narrative,
		submittedByUserId: dev.id,
		createdAt: new Date(base - (log.length - i) * 60_000)
	}));
	await db.insert(battleReport).values(reportRows);
	await db.insert(battleReportCombatant).values(
		log.flatMap((e, i) => [
			{ reportId: reportRows[i].id, warbandId: wb[e.att], side: 'attacker' as const },
			{ reportId: reportRows[i].id, warbandId: wb[e.def], side: 'defender' as const }
		])
	);

	// Fold each world's reports into its control snapshot — exactly what the app does on submit.
	const controlRows = worldRows.flatMap((w) => {
		const reports = log
			.filter((e) => wd[e.world] === w.id)
			.map<FoldReport>((e) => ({
				outcome: e.win ? 'attacker' : 'stalemate',
				combatants: [
					{ warbandId: wb[e.att], side: 'attacker' },
					{ warbandId: wb[e.def], side: 'defender' }
				]
			}));
		return [...foldControl(reports).entries()].map(([warbandId, share]) => ({
			worldId: w.id,
			warbandId,
			share
		}));
	});
	if (controlRows.length) await db.insert(worldControl).values(controlRows);

	console.log('Seeded campaign:', camp.slug);
	console.log(
		`  ${warbandRows.length} warbands, ${worldRows.length} worlds, ${log.length} battle reports`
	);
	console.log('  control (folded from reports):');
	for (const w of worldRows) {
		const held = controlRows
			.filter((c) => c.worldId === w.id)
			.sort((a, b) => b.share - a.share)
			.map((c) => `${warbandRows.find((x) => x.id === c.warbandId)?.short}:${c.share}%`)
			.join(' ');
		console.log(`    ${w.name}: ${held || 'uncontested'}`);
	}
	console.log(`Dev login → ${DEV_EMAIL} / ${DEV_PASSWORD}`);
	console.log(`Map → /campaigns/${camp.slug}`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
