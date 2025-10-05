ALTER TABLE "players" DROP CONSTRAINT "players_parent_id_players_id_fk";
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "parent_email" varchar(255);--> statement-breakpoint
ALTER TABLE "players" DROP COLUMN "parent_id";