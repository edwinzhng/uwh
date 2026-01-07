import { Hono } from "hono";
import type { NewPlayer, NewPractice, Position } from "../db/schema";
import { playerService } from "../lib/services/player.service";
import { practiceService } from "../lib/services/practice.service";
import { sportEasyService } from "../lib/services/sporteasy.service";

const app = new Hono();

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
				positions: ["FORWARD"] as Position[], // Default position (only used on insert)
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

// Get event attendees from SportEasy
app.get("/events/:eventId/attendees", async (c) => {
	try {
		const practiceId = Number.parseInt(c.req.param("eventId"));
		
		// First fetch the practice from our database to get the SportEasy ID
		const practice = await practiceService.getPracticeById(practiceId);
		if (!practice) {
			return c.json({ error: "Practice not found" }, 404);
		}
		
		if (!practice.sporteasyId) {
			return c.json({ error: "No SportEasy ID associated with this practice" }, 400);
		}
		
		// Now fetch attendees from SportEasy using the stored SportEasy ID
		const attendees = await sportEasyService.getEventAttendees(practice.sporteasyId);
		return c.json(attendees);
	} catch (error) {
		console.error("Error fetching SportEasy event attendees:", error);
		return c.json({ error: "Failed to fetch SportEasy event attendees" }, 500);
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

			// Helper function to check if event name starts with a day of the week
			const startsWithDayOfWeek = (name: string) => {
				const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
				return days.some(day => name.startsWith(day));
			};

			// Filter out events that start with days of the week
			const filteredEvents = dayEvents.filter(e => !startsWithDayOfWeek(e.name));
			
			// Collect filtered event names for display
			const filteredNames = filteredEvents.map((e) => e.name).join(" | ");
			
			// Collect ALL event names (including day-of-week ones) for reference
			const allEventNames = dayEvents.map((e) => e.name).join(" · ");

			// Build notes: filtered names (or primary event name) + middot + all event names
			let notes = null;
			let displayName = null;
			if (primaryEvent && !startsWithDayOfWeek(primaryEvent.name)) {
				displayName = primaryEvent.name;
			} else if (filteredNames) {
				displayName = filteredNames;
			}
			
			// Combine display name with all event names using middot
			if (displayName && allEventNames && displayName !== allEventNames) {
				notes = `${displayName} · ${allEventNames}`;
			} else if (allEventNames) {
				notes = allEventNames;
			} else if (displayName) {
				notes = displayName;
			}

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
