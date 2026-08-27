CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`monthly_cost` real NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user_id_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`used_at` integer NOT NULL,
	`value` real,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `usage_events_subscription_id_used_at_idx` ON `usage_events` (`subscription_id`,`used_at`);