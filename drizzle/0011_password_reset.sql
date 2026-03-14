ALTER TABLE "users" ADD COLUMN "reset_token" varchar(255);
ALTER TABLE "users" ADD COLUMN "reset_token_expires_at" timestamp;
CREATE INDEX "users_reset_token_idx" ON "users" ("reset_token");
