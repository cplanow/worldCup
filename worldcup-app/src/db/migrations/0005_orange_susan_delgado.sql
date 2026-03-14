CREATE TABLE `group_picks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`group_id` integer NOT NULL,
	`first_place` text NOT NULL,
	`second_place` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_group_picks_user_group` ON `group_picks` (`user_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `group_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`team_name` text NOT NULL,
	`final_position` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_group_teams_group_id` ON `group_teams` (`group_id`);--> statement-breakpoint
CREATE TABLE `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
ALTER TABLE `tournament_config` ADD `group_stage_locked` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_config` ADD `points_group_advance` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_config` ADD `points_group_exact` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `group_picks_submitted` integer DEFAULT false NOT NULL;