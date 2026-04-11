UPDATE "user" SET role = 'user' WHERE role = 'editor';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user';
