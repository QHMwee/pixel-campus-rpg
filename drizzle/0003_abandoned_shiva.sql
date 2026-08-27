CREATE TABLE `notion_sync_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`fingerprint` varchar(120) NOT NULL,
	`status` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
	`pageUrl` varchar(2000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notion_sync_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `notion_sync_events_owner_fingerprint_unique` UNIQUE(`ownerId`,`fingerprint`)
);
--> statement-breakpoint
CREATE INDEX `notion_sync_events_owner_idx` ON `notion_sync_events` (`ownerId`);