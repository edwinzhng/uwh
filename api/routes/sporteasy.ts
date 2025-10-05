import { Hono } from "hono";
import type { NewPlayer, NewPractice, Position } from "../db/schema";
import { playerService } from "../lib/services/player.service";
import { practiceService } from "../lib/services/practice.service";
import { sportEasyService } from "../lib/services/sporteasy.service";

const app = new Hono();

// Get all profiles from SportEasy
app.get("/profiles", async (c) => {
	try {
		const profiles = await sportEasyService.getProfiles();
		return c.json(profiles);
	} catch (error) {
		console.error("Error fetching SportEasy profiles:", error);
		return c.json({ error: "Failed to fetch SportEasy profiles" }, 500);
	}
});

// Get a specific profile by email
app.get("/profiles/:email", async (c) => {
	try {
		const email = c.req.param("email");
		const profile = await sportEasyService.getProfileByEmail(email);

		if (!profile) {
			return c.json({ error: "Profile not found" }, 404);
		}

		return c.json(profile);
	} catch (error) {
		console.error("Error fetching SportEasy profile:", error);
		return c.json({ error: "Failed to fetch SportEasy profile" }, 500);
	}
});

// Import players from SportEasy
app.post("/import", async (c) => {
	try {
		const profiles = await sportEasyService.getProfiles();
		const existingPlayers = await playerService.getPlayers();
		const existingSporteasyIds = new Set(
			existingPlayers.map((p) => p.sporteasyId).filter(Boolean),
		);

		const importResults = {
			total: profiles.length,
			imported: 0,
			updated: 0,
			skipped: 0,
			errors: [] as string[],
		};

		const toUpsert: NewPlayer[] = [];

		for (const profile of profiles) {
			const sportEasyId = profile.id;
			const email = profile.email;
			const fullName = `${profile.first_name} ${profile.last_name}`.trim();
			const parentEmail = profile.parents?.at(0)?.email ?? null;

			// Skip profiles without email or parent email
			if (!email && !parentEmail) {
				console.log(
					`Skipping profile ${profile.first_name} ${profile.last_name} because it has no email or parent email`,
				);
				importResults.skipped++;
				continue;
			}

			// Track whether this will be an insert or update
			if (existingSporteasyIds.has(sportEasyId)) {
				importResults.updated++;
			} else {
				importResults.imported++;
			}

			toUpsert.push({
				fullName,
				email: email,
				parentEmail: parentEmail,
				sporteasyId: sportEasyId,
				positions: ["FORWARD"] as const satisfies Position[], // Default position (only used on insert)
				rating: 5, // Default rating (only used on insert)
				youth: !!parentEmail, // Youth based on parent email (only used on insert)
			});
		}

		// Single upsert query for all players
		if (toUpsert.length > 0) {
			await playerService.batchUpsertPlayers(toUpsert);
		}

		return c.json(importResults, 200);
	} catch (error) {
		console.error("Error importing SportEasy profiles:", error);
		return c.json({ error: "Failed to import SportEasy profiles" }, 500);
	}
});

// Get all events from SportEasy
app.get("/events", async (c) => {
	try {
		const events = await sportEasyService.getEvents();
		return c.json(events);
	} catch (error) {
		console.error("Error fetching SportEasy events:", error);
		return c.json({ error: "Failed to fetch SportEasy events" }, 500);
	}
});

// Import events/practices from SportEasy
app.post("/import-events", async (c) => {
	try {
		const events = await sportEasyService.getEvents();
		// Fetch both future and past practices to properly check what exists
		const [futurePractices, pastPractices] = await Promise.all([
			practiceService.getPractices(),
			practiceService.getPastPractices(),
		]);
		const existingPractices = [...futurePractices, ...pastPractices];

		const importResults = {
			total: events.length,
			imported: 0,
			updated: 0,
			skipped: 0,
			errors: [] as string[],
		};

		// Filter events to only today onwards and not cancelled
		const nonCancelledEvents = events.filter((event) => {
			return !event.is_cancelled;
		});

		// Group events by date (YYYY-MM-DD)
		const eventsByDate = new Map<string, typeof nonCancelledEvents>();
		for (const event of nonCancelledEvents) {
			const eventDate = new Date(event.start_at);
			const dateKey = eventDate.toISOString().split("T")[0]; // YYYY-MM-DD

			if (!eventsByDate.has(dateKey)) {
				eventsByDate.set(dateKey, []);
			}
			eventsByDate.get(dateKey)?.push(event);
		}

		const toUpsert: NewPractice[] = [];
		const existingSporteasyIds = new Set(
			existingPractices.map((p) => p.sporteasyId).filter(Boolean),
		);

		// Process each date
		for (const [dateKey, dayEvents] of Array.from(eventsByDate.entries())) {
			// Find if we already have a practice for this date
			const practiceDate = new Date(dateKey);
			const existingPractice = existingPractices.find((p) => {
				const pDate = new Date(p.date);
				return pDate.toISOString().split("T")[0] === dateKey;
			});

			// Find primary event (one that ends with "Outdoor Practice" or "Hockey")
			const primaryEvent = dayEvents.find(
				(e) => e.name.endsWith("Outdoor Practice") || e.name.endsWith("Hockey"),
			);

			// Use primary event's ID if available, otherwise existing practice's ID, otherwise first event's ID
			const sporteasyId =
				primaryEvent?.id || existingPractice?.sporteasyId || dayEvents[0].id;

			// Collect all event names for notes
			const eventNames = dayEvents.map((e) => e.name).join(" | ");

			// Use primary event name if available, otherwise combined names
			const notes = primaryEvent?.name || eventNames;

			// Track whether this will be an insert or update based on sporteasyId
			if (existingSporteasyIds.has(sporteasyId)) {
				importResults.updated++;
			} else {
				importResults.imported++;
			}

			toUpsert.push({
				sporteasyId,
				date: practiceDate,
				notes,
			});
		}

		importResults.skipped = importResults.total - nonCancelledEvents.length;

		// Single upsert query for all practices
		if (toUpsert.length > 0) {
			await practiceService.batchUpsertPractices(toUpsert);
		}

		return c.json(importResults, 200);
	} catch (error) {
		console.error("Error importing SportEasy events:", error);
		return c.json({ error: "Failed to import SportEasy events" }, 500);
	}
});

export default app;
