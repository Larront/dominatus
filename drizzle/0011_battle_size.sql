--> Battle size replaces the free points number on a battle report, so a Combat Patrol game can be
--> recorded as the distinct game it is rather than squeezed into an integer. Existing sizes are
--> carried across as their digits (2000 -> '2000'), so no report loses the size it was fought at.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_battle_report` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`world_id` text NOT NULL,
	`cycle` integer NOT NULL,
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
INSERT INTO `__new_battle_report`("id", "campaign_id", "world_id", "cycle", "outcome", "went_first", "battle_size", "planetary_effect", "narrative", "image_path", "submitted_by_user_id", "created_at") SELECT "id", "campaign_id", "world_id", "cycle", "outcome", "went_first", CAST("points_size" AS text), "planetary_effect", "narrative", "image_path", "submitted_by_user_id", "created_at" FROM `battle_report`;--> statement-breakpoint
DROP TABLE `battle_report`;--> statement-breakpoint
ALTER TABLE `__new_battle_report` RENAME TO `battle_report`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `battle_report_world_idx` ON `battle_report` (`world_id`);--> statement-breakpoint
CREATE INDEX `battle_report_campaign_idx` ON `battle_report` (`campaign_id`);
