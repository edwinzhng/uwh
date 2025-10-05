import { Hono } from "hono";
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

export default app;
