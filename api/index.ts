import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import coachesRouter from "./routes/coaches";
import playersRouter from "./routes/players";
import practiceCoachesRouter from "./routes/practice-coaches";
import practicesRouter from "./routes/practices";
import sportEasyRouter from "./routes/sporteasy";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
	"*",
	cors({
		origin:
			process.env.NODE_ENV === "production"
				? ["https://uwh.vercel.app", "https://uwh-api.up.railway.app"]
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

// Mount routers
app.route("/api/players", playersRouter);
app.route("/api/coaches", coachesRouter);
app.route("/api/practices", practicesRouter);
app.route("/api/practice-coaches", practiceCoachesRouter);
app.route("/api/sporteasy", sportEasyRouter);

// 404 handler
app.notFound((c) => {
	return c.json({ error: "Not Found" }, 404);
});

// Error handler
app.onError((err, c) => {
	console.error("Error:", err);
	return c.json({ error: "Internal Server Error" }, 500);
});

// Export for Vercel serverless
export default app;
