CREATE TABLE `report_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`report_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`reason` text,
	`snapshot` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `report_audit_campaign_idx` ON `report_audit` (`campaign_id`);--> statement-breakpoint
CREATE INDEX `report_audit_report_idx` ON `report_audit` (`report_id`);