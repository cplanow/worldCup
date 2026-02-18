CREATE TABLE `tournament_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`points_r32` integer DEFAULT 1 NOT NULL,
	`points_r16` integer DEFAULT 2 NOT NULL,
	`points_qf` integer DEFAULT 4 NOT NULL,
	`points_sf` integer DEFAULT 8 NOT NULL,
	`points_final` integer DEFAULT 16 NOT NULL,
	`created_at` text NOT NULL
);
