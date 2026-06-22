import { describe, it, expect } from 'vitest';
import { buildReportSnapshot } from './snapshot';
import type { BattleReport, BattleReportCombatant } from '$lib/server/db/schema/battle-report';

const report: BattleReport = {
	id: 'r1',
	campaignId: 'c1',
	worldId: 'w1',
	cycle: 3,
	outcome: 'attacker',
	wentFirst: 'defender',
	pointsSize: 2000,
	planetaryEffect: 'Warp Storm',
	narrative: 'A hard-fought push.',
	imagePath: 'sheet.jpg',
	submittedByUserId: 'u1',
	createdAt: new Date('2026-06-01T12:00:00.000Z')
};

const combatants: BattleReportCombatant[] = [
	{
		id: 'cmb1',
		reportId: 'r1',
		warbandId: 'wb-att',
		side: 'attacker',
		primaryMission: 'Take and Hold',
		forceDisposition: 'Recon',
		primaryVp: 30,
		battleReadyVp: 10,
		secondaries: [{ name: 'Bring It Down', victoryPoints: 5 }]
	},
	{
		id: 'cmb2',
		reportId: 'r1',
		warbandId: 'wb-def',
		side: 'defender',
		primaryMission: null,
		forceDisposition: null,
		primaryVp: null,
		battleReadyVp: null,
		secondaries: null
	}
];

describe('buildReportSnapshot', () => {
	it('captures the report fields, flattening createdAt to epoch ms', () => {
		const snap = buildReportSnapshot(report, combatants);
		expect(snap.report).toEqual({
			id: 'r1',
			campaignId: 'c1',
			worldId: 'w1',
			cycle: 3,
			outcome: 'attacker',
			wentFirst: 'defender',
			pointsSize: 2000,
			planetaryEffect: 'Warp Storm',
			narrative: 'A hard-fought push.',
			imagePath: 'sheet.jpg',
			submittedByUserId: 'u1',
			createdAt: Date.parse('2026-06-01T12:00:00.000Z')
		});
	});

	it('captures every combatant, normalising null secondaries to an empty array', () => {
		const snap = buildReportSnapshot(report, combatants);
		expect(snap.combatants).toEqual([
			{
				warbandId: 'wb-att',
				side: 'attacker',
				primaryMission: 'Take and Hold',
				forceDisposition: 'Recon',
				primaryVp: 30,
				battleReadyVp: 10,
				secondaries: [{ name: 'Bring It Down', victoryPoints: 5 }]
			},
			{
				warbandId: 'wb-def',
				side: 'defender',
				primaryMission: null,
				forceDisposition: null,
				primaryVp: null,
				battleReadyVp: null,
				secondaries: []
			}
		]);
	});

	it('round-trips losslessly through JSON', () => {
		const snap = buildReportSnapshot(report, combatants);
		expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
	});
});
