CREATE TABLE `public_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` varchar(190) NOT NULL,
	`kind` enum('channel','group','user') NOT NULL,
	`title` varchar(256) NOT NULL,
	`username` varchar(64),
	`description` text,
	`photoUrl` text,
	`language` varchar(24),
	`statLabel` varchar(64),
	`statValue` int,
	`publicUrl` varchar(512),
	`canMessage` boolean NOT NULL DEFAULT false,
	`sourceUpdatedAt` timestamp,
	`refreshedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_entities_sourceId_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE TABLE `public_index_refresh_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`schedule_cron_task_uid` varchar(65),
	`enabled` boolean NOT NULL DEFAULT true,
	`maxPerRun` int NOT NULL DEFAULT 20,
	`lastCursor` int NOT NULL DEFAULT 0,
	`lastRanAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `public_index_refresh_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `public_index_refresh_settings_schedule_cron_task_uid_unique` UNIQUE(`schedule_cron_task_uid`)
);
--> statement-breakpoint
CREATE INDEX `public_entities_username_idx` ON `public_entities` (`username`);--> statement-breakpoint
CREATE INDEX `public_entities_title_idx` ON `public_entities` (`title`);--> statement-breakpoint
CREATE INDEX `public_index_refresh_task_uid_idx` ON `public_index_refresh_settings` (`schedule_cron_task_uid`);