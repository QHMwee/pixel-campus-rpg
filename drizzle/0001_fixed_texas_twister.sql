CREATE TABLE `academic_sync_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`revision` int NOT NULL DEFAULT 0,
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `academic_sync_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `academic_sync_states_owner_unique` UNIQUE(`ownerId`)
);
