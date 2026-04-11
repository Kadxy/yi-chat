DROP TABLE "agent" CASCADE;--> statement-breakpoint
DROP TABLE "archive_item" CASCADE;--> statement-breakpoint
DROP TABLE "archive" CASCADE;--> statement-breakpoint
DROP TABLE "bookmark" CASCADE;--> statement-breakpoint
ALTER TABLE "chat_thread" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;