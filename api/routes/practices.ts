import { Hono } from "hono";
import { practiceService } from "../lib/services/practice.service";

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

app.get("/past", async (c) => {
	try {
		const practices = await practiceService.getPastPractices();
		return c.json(practices);
	} catch (error) {
		console.error("Error fetching past practices:", error);
		return c.json({ error: "Failed to fetch past practices" }, 500);
	}
});

export default app;
