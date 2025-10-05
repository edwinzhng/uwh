import { Hono } from "hono";
import { practiceService } from "../lib/services/practice.service";
import { practiceCoachService } from "../lib/services/practice-coach.service";

const app = new Hono();

app.get("/", async (c) => {
	try {
		const practices = await practiceService.getPractices();
		return c.json(practices);
	} catch (error) {
		console.error("Error fetching practices:", error);
		return c.json({ error: "Failed to fetch practices" }, 500);
	}
});

app.get("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const practice = await practiceService.getPracticeById(id);
		if (!practice) {
			return c.json({ error: "Practice not found" }, 404);
		}

		return c.json(practice);
	} catch (error) {
		console.error("Error fetching practice:", error);
		return c.json({ error: "Failed to fetch practice" }, 500);
	}
});

app.post("/", async (c) => {
	try {
		const body = await c.req.json();

		if (!body.date) {
			return c.json({ error: "Date is required" }, 400);
		}

		const newPractice = await practiceService.createPractice({
			date: new Date(body.date),
			notes: body.notes || null,
		});

		return c.json(newPractice, 201);
	} catch (error) {
		console.error("Error creating practice:", error);
		return c.json({ error: "Failed to create practice" }, 500);
	}
});

app.put("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const body = await c.req.json();
		const dataToUpdate: {
			date?: Date;
			notes?: string | null;
		} = {};

		if (body.date) {
			dataToUpdate.date = new Date(body.date);
		}
		if (body.notes !== undefined) {
			dataToUpdate.notes = body.notes;
		}

		const updatedPractice = await practiceService.updatePractice(
			id,
			dataToUpdate,
		);

		if (!updatedPractice) {
			return c.json({ error: "Practice not found" }, 404);
		}

		return c.json(updatedPractice);
	} catch (error) {
		console.error("Error updating practice:", error);
		return c.json({ error: "Failed to update practice" }, 500);
	}
});

app.delete("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const deleted = await practiceService.deletePractice(id);
		if (!deleted) {
			return c.json({ error: "Practice not found" }, 404);
		}

		return c.json({ message: "Practice deleted successfully" });
	} catch (error) {
		console.error("Error deleting practice:", error);
		return c.json({ error: "Failed to delete practice" }, 500);
	}
});

// Practice coaches sub-routes
app.get("/:id/coaches", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const practiceCoaches = await practiceCoachService.getPracticeCoaches(id);
		return c.json(practiceCoaches);
	} catch (error) {
		console.error("Error fetching practice coaches:", error);
		return c.json({ error: "Failed to fetch practice coaches" }, 500);
	}
});

app.post("/:id/coaches", async (c) => {
	try {
		const practiceId = parseInt(c.req.param("id"));
		if (Number.isNaN(practiceId)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const body = await c.req.json();

		if (!body.coachId) {
			return c.json({ error: "Coach ID is required" }, 400);
		}

		const newPracticeCoach = await practiceCoachService.createPracticeCoach({
			practiceId,
			coachId: body.coachId,
			durationMinutes: body.durationMinutes || 90,
		});

		return c.json(newPracticeCoach, 201);
	} catch (error) {
		console.error("Error creating practice coach:", error);
		return c.json({ error: "Failed to create practice coach" }, 500);
	}
});

export default app;
