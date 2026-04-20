CREATE TABLE `third_place_advancers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `third_place_advancers_group_id_unique` ON `third_place_advancers` (`group_id`);--> statement-breakpoint
DROP INDEX "idx_group_picks_user_group";--> statement-breakpoint
DROP INDEX "idx_group_teams_group_id";--> statement-breakpoint
DROP INDEX "groups_name_unique";--> statement-breakpoint
DROP INDEX "idx_matches_round_position";--> statement-breakpoint
DROP INDEX "idx_picks_user_id";--> statement-breakpoint
DROP INDEX "idx_picks_user_match";--> statement-breakpoint
DROP INDEX "results_match_id_unique";--> statement-breakpoint
DROP INDEX "third_place_advancers_group_id_unique";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
ALTER TABLE `tournament_config` ALTER COLUMN "points_r32" TO "points_r32" integer NOT NULL DEFAULT 2;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_group_picks_user_group` ON `group_picks` (`user_id`,`group_id`);--> statement-breakpoint
CREATE INDEX `idx_group_teams_group_id` ON `group_teams` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `groups_name_unique` ON `groups` (`name`);--> statement-breakpoint
CREATE INDEX `idx_matches_round_position` ON `matches` (`round`,`position`);--> statement-breakpoint
CREATE INDEX `idx_picks_user_id` ON `picks` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_picks_user_match` ON `picks` (`user_id`,`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `results_match_id_unique` ON `results` (`match_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `tournament_config` ALTER COLUMN "points_r16" TO "points_r16" integer NOT NULL DEFAULT 4;--> statement-breakpoint
ALTER TABLE `tournament_config` ALTER COLUMN "points_qf" TO "points_qf" integer NOT NULL DEFAULT 8;--> statement-breakpoint
ALTER TABLE `tournament_config` ALTER COLUMN "points_sf" TO "points_sf" integer NOT NULL DEFAULT 16;--> statement-breakpoint
ALTER TABLE `tournament_config` ALTER COLUMN "points_final" TO "points_final" integer NOT NULL DEFAULT 32;--> statement-breakpoint
ALTER TABLE `tournament_config` ADD `points_group_position` integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_config` ADD `points_group_perfect` integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_config` ADD `actual_top_scorer` text;--> statement-breakpoint
ALTER TABLE `group_picks` ADD `third_place` text;--> statement-breakpoint
ALTER TABLE `group_picks` ADD `fourth_place` text;--> statement-breakpoint
ALTER TABLE `users` ADD `top_scorer_pick` text;