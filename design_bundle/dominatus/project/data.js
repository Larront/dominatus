/* ============================================================
   VORHAST CAMPAIGN — data model (faction-neutral)
   Exposed as window.CAMPAIGN
   ============================================================ */
window.CAMPAIGN = (function () {
	const factions = {
		wardens: { id: 'wardens', name: 'Iron Wardens', short: 'IW', color: '#5f93c4', you: true },
		ashen: { id: 'ashen', name: 'Ashen Covenant', short: 'AC', color: '#cf4b34' },
		verdant: { id: 'verdant', name: 'Verdant Scourge', short: 'VS', color: '#46ad72' },
		gilded: { id: 'gilded', name: 'Gilded Synod', short: 'GS', color: '#d6a23c' },
		void: { id: 'void', name: 'Void Reavers', short: 'VR', color: '#9778cf' },
		none: { id: 'none', name: 'Unclaimed', short: '—', color: '#5a647d' }
	};

	// biome tint per planet (the planet's own surface color)
	const planets = [
		{
			id: 'cindermaw',
			name: 'Cindermaw',
			type: 'Forge World',
			orbit: 0.34,
			angle: 215,
			size: 116,
			dur: 150,
			biome: '#c46a3a',
			render: 'lava',
			value: 'Critical',
			garrison: 'Cohort Theta',
			supply: 'Stable',
			desc: "A planet-wide foundry chained to Vorhast's heat. Whoever holds Cindermaw arms the war \u2014 its forge-temples never cool, and its labour-castes have not seen open sky in nine generations.",
			owner: 'gilded',
			split: { gilded: 64, wardens: 21, ashen: 15 },
			battles: [
				{
					turn: 4,
					attacker: 'wardens',
					defender: 'gilded',
					loc: 'Furnace Spire IX',
					result: 'defender',
					points: 2000,
					pts_a: 14,
					pts_b: 17,
					summary:
						'Iron Wardens breached the outer slag-walls but were thrown back from the primary forge-gate by entrenched Synod artillery.'
				},
				{
					turn: 3,
					attacker: 'gilded',
					defender: 'ashen',
					loc: 'The Cooling Sea',
					result: 'attacker',
					points: 1500,
					pts_a: 19,
					pts_b: 8,
					summary:
						'Gilded Synod seized the magma-tap stations, cutting Ashen supply lines to the southern hemisphere.'
				},
				{
					turn: 2,
					attacker: 'wardens',
					defender: 'gilded',
					loc: 'Rampart of Brass',
					result: 'contested',
					points: 1000,
					pts_a: 11,
					pts_b: 11,
					summary:
						'A grinding stalemate in the manufactorum trenches. Both warbands withdrew at dusk-cycle.'
				}
			]
		},
		{
			id: 'veska',
			name: 'Veska Prime',
			type: 'Cardinal Hive World',
			orbit: 0.6,
			angle: 35,
			size: 138,
			dur: 250,
			biome: '#9aa3b4',
			render: 'hive',
			value: 'Decisive',
			garrison: 'Contested',
			supply: 'Strained',
			desc: "The crown of the system \u2014 a hive-sprawl of eighty billion souls and the seat of regional command. Veska Prime is the campaign's center of gravity. It cannot be ignored, and it will not fall cleanly.",
			owner: 'ashen',
			contested: true,
			split: { ashen: 44, wardens: 39, void: 12, gilded: 5 },
			battles: [
				{
					turn: 4,
					attacker: 'wardens',
					defender: 'ashen',
					loc: 'Spire Primus',
					result: 'contested',
					points: 2000,
					pts_a: 15,
					pts_b: 15,
					summary:
						'Brutal hab-block fighting across forty levels of Spire Primus. Neither warband could claim the command pinnacle.'
				},
				{
					turn: 4,
					attacker: 'void',
					defender: 'ashen',
					loc: 'Undercroft Sumps',
					result: 'attacker',
					points: 1500,
					pts_a: 17,
					pts_b: 10,
					summary:
						'Void Reavers erupted from the sump-tunnels and severed the Ashen grip on the lower hive.'
				},
				{
					turn: 3,
					attacker: 'ashen',
					defender: 'wardens',
					loc: 'Cathedral of Saint Veska',
					result: 'attacker',
					points: 2500,
					pts_a: 21,
					pts_b: 16,
					summary:
						'The great cathedral changed hands amid catastrophic collateral. Ashen Covenant holds the relic-vaults.'
				},
				{
					turn: 2,
					attacker: 'wardens',
					defender: 'ashen',
					loc: 'Transit Hub Omega',
					result: 'defender',
					points: 1500,
					pts_a: 10,
					pts_b: 14,
					summary:
						'Warden armour bogged down in the mag-rail terminus; the assault stalled short of the objective.'
				}
			]
		},
		{
			id: 'coralis',
			name: 'Coralis Tertius',
			type: 'Ocean World',
			orbit: 0.86,
			angle: 300,
			size: 120,
			dur: 300,
			biome: '#3f8fb0',
			render: 'ocean',
			value: 'Moderate',
			garrison: 'Tide-Wardens',
			supply: 'Stable',
			desc: 'A drowned world of archipelago refineries harvesting promethium from the deep. Control shifts with the tides \u2014 literally; whole platforms vanish beneath the storm-swell each cycle.',
			owner: 'verdant',
			split: { verdant: 58, void: 27, wardens: 15 },
			battles: [
				{
					turn: 4,
					attacker: 'void',
					defender: 'verdant',
					loc: 'Rig Cluster Maelstrom',
					result: 'defender',
					points: 2000,
					pts_a: 13,
					pts_b: 17,
					summary:
						'Void boarding-craft struck the floating rigs at high tide but were swept off by Verdant counter-batteries.'
				},
				{
					turn: 2,
					attacker: 'verdant',
					defender: 'wardens',
					loc: 'Saltspire Shallows',
					result: 'attacker',
					points: 1500,
					pts_a: 18,
					pts_b: 11,
					summary:
						'The Scourge drowned the Warden beachhead under a coordinated submersible assault.'
				}
			]
		}
	];

	// compute standings (planets controlled)
	const standings = Object.values(factions)
		.filter((f) => f.id !== 'none')
		.map((f) => ({
			...f,
			held: planets.filter((p) => p.owner === f.id && !p.contested).length,
			contesting: planets.filter((p) => p.split[f.id] > 0).length
		}))
		.sort((a, b) => b.held - a.held || b.contesting - a.contesting);

	const player = {
		faction: 'wardens',
		commander: 'Castellan Vorne Adrec',
		warband: 'Iron Wardens \u2014 3rd Expeditionary Cohort',
		record: { wins: 6, losses: 4, draws: 3 },
		points: 142,
		roster: [
			{ name: 'Strike Force Adamant', meta: '2000 pts \u00b7 Primary detachment' },
			{ name: 'Recon Element Vyk', meta: '750 pts \u00b7 Fast attack' },
			{ name: 'Siege Battery Hauld', meta: '1000 pts \u00b7 Artillery' }
		]
	};

	const rules = [
		{
			n: '01',
			title: 'The Campaign Clock',
			body: 'The Vorhast Conflict runs over six Cycles. Each Cycle spans two real-world weeks. All battle reports submitted within a Cycle resolve together at its close, when planetary control is recalculated.',
			points: [
				'A warband may fight up to three logged battles per Cycle.',
				'Unplayed contested worlds drift toward the warband with the strongest supply line.',
				'The current Cycle and its deadline are shown in the command bar.'
			]
		},
		{
			n: '02',
			title: 'Claiming & Holding',
			body: 'Control of a planet is held by whichever warband commands the majority share. A world is Contested when no warband holds more than 50% \u2014 contested worlds grant no resource bonus until resolved.',
			points: [
				'Winning an attack shifts 8\u201315% control toward the attacker, scaled by points size.',
				'Defending a successful hold reinforces your share by 5%.',
				'Draws lock both shares and flag the world Contested.'
			]
		},
		{
			n: '03',
			title: 'Battle Sizes & Scoring',
			body: 'Engagements are logged at agreed points values from 1000 to 2500. Larger games move more control. Both commanders confirm the result; disputed reports are flagged for the campaign arbiter.',
			points: [
				'1000 pts \u2014 Skirmish \u00b7 1500 pts \u2014 Battle \u00b7 2000+ pts \u2014 Onslaught.',
				'Report your own victory points and casualties for the campaign ledger.',
				"Narrative engagements may be logged with the arbiter's blessing."
			]
		},
		{
			n: '04',
			title: 'Supply & Strategic Worlds',
			body: 'Forge, Agri, and Void worlds grant campaign-wide bonuses to the warband that holds them. These cascade \u2014 holding Cindermaw, for instance, reduces the points cost of armour in your next attack.',
			points: [
				'Cindermaw (Forge): \u201210% on vehicle units.',
				'Hestia (Agri): one free re-supply per Cycle.',
				'Halo Station Vex (Void): set the attacker in one contested battle per Cycle.'
			]
		},
		{
			n: '05',
			title: 'Victory',
			body: 'At the close of Cycle Six, the warband holding Veska Prime claims regional command. Should Veska Prime be contested, victory falls to the warband holding the most Decisive and Critical worlds.',
			points: [
				'Veska Prime is worth double in the final reckoning.',
				'Ties are broken by total logged victory points across the campaign.',
				'The victor names the next theatre of war.'
			]
		}
	];

	return {
		name: 'Vorhast',
		subtitle: 'The Vorhast Conflict',
		cycle: 4,
		cycleName: 'Ascendancy',
		cycleDeadline: '6 days remaining',
		factions,
		planets,
		standings,
		player,
		rules
	};
})();
