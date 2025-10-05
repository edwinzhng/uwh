import { Hono } from "hono";
import type { PracticePlayerStatusType } from "../db/schema";
import { practicePlayerStatusService } from "../lib/services/practice-player-status.service";

const app = new Hono();

app.get("/practice/:id", async (c) => {
	try {
		const practiceId = parseInt(c.req.param("id"));
		if (Number.isNaN(practiceId)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const events =
			await practicePlayerStatusService.getPracticePlayerStatuses(practiceId);
		return c.json(events);
	} catch (error) {
		console.error("Error fetching practice events:", error);
		return c.json({ error: "Failed to fetch practice events" }, 500);
	}
});

app.get("/player/:id", async (c) => {
	try {
		const playerId = parseInt(c.req.param("id"));
		if (Number.isNaN(playerId)) {
			return c.json({ error: "Invalid player ID" }, 400);
		}

		const events =
			await practicePlayerStatusService.getPracticePlayerStatusesByPlayer(
				playerId,
			);
		return c.json(events);
	} catch (error) {
		console.error("Error fetching player events:", error);
		return c.json({ error: "Failed to fetch player events" }, 500);
	}
});

app.get("/practice/:id/type/:type", async (c) => {
	try {
		const practiceId = parseInt(c.req.param("id"));
		if (Number.isNaN(practiceId)) {
			return c.json({ error: "Invalid practice ID" }, 400);
		}

		const eventType = c.req
			.param("type")
			.toUpperCase() as PracticePlayerStatusType;
		const validTypes: PracticePlayerStatusType[] = [
			"LAST_MINUTE_ADDITION",
			"LAST_MINUTE_CANCELLATION",
			"LATE",
		];

		if (!validTypes.includes(eventType)) {
			return c.json(
				{
					error:
						"Invalid event type. Must be one of: LAST_MINUTE_ADDITION, LAST_MINUTE_CANCELLATION, LATE",
				},
				400,
			);
		}

		const events =
			await practicePlayerStatusService.getPracticePlayerStatusesByType(
				practiceId,
				eventType,
			);
		return c.json(events);
	} catch (error) {
		console.error("Error fetching practice events by type:", error);
		return c.json({ error: "Failed to fetch practice events by type" }, 500);
	}
});

app.post("/", async (c) => {
	try {
		const body = await c.req.json();

		if (!body.practiceId || !body.playerId || !body.eventType) {
			return c.json(
				{ error: "Practice ID, Player ID, and Event Type are required" },
				400,
			);
		}

		const validTypes: PracticePlayerStatusType[] = [
			"LAST_MINUTE_ADDITION",
			"LAST_MINUTE_CANCELLATION",
			"LATE",
		];

		if (!validTypes.includes(body.eventType)) {
			return c.json(
				{
					error:
						"Invalid event type. Must be one of: LAST_MINUTE_ADDITION, LAST_MINUTE_CANCELLATION, LATE",
				},
				400,
			);
		}

		const newEvent =
			await practicePlayerStatusService.createPracticePlayerStatus({
				practiceId: body.practiceId,
				playerId: body.playerId,
				statusType: body.statusType,
			});

		return c.json(newEvent, 201);
	} catch (error) {
		console.error("Error creating practice event:", error);
		return c.json({ error: "Failed to create practice event" }, 500);
	}
});

app.put("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice event ID" }, 400);
		}

		const body = await c.req.json();

		if (body.eventType) {
			const validTypes: PracticePlayerStatusType[] = [
				"LAST_MINUTE_ADDITION",
				"LAST_MINUTE_CANCELLATION",
				"LATE",
			];

			if (!validTypes.includes(body.eventType)) {
				return c.json(
					{
						error:
							"Invalid event type. Must be one of: LAST_MINUTE_ADDITION, LAST_MINUTE_CANCELLATION, LATE",
					},
					400,
				);
			}
		}

		const updatedEvent =
			await practicePlayerStatusService.updatePracticePlayerStatus(id, body);

		if (!updatedEvent) {
			return c.json({ error: "Practice event not found" }, 404);
		}

		return c.json(updatedEvent);
	} catch (error) {
		console.error("Error updating practice event:", error);
		return c.json({ error: "Failed to update practice event" }, 500);
	}
});

app.delete("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid practice event ID" }, 400);
		}

		const deleted =
			await practicePlayerStatusService.deletePracticePlayerStatus(id);
		if (!deleted) {
			return c.json({ error: "Practice event not found" }, 404);
		}

		return c.json({ message: "Practice event deleted successfully" });
	} catch (error) {
		console.error("Error deleting practice event:", error);
		return c.json({ error: "Failed to delete practice event" }, 500);
	}
});

export default app;
