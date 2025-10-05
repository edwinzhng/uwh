import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { type Position, playerService } from "./lib/database";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? ["https://uwh.vercel.app"]
				: ["http://localhost:3100"],
		credentials: true,
	}),
);

// Health check endpoint
app.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV || "development",
	});
});

// API routes
app.get("/api/hello", (c) => {
	return c.json({
		message: "Hello from Hono backend!",
		timestamp: new Date().toISOString(),
	});
});

app.get("/api/players", async (c) => {
	try {
		const players = await playerService.getPlayers();
		return c.json(players);
	} catch (error) {
		console.error("Error fetching players:", error);
		return c.json({ error: "Failed to fetch players" }, 500);
	}
});

app.post("/api/players", async (c) => {
	try {
		const body = await c.req.json();

		// Validate required fields
		if (!body.fullName || !body.email || !body.position) {
			return c.json(
				{ error: "Full name, email, and position are required" },
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
		if (!validPositions.includes(body.position)) {
			return c.json(
				{
					error:
						"Invalid position. Must be one of: FORWARD, WING, CENTER, FULL_BACK",
				},
				400,
			);
		}

		const newPlayer = await playerService.createPlayer({
			fullName: body.fullName,
			email: body.email,
			sporteasyId: body.sporteasyId || null,
			position: body.position,
		});

		return c.json(newPlayer, 201);
	} catch (error) {
		console.error("Error creating player:", error);
		if (error instanceof Error && error.message.includes("duplicate key")) {
			return c.json({ error: "Email already exists" }, 409);
		}
		return c.json({ error: "Failed to create player" }, 500);
	}
});

// Get player by ID
app.get("/api/players/:id", async (c) => {
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

// Update player
app.put("/api/players/:id", async (c) => {
	try {
		const id = parseInt(c.req.param("id"));
		if (Number.isNaN(id)) {
			return c.json({ error: "Invalid player ID" }, 400);
		}

		const body = await c.req.json();

		// Validate position if provided
		if (body.position) {
			const validPositions: Position[] = [
				"FORWARD",
				"WING",
				"CENTER",
				"FULL_BACK",
			];
			if (!validPositions.includes(body.position)) {
				return c.json(
					{
						error:
							"Invalid position. Must be one of: FORWARD, WING, CENTER, FULL_BACK",
					},
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

// Delete player
app.delete("/api/players/:id", async (c) => {
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

// Get players by position
app.get("/api/players/position/:position", async (c) => {
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

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
	console.error("Error:", err);
	return c.json({ error: "Internal Server Error" }, 500);
});

// Start server for development
if (import.meta.main) {
	const port = process.env.PORT || 3101;
	console.log(`🚀 Server starting on port ${port}`);

	Bun.serve({
		fetch: app.fetch,
		port: Number(port),
	});

	console.log(`✅ Server running at http://localhost:${port}`);
}

export default app;
