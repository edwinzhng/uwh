import { Hono } from "hono";
import { practiceCoachService } from "../lib/services/practice-coach.service";

const app = new Hono();

// Get coaches for a specific practice
app.get("/practice/:practiceId", async (c) => {
	try {
		const practiceId = Number.parseInt(c.req.param("practiceId"));
		if (Number.isNaN(practiceId)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const practiceCoaches = await practiceCoachService.getPracticeCoaches(practiceId);
		return c.json(practiceCoaches);
	} catch (error) {
		console.error("Error fetching practice coaches:", error);
		return c.json({ error: "Failed to fetch practice coaches" }, 500);
	}
});

// Set coaches for a practice (replaces existing)
app.post("/practice/:practiceId", async (c) => {
	try {
		const practiceId = Number.parseInt(c.req.param("practiceId"));
		if (Number.isNaN(practiceId)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const body = await c.req.json();
		const { coachIds, durationMinutes = 90 } = body as { coachIds: number[], durationMinutes?: number };

		// Delete existing practice coaches
		await practiceCoachService.deletePracticeCoachesByPractice(practiceId);

		// Create new practice coaches
		const practiceCoaches = [];
		for (const coachId of coachIds) {
			const practiceCoach = await practiceCoachService.createPracticeCoach({
				practiceId,
				coachId,
				durationMinutes,
			});
			practiceCoaches.push(practiceCoach);
		}

		return c.json(practiceCoaches);
	} catch (error) {
		console.error("Error setting practice coaches:", error);
		return c.json({ error: "Failed to set practice coaches" }, 500);
	}
});

app.put("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice coach ID" }, 400);
		}

		const body = await c.req.json();
		const updatedPracticeCoach = await practiceCoachService.updatePracticeCoach(
			id,
			body,
		);

		if (!updatedPracticeCoach) {
			return c.json({ error: "Practice coach not found" }, 404);
		}

		return c.json(updatedPracticeCoach);
	} catch (error) {
		console.error("Error updating practice coach:", error);
		return c.json({ error: "Failed to update practice coach" }, 500);
	}
});

app.delete("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice coach ID" }, 400);
		}

		const deleted = await practiceCoachService.deletePracticeCoach(id);
		if (!deleted) {
			return c.json({ error: "Practice coach not found" }, 404);
		}

		return c.json({ message: "Practice coach deleted successfully" });
	} catch (error) {
		console.error("Error deleting practice coach:", error);
		return c.json({ error: "Failed to delete practice coach" }, 500);
	}
});

export default app;

