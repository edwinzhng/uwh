import { Hono } from "hono";
import { coachService } from "../lib/services/coach.service";

const app = new Hono();

app.get("/", async (c) => {
	try {
		const coaches = await coachService.getCoaches();
		return c.json(coaches);
	} catch (error) {
		console.error("Error fetching coaches:", error);
		return c.json({ error: "Failed to fetch coaches" }, 500);
	}
});

app.get("/active", async (c) => {
	try {
		const coaches = await coachService.getActiveCoaches();
		return c.json(coaches);
	} catch (error) {
		console.error("Error fetching active coaches:", error);
		return c.json({ error: "Failed to fetch active coaches" }, 500);
	}
});

app.get("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid coach ID" }, 400);
		}

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

app.post("/", async (c) => {
	try {
		const body = await c.req.json();

		if (!body.name) {
			return c.json({ error: "Name is required" }, 400);
		}

		const newCoach = await coachService.createCoach({
			name: body.name,
			isActive: body.isActive ?? true,
		});

		return c.json(newCoach, 201);
	} catch (error) {
		console.error("Error creating coach:", error);
		return c.json({ error: "Failed to create coach" }, 500);
	}
});

app.put("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid coach ID" }, 400);
		}

		const body = await c.req.json();
		const updatedCoach = await coachService.updateCoach(id, body);

		if (!updatedCoach) {
			return c.json({ error: "Coach not found" }, 404);
		}

		return c.json(updatedCoach);
	} catch (error) {
		console.error("Error updating coach:", error);
		return c.json({ error: "Failed to update coach" }, 500);
	}
});

app.delete("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid coach ID" }, 400);
		}

		const deleted = await coachService.deleteCoach(id);
		if (!deleted) {
			return c.json({ error: "Coach not found" }, 404);
		}

		return c.json({ message: "Coach deleted successfully" });
	} catch (error) {
		console.error("Error deleting coach:", error);
		return c.json({ error: "Failed to delete coach" }, 500);
	}
});

export default app;

