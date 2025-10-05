import { and, eq, gte, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { coaches, practiceCoaches, practices } from "../db/schema";
import { db } from "../lib/db";
import { coachService } from "../lib/services/coach.service";

const app = new Hono();

// Get all coaches
app.get("/", async (c) => {
	try {
		const coaches = await coachService.getCoaches();
		return c.json(coaches);
	} catch (error) {
		console.error("Error fetching coaches:", error);
		return c.json({ error: "Failed to fetch coaches" }, 500);
	}
});

// Get a single coach by ID
app.get("/:id", async (c) => {
	try {
		const id = Number.parseInt(c.req.param("id"));
		const coach = await coachService.getCoachById(id);

		if (!coach) {
			return c.json({ error: "Coach not found" }, 404);
		}

		return c.json(coach);
	} catch (error) {
		console.error("Error fetching coach:", error);
		return c.json({ error: "Failed to fetch coach" }, 500);
	}
});

// Create a new coach
app.post("/", async (c) => {
	try {
		const body = await c.req.json();
		const coach = await coachService.createCoach(body);
		return c.json(coach, 201);
	} catch (error) {
		console.error("Error creating coach:", error);
		return c.json({ error: "Failed to create coach" }, 500);
	}
});

// Update a coach
app.put("/:id", async (c) => {
	try {
		const id = Number.parseInt(c.req.param("id"));
		const body = await c.req.json();
		const coach = await coachService.updateCoach(id, body);

		if (!coach) {
			return c.json({ error: "Coach not found" }, 404);
		}

		return c.json(coach);
	} catch (error) {
		console.error("Error updating coach:", error);
		return c.json({ error: "Failed to update coach" }, 500);
	}
});

// Delete a coach
app.delete("/:id", async (c) => {
	try {
		const id = Number.parseInt(c.req.param("id"));
		await coachService.deleteCoach(id);
		return c.json({ message: "Coach deleted successfully" });
	} catch (error) {
		console.error("Error deleting coach:", error);
		return c.json({ error: "Failed to delete coach" }, 500);
	}
});

// Get coach statistics
app.get("/statistics/hours", async (c) => {
	try {
		const startDateStr = c.req.query("startDate");
		const endDateStr = c.req.query("endDate");

		if (!startDateStr || !endDateStr) {
			return c.json(
				{ error: "startDate and endDate query params are required" },
				400,
			);
		}

		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);

		// Query to get total hours per coach
		const results = await db
			.select({
				coachId: coaches.id,
				coachName: coaches.name,
				totalMinutes: sql<number>`COALESCE(SUM(${practiceCoaches.durationMinutes}), 0)`,
				practiceCount: sql<number>`COUNT(${practiceCoaches.id})`,
			})
			.from(coaches)
			.leftJoin(practiceCoaches, eq(coaches.id, practiceCoaches.coachId))
			.leftJoin(practices, eq(practiceCoaches.practiceId, practices.id))
			.where(and(gte(practices.date, startDate), lte(practices.date, endDate)))
			.groupBy(coaches.id, coaches.name)
			.orderBy(coaches.name);

		const statistics = results.map((row) => ({
			coachId: row.coachId,
			coachName: row.coachName,
			totalHours: Number(row.totalMinutes) / 60,
			totalMinutes: Number(row.totalMinutes),
			practiceCount: Number(row.practiceCount),
		}));

		return c.json(statistics);
	} catch (error) {
		console.error("Error fetching coach statistics:", error);
		return c.json({ error: "Failed to fetch coach statistics" }, 500);
	}
});

export default app;
