CREATE TABLE "credit_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"type" varchar NOT NULL,
	"description" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"type" varchar NOT NULL,
	"credits" integer,
	"plan" text,
	"plan_days" integer,
	"plan_credits" integer,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "redemption_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "redemption_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"redeemed_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "credit_balance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD CONSTRAINT "redemption_code_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_record" ADD CONSTRAINT "redemption_record_code_id_redemption_code_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."redemption_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_record" ADD CONSTRAINT "redemption_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_tx_user_id_idx" ON "credit_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_tx_created_at_idx" ON "credit_transaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "redemption_record_user_idx" ON "redemption_record" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "redemption_record_code_idx" ON "redemption_record" USING btree ("code_id");