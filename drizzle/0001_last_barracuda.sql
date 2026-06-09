ALTER TABLE `battle_report` ADD `planetary_effect` text;--> statement-breakpoint
ALTER TABLE `battle_report_combatant` ADD `primary_vp` integer;--> statement-breakpoint
ALTER TABLE `battle_report_combatant` ADD `battle_ready_vp` integer;--> statement-breakpoint
ALTER TABLE `battle_report_combatant` ADD `secondaries` text;--> statement-breakpoint
ALTER TABLE `battle_report_combatant` DROP COLUMN `victory_points`;