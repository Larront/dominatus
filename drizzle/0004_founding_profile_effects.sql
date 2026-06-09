CREATE TABLE `planetary_effect` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `planetary_effect_campaign_idx` ON `planetary_effect` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `world_effect` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`effect_id` text NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `world`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`effect_id`) REFERENCES `planetary_effect`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_effect_world_effect_idx` ON `world_effect` (`world_id`,`effect_id`);--> statement-breakpoint
ALTER TABLE `campaign` ADD `join_code` text;--> statement-breakpoint
ALTER TABLE `campaign` ADD `scoring_profile` text;--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_join_code_unique` ON `campaign` (`join_code`);