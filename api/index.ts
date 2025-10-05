import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

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

app.get("/api/users", (c) => {
	// Example users data
	const users = [
		{ id: 1, name: "John Doe", email: "john@example.com" },
		{ id: 2, name: "Jane Smith", email: "jane@example.com" },
	];
	return c.json(users);
});

app.post("/api/users", async (c) => {
	try {
		const body = await c.req.json();
		// In a real app, you'd save to a database
		const newUser = {
			id: Date.now(),
			...body,
			createdAt: new Date().toISOString(),
		};
		return c.json(newUser, 201);
	} catch {
		return c.json({ error: "Invalid JSON" }, 400);
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
