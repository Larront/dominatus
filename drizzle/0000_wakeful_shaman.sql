CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`subtitle` text,
	`current_cycle` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_slug_unique` ON `campaign` (`slug`);--> statement-breakpoint
CREATE TABLE `membership` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'commander' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_campaign_user_idx` ON `membership` (`campaign_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `membership_one_arbiter_idx` ON `membership` (`campaign_id`) WHERE "membership"."role" = 'arbiter';--> statement-breakpoint
CREATE INDEX `membership_user_idx` ON `membership` (`user_id`);--> statement-breakpoint
CREATE TABLE `warband` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`commander_user_id` text NOT NULL,
	`name` text NOT NULL,
	`short` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`commander_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `warband_campaign_idx` ON `warband` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `warband_commander_idx` ON `warband` (`commander_user_id`);--> statement-breakpoint
CREATE TABLE `world` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`value` text,
	`garrison` text,
	`supply` text,
	`render` text DEFAULT 'rocky' NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `world_campaign_idx` ON `world` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `world_control` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`warband_id` text NOT NULL,
	`share` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `world`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`warband_id`) REFERENCES `warband`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_control_world_warband_idx` ON `world_control` (`world_id`,`warband_id`);--> statement-breakpoint
CREATE TABLE `battle_report` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`world_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`outcome` text NOT NULL,
	`points_size` integer,
	`narrative` text,
	`image_path` text,
	`submitted_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`world_id`) REFERENCES `world`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `battle_report_world_idx` ON `battle_report` (`world_id`);--> statement-breakpoint
CREATE INDEX `battle_report_campaign_idx` ON `battle_report` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `battle_report_combatant` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`warband_id` text NOT NULL,
	`side` text NOT NULL,
	`victory_points` integer,
	FOREIGN KEY (`report_id`) REFERENCES `battle_report`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`warband_id`) REFERENCES `warband`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `battle_report_combatant_report_idx` ON `battle_report_combatant` (`report_id`);