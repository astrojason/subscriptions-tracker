ALTER TABLE `subscriptions` RENAME COLUMN "monthly_cost" TO "cost";--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `billing_period` text DEFAULT 'monthly' NOT NULL;