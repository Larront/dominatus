--> A battle report now records the calendar day the game was *fought* (`played_on`), separate from
--> `created_at`, the moment it was filed. The fold orders by the played date from here on (ADR 0006),
--> so a report submitted days late applies where the battle happened instead of at the end of the log.
--> Existing rows are backfilled from their submit day, which is the only played date the app ever
--> knew — so the fold order is byte-for-byte unchanged by this migration and no control re-derives.
--> A full table rebuild rather than ADD COLUMN: SQLite rejects a NOT NULL column whose default is a
--> non-constant expression, and the per-row backfill has to come from `created_at` anyway.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_battle_report` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`world_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`played_on` text DEFAULT (strftime('%Y-%m-%d','now')) NOT NULL,
	`outcome` text NOT NULL,
	`went_first` text,
	`battle_size` text,
	`planetary_effect` text,
	`narrative` text,
	`image_path` text,
	`submitted_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`world_id`) REFERENCES `world`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_battle_report`("id", "campaign_id", "world_id", "cycle", "played_on", "outcome", "went_first", "battle_size", "planetary_effect", "narrative", "image_path", "submitted_by_user_id", "created_at") SELECT "id", "campaign_id", "world_id", "cycle", date("created_at" / 1000, 'unixepoch'), "outcome", "went_first", "battle_size", "planetary_effect", "narrative", "image_path", "submitted_by_user_id", "created_at" FROM `battle_report`;--> statement-breakpoint
DROP TABLE `battle_report`;--> statement-breakpoint
ALTER TABLE `__new_battle_report` RENAME TO `battle_report`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `battle_report_world_idx` ON `battle_report` (`world_id`);--> statement-breakpoint
CREATE INDEX `battle_report_campaign_idx` ON `battle_report` (`campaign_id`);
