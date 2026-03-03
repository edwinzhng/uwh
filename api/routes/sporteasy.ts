import { Hono } from "hono";
import type { NewPlayer, NewPractice, Position } from "../db/schema";
import { playerService } from "../lib/services/player.service";
import { practiceService } from "../lib/services/practice.service";
import { sportEasyService } from "../lib/services/sporteasy.service";
import { teamGeneratorService } from "../lib/services/team-generator.service";

const app = new Hono();

// Test SportEasy connection
app.get("/test", async (c) => {
	try {
		await sportEasyService.getProfiles();
		return c.json({ ok: true }, 200);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Connection failed";
		return c.json({ ok: false, error: message }, 200);
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
			return c.json(
				{ error: "No SportEasy ID associated with this practice" },
				400,
			);
		}

		// Now fetch attendees from SportEasy using the stored SportEasy ID
		const attendees = await sportEasyService.getEventAttendees(
			practice.sporteasyId,
		);
		return c.json(attendees);
	} catch (error) {
		console.error("Error fetching SportEasy event attendees:", error);
		return c.json({ error: "Failed to fetch SportEasy event attendees" }, 500);
	}
});

// Generate balanced teams for an event's attendees
app.get("/events/:eventId/teams", async (c) => {
	try {
		const practiceId = Number.parseInt(c.req.param("eventId"));

		// Fetch the practice to get the SportEasy ID
		const practice = await practiceService.getPracticeById(practiceId);
		if (!practice) {
			return c.json({ error: "Practice not found" }, 404);
		}

		if (!practice.sporteasyId) {
			return c.json(
				{ error: "No SportEasy ID associated with this practice" },
				400,
			);
		}

		// Fetch attendees from SportEasy
		const eventResponse = await sportEasyService.getEventAttendees(
			practice.sporteasyId,
		);

		// Find present players by matching SportEasy IDs
		const presentSportEasyIds = new Set<number>();
		for (const attendee of eventResponse.attendees) {
			if (attendee.attendance_status === "present") {
				for (const result of attendee.results) {
					presentSportEasyIds.add(result.profile.id);
				}
			}
		}

		// Get all players and filter by presence and exclusions
		const excludeParam = c.req.query("exclude");
		const excludedIds = new Set(
			excludeParam ? excludeParam.split(",").map(Number) : [],
		);

		const combineYouthParam = c.req.query("combineYouth");
		const combineYouth = combineYouthParam === "true";

		const allPlayers = await playerService.getPlayers();
		const presentPlayers = allPlayers.filter(
			(player) =>
				player.sporteasyId &&
				presentSportEasyIds.has(player.sporteasyId) &&
				!excludedIds.has(player.id),
		);

		let adultTeams: ReturnType<typeof teamGeneratorService.generateTeams>;
		let youthTeams: ReturnType<typeof teamGeneratorService.generateTeams>;

		if (combineYouth) {
			// Generate the teams using backend logic, all players combined
			adultTeams = teamGeneratorService.generateTeams(presentPlayers);
			youthTeams = { blackTeam: [], whiteTeam: [] };
		} else {
			const adults = presentPlayers.filter((p) => !p.youth);
			const youth = presentPlayers.filter((p) => p.youth);

			// Generate the teams using backend logic
			adultTeams = teamGeneratorService.generateTeams(adults);
			youthTeams = teamGeneratorService.generateTeams(youth);
		}

		return c.json({
			adults: adultTeams,
			youth: youthTeams,
			presentPlayers,
		});
	} catch (error) {
		console.error("Error generating teams for SportEasy event:", error);
		return c.json({ error: "Failed to generate teams" }, 500);
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
			// Find primary event (one that matches practice keywords)
			const primaryEvent = dayEvents.find((e) =>
				practiceService.isPracticeEvent(e.name),
			);

			// Find if we already have a practice for this date
			// Use the actual event start_at instead of dateKey to preserve the exact time
			const practiceDate = new Date(
				primaryEvent?.start_at || dayEvents[0].start_at,
			);
			const existingPractice = existingPractices.find((p) => {
				const pDate = new Date(p.date);
				return pDate.toISOString().split("T")[0] === dateKey;
			});

			// Use primary event's ID if available, otherwise existing practice's ID, otherwise first event's ID
			const sporteasyId =
				primaryEvent?.id || existingPractice?.sporteasyId || dayEvents[0].id;

			// Helper function to check if event name starts with a day of the week
			const startsWithDayOfWeek = (name: string) => {
				const days = [
					"Monday",
					"Tuesday",
					"Wednesday",
					"Thursday",
					"Friday",
					"Saturday",
					"Sunday",
				];
				return days.some((day) => name.startsWith(day));
			};

			// Filter out events that start with days of the week
			const filteredEvents = dayEvents.filter(
				(e) => !startsWithDayOfWeek(e.name),
			);

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

// Generate teams from a list of player IDs
app.post("/generate-teams", async (c) => {
	try {
		const { playerIds } = (await c.req.json()) as { playerIds: number[] };
		if (!playerIds || !Array.isArray(playerIds)) {
			return c.json({ error: "playerIds must be an array of numbers" }, 400);
		}

		const allPlayers = await playerService.getPlayers();
		const eligiblePlayers = allPlayers.filter((p) => playerIds.includes(p.id));

		const adults = eligiblePlayers.filter((p) => !p.youth);
		const youth = eligiblePlayers.filter((p) => p.youth);

		const adultTeams = teamGeneratorService.generateTeams(adults);
		const youthTeams = teamGeneratorService.generateTeams(youth);

		return c.json({
			adults: adultTeams,
			youth: youthTeams,
		});
	} catch (error) {
		console.error("Error generating local teams:", error);
		return c.json({ error: "Failed to generate local teams" }, 500);
	}
});

export default app;
