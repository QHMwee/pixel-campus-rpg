CREATE TABLE `private_achievement_media` (
	`id` varchar(160) NOT NULL,
	`ownerId` int NOT NULL,
	`storageKey` varchar(1000) NOT NULL,
	`fileName` varchar(300) NOT NULL,
	`mimeType` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `private_achievement_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `private_achievement_media_owner_idx` ON `private_achievement_media` (`ownerId`);