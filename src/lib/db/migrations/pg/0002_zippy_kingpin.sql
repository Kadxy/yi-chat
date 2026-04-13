ALTER TABLE "redemption_record" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "redemption_record" CASCADE;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD COLUMN "is_used" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD COLUMN "used_by" uuid;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD CONSTRAINT "redemption_code_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_thread_id_idx" ON "chat_message" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "chat_share_sharer_id_idx" ON "chat_share" USING btree ("sharer_id");--> statement-breakpoint
CREATE INDEX "chat_thread_user_id_created_at_idx" ON "chat_thread" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "redemption_code" DROP COLUMN "max_uses";--> statement-breakpoint
ALTER TABLE "redemption_code" DROP COLUMN "used_count";