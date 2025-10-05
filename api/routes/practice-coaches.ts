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

export default app;

