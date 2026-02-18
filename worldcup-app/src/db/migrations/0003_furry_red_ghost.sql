CREATE TABLE `picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`selected_team` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_picks_user_id` ON `picks` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_picks_user_match` ON `picks` (`user_id`,`match_id`);