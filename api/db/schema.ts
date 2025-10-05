import {
	pgEnum,
	pgTable,
	serial,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

// Define the position enum
export const positionEnum = pgEnum("position", [
	"FORWARD",
	"WING",
	"CENTER",
	"FULL_BACK",
]);

// Players table
export const players = pgTable("players", {
	id: serial("id").primaryKey(),
	fullName: varchar("full_name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	sporteasyId: varchar("sporteasy_id", { length: 100 }),
	position: positionEnum("position").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Export types
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Position = (typeof positionEnum.enumValues)[number];
