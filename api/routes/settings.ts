import { Hono } from "hono";
import { settingsService } from "../lib/services/settings.service";

const app = new Hono();

// Get a setting by key
app.get("/:key", async (c) => {
	const key = c.req.param("key");

	try {
		const setting = await settingsService.getSettingByKey(key);

		if (!setting) {
			return c.json({ error: "Setting not found" }, 404);
		}

		return c.json(setting);
	} catch (error) {
		console.error("Failed to get setting:", error);
		return c.json({ error: "Failed to get setting" }, 500);
	}
});

// Create or update a setting
app.put("/:key", async (c) => {
	const key = c.req.param("key");
	const body = await c.req.json();

	if (!body.value) {
		return c.json({ error: "Value is required" }, 400);
	}

	try {
		const setting = await settingsService.upsertSetting(key, body.value);

		return c.json(setting);
	} catch (error) {
		console.error("Failed to save setting:", error);
		return c.json({ error: "Failed to save setting" }, 500);
	}
});

export default app;
