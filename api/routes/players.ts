import { Hono } from "hono";
import type { Position } from "../db/schema";
import { playerService } from "../lib/services/player.service";

const app = new Hono();

app.get("/", async (c) => {
	try {
		const players = await playerService.getPlayers();
		return c.json(players);
	} catch (error) {
		console.error("Error fetching players:", error);
		return c.json({ error: "Failed to fetch players" }, 500);
	}
});

app.post("/", async (c) => {
	try {
		const body = await c.req.json();

		if (
			!body.fullName ||
			!body.email ||
			!body.positions ||
			!Array.isArray(body.positions) ||
			body.positions.length === 0
		) {
			return c.json(
				{ error: "Full name, email, and at least one position are required" },
				400,
			);
		}

		// Validate position enum
		const validPositions: Position[] = [
			"FORWARD",
			"WING",
			"CENTER",
			"FULL_BACK",
		];
		for (const position of body.positions) {
			if (!validPositions.includes(position)) {
				return c.json(
					{
						error:
							"Invalid position. Must be one of: FORWARD, WING, CENTER, FULL_BACK",
					},
					400,
				);
			}
		}

		// Validate rating
		if (body.rating === undefined || body.rating === null) {
			return c.json({ error: "Rating is required" }, 400);
		}

		const rating =
			typeof body.rating === "number" ? body.rating : parseInt(body.rating);
		if (Number.isNaN(rating) || rating < 1 || rating > 10) {
			return c.json({ error: "Rating must be a number between 1 and 10" }, 400);
		}

		const playerData = {
			fullName: body.fullName,
			email: body.email,
			positions: body.positions,
			rating: rating,
			youth: body.youth ?? false,
		};

		const newPlayer = await playerService.createPlayer(playerData);

		return c.json(newPlayer, 201);
	} catch (error) {
		console.error("Error creating player:", error);
		if (error instanceof Error && error.message.includes("duplicate key")) {
			return c.json({ error: "Email already exists" }, 409);
		}
		return c.json({ error: "Failed to create player" }, 500);
	}
});

app.get("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid player ID" }, 400);
		}

		const player = await playerService.getPlayerById(id);
		if (!player) {
			return c.json({ error: "Player not found" }, 404);
		}

		return c.json(player);
	} catch (error) {
		console.error("Error fetching player:", error);
		return c.json({ error: "Failed to fetch player" }, 500);
	}
});

app.put("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid player ID" }, 400);
		}

		const body = await c.req.json();

		// Validate positions if provided
		if (body.positions) {
			if (!Array.isArray(body.positions) || body.positions.length === 0) {
				return c.json({ error: "Positions must be a non-empty array" }, 400);
			}
			const validPositions: Position[] = [
				"FORWARD",
				"WING",
				"CENTER",
				"FULL_BACK",
			];
			for (const position of body.positions) {
				if (!validPositions.includes(position)) {
					return c.json(
						{
							error:
								"Invalid position. Must be one of: FORWARD, WING, CENTER, FULL_BACK",
						},
						400,
					);
				}
			}
		}

		// Validate rating if provided
		if (body.rating !== undefined) {
			const rating = parseInt(body.rating);
			if (Number.isNaN(rating) || rating < 1 || rating > 10) {
				return c.json(
					{ error: "Rating must be a number between 1 and 10" },
					400,
				);
			}
		}

		const updatedPlayer = await playerService.updatePlayer(id, body);

		if (!updatedPlayer) {
			return c.json({ error: "Player not found" }, 404);
		}

		return c.json(updatedPlayer);
	} catch (error) {
		console.error("Error updating player:", error);
		return c.json({ error: "Failed to update player" }, 500);
	}
});

app.delete("/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid player ID" }, 400);
		}

		const deleted = await playerService.deletePlayer(id);
		if (!deleted) {
			return c.json({ error: "Player not found" }, 404);
		}

		return c.json({ message: "Player deleted successfully" });
	} catch (error) {
		console.error("Error deleting player:", error);
		return c.json({ error: "Failed to delete player" }, 500);
	}
});

app.get("/position/:position", async (c) => {
	try {
		const position = c.req.param("position").toUpperCase() as Position;
		const validPositions: Position[] = [
			"FORWARD",
			"WING",
			"CENTER",
			"FULL_BACK",
		];

		if (!validPositions.includes(position)) {
			return c.json(
				{
					error:
						"Invalid position. Must be one of: FORWARD, WING, CENTER, FULL_BACK",
				},
				400,
			);
		}

		const players = await playerService.getPlayersByPosition(position);
		return c.json(players);
	} catch (error) {
		console.error("Error fetching players by position:", error);
		return c.json({ error: "Failed to fetch players by position" }, 500);
	}
});

export default app;
