CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_a` text NOT NULL,
	`team_b` text NOT NULL,
	`round` integer NOT NULL,
	`position` integer NOT NULL,
	`winner` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_matches_round_position` ON `matches` (`round`,`position`);--> statement-breakpoint
DROP INDEX `idx_users_username`;