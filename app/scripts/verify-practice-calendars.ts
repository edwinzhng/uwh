import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import ICAL from "ical.js";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { calendarFeedUrl } from "../src/domain/calendar-links";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const client = new ConvexHttpClient(url, { logger: false });
const password = `${crypto.randomUUID()}Aa1!`;
const signedIn = await signInVerified(client, {
	provider: "password",
	params: {
		flow: "signUp",
		name: "Practice parts verification",
		email: `practice-parts-${crypto.randomUUID()}@example.test`,
		password,
	},
});
assert(signedIn.tokens);
client.setAuth(signedIn.tokens.token);
try {
	await client.mutation(api.club.create, {
		name: "Practice parts test",
		samples: true,
	});
	const workspace = await client.query(api.club.current, {
		screen: "settings",
	});
	assert(workspace);
	const coachId = workspace.account.id;
	const personId = workspace.account.personId;
	const draft: EventDraft = {
		title: "Combined practice",
		date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
		start: "19:00",
		end: "20:30",
		venue: "Test pool",
		program: "club",
		kind: "training",
		capacity: 30,
		repeat: "once",
		description: "Bring kit",
		seasonId: "2026-2027",
		parts: [
			{
				id: "training",
				title: "Training",
				kind: "training",
				start: "19:00",
				end: "19:45",
			},
			{
				id: "hockey",
				title: "Hockey",
				kind: "hockey",
				start: "19:45",
				end: "20:30",
			},
		],
	};
	await client.mutation(api.club.apply, {
		action: { type: "create-event", id: "combined-check", draft },
	});
	const eventId = "combined-check-0";
	await client.mutation(api.club.apply, {
		action: { type: "respond", eventId, personId, response: "going" },
	});
	const feed = await client.action(api.calendar_tokens.enable, {
		personId,
		includeWaitlisted: false,
	});
	const read = async (): Promise<ICAL.Component> => {
		const response = await fetch(
			calendarFeedUrl("http://127.0.0.1:3211", feed.token),
		);
		assert.equal(response.status, 200);
		const events = new ICAL.Component(ICAL.parse(await response.text()))
			.getAllSubcomponents("vevent")
			.filter(
				(event) =>
					event.getFirstPropertyValue("summary") === "Combined practice",
			);
		assert.equal(events.length, 1);
		const event = events.at(0);
		assert(event);
		return event;
	};
	const both = await read();
	assert.match(
		String(both.getFirstPropertyValue("description")),
		/Training: 19:00–19:45/,
	);
	await client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId,
			personId,
			response: "going",
			partIds: ["hockey"],
		},
	});
	const hockey = await read();
	assert.equal(
		hockey.getFirstPropertyValue("uid"),
		both.getFirstPropertyValue("uid"),
	);
	assert.equal(hockey.getFirstPropertyValue("sequence"), 1);
	assert.equal(
		new ICAL.Event(hockey).startDate.toJSDate().getTime() -
			new ICAL.Event(both).startDate.toJSDate().getTime(),
		45 * 60000,
	);
	assert.doesNotMatch(
		String(hockey.getFirstPropertyValue("description")),
		/Training:/,
	);
	await client.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: true,
		partId: "hockey",
	});
	assert.equal(
		(await client.query(api.coaching_hours.eventCoaches, { eventId })).at(0)
			?.durationMinutes,
		45,
	);
	await client.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: true,
		partId: "training",
	});
	assert.equal(
		(await client.query(api.coaching_hours.eventCoaches, { eventId })).at(0)
			?.durationMinutes,
		90,
	);
	assert.equal(
		(
			await client.query(api.coaching_hours.eventCoaches, {
				eventId,
				partId: "training",
			})
		).at(0)?.durationMinutes,
		45,
	);
	await client.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: false,
		partId: "training",
	});
	assert.equal(
		(await client.query(api.coaching_hours.eventCoaches, { eventId })).at(0)
			?.durationMinutes,
		45,
	);
	assert.equal(
		(
			await client.query(api.coaching_hours.eventCoaches, {
				eventId,
				partId: "training",
			})
		).length,
		0,
	);
	await assert.rejects(
		client.mutation(api.coaching_hours.setCoach, {
			eventId,
			coachId,
			assigned: true,
			partId: "missing",
		}),
	);
	await assert.rejects(
		client.mutation(api.coaching_hours.setCoach, {
			eventId,
			coachId,
			assigned: true,
			durationMinutes: 180,
		}),
	);
	await client.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId,
			scope: "single",
			draft: {
				...draft,
				end: "21:00",
				parts: draft.parts?.map((part) =>
					part.id === "hockey" ? { ...part, end: "21:00" } : part,
				),
			},
		},
	});
	assert.equal(
		(await client.query(api.coaching_hours.eventCoaches, { eventId })).at(0)
			?.durationMinutes,
		75,
	);
	const extended = await read();
	assert.equal(extended.getFirstPropertyValue("sequence"), 2);
	assert.equal(
		extended.getFirstPropertyValue("uid"),
		both.getFirstPropertyValue("uid"),
	);
	console.log(
		"Practice parts live checks passed: one calendar UID, RSVP time revisions, partial coach assignment/removal, dynamic duration updates and invalid part/override rejection.",
	);
} finally {
	await client.action(api.account_actions.deleteAccount, { password });
}
