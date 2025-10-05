import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
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
	positions: positionEnum("positions").notNull().array(),
	rating: integer("rating").notNull(),
	youth: boolean("youth").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Coaches table
export const coaches = pgTable("coaches", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Practices table
export const practices = pgTable("practices", {
	id: serial("id").primaryKey(),
	date: timestamp("date").notNull(),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Practice coaches join table
export const practiceCoaches = pgTable("practice_coaches", {
	id: serial("id").primaryKey(),
	practiceId: integer("practice_id")
		.notNull()
		.references(() => practices.id, { onDelete: "cascade" }),
	coachId: integer("coach_id")
		.notNull()
		.references(() => coaches.id, { onDelete: "cascade" }),
	durationMinutes: integer("duration_minutes").notNull().default(90),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types
export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
export type Position = (typeof positionEnum.enumValues)[number];

export type Coach = typeof coaches.$inferSelect;
export type NewCoach = typeof coaches.$inferInsert;

export type Practice = typeof practices.$inferSelect;
export type NewPractice = typeof practices.$inferInsert;

export type PracticeCoach = typeof practiceCoaches.$inferSelect;
export type NewPracticeCoach = typeof practiceCoaches.$inferInsert;
