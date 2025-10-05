import { Hono } from "hono";
import { practiceCoachService } from "../lib/services/practice-coach.service";

const app = new Hono();

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

