ALTER TABLE "players" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "sporteasy_id" integer;--> statement-breakpoint
ALTER TABLE "practices" ADD COLUMN "sporteasy_id" integer;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_parent_id_players_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_sporteasy_id_unique" UNIQUE("sporteasy_id");--> statement-breakpoint
ALTER TABLE "practices" ADD CONSTRAINT "practices_sporteasy_id_unique" UNIQUE("sporteasy_id");