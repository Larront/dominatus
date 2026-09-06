PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_battle_report_combatant` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`warband_id` text,
	`guest_name` text,
	`side` text NOT NULL,
	`primary_mission` text,
	`force_disposition` text,
	`primary_vp` integer,
	`battle_ready_vp` integer,
	`secondaries` text,
	FOREIGN KEY (`report_id`) REFERENCES `battle_report`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`warband_id`) REFERENCES `warband`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "battle_report_combatant_identity" CHECK(("__new_battle_report_combatant"."warband_id" is not null) <> ("__new_battle_report_combatant"."guest_name" is not null))
);
--> statement-breakpoint
INSERT INTO `__new_battle_report_combatant`("id", "report_id", "warband_id", "guest_name", "side", "primary_mission", "force_disposition", "primary_vp", "battle_ready_vp", "secondaries") SELECT "id", "report_id", "warband_id", NULL, "side", "primary_mission", "force_disposition", "primary_vp", "battle_ready_vp", "secondaries" FROM `battle_report_combatant`;--> statement-breakpoint
DROP TABLE `battle_report_combatant`;--> statement-breakpoint
ALTER TABLE `__new_battle_report_combatant` RENAME TO `battle_report_combatant`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `battle_report_combatant_report_idx` ON `battle_report_combatant` (`report_id`);