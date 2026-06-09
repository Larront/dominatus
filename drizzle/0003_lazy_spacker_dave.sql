CREATE TABLE `painting_award` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`warband_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`kind` text NOT NULL,
	`points` integer NOT NULL,
	`note` text,
	`granted_by_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`warband_id`) REFERENCES `warband`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `painting_award_campaign_idx` ON `painting_award` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `painting_award_warband_idx` ON `painting_award` (`warband_id`);