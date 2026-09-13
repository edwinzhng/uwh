import assert from "node:assert/strict";
import { Temporal } from "@js-temporal/polyfill";
import { ConvexHttpClient } from "convex/browser";
import ICAL from "ical.js";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { calendarFeedUrl } from "../src/domain/calendar-links";
import { clubDate, clubTimestamp } from "../src/domain/event-time";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const fixtures: { client: ConvexHttpClient; password: string }[] = [];
const fixture = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const password = `${crypto.randomUUID()}Aa1!`;
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			email: `tournament-${crypto.randomUUID()}@example.test`,
			password,
			name,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
const start = Temporal.PlainDate.from(clubDate()).add({ days: 30 });
const draft: EventDraft = {
	timeZone: "America/Vancouver",
	title: "Tournament verification",
	date: start.toString(),
	endDate: start.add({ days: 4 }).toString(),
	responseDeadline: start.subtract({ days: 7 }).toString(),
	start: "18:00",
	end: "15:00",
	venue: "Fictional tournament pool",
	program: "club",
	kind: "tournament",
	repeat: "once",
	description: "Test travel details",
};
const eventId = "tournament-check-0";
const paginationOpts = { cursor: null, numItems: 40 };
try {
	const owner = await fixture("Tournament organizer");
	const clubId = await owner.mutation(api.club.create, {
		name: "Tournament verification",
		samples: true,
	});
	const player = await fixture("Tournament player parent");
	await player.mutation(api.club.requestToJoin, { clubCode: clubId });
	const pending = await owner.query(api.club.current, { screen: "settings" });
	const request = pending?.requests.at(0);
	assert(request);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: ["sam", "mila"],
		coachPrograms: [],
		admin: false,
	});
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: "tournament-check", draft },
	});
	for (const personId of ["sam", "mila"])
		await player.mutation(api.club.apply, {
			action: { type: "respond", eventId, personId, response: "going" },
		});
	const now = clubTimestamp(start.add({ days: 3 }).toString(), "12:00");
	const ongoing = await player.query(api.pages.schedule, {
		view: "upcoming",
		period: "upcoming",
		date: draft.date,
		season: "all",
		now,
		paginationOpts,
	});
	const tournament = ongoing.page.find((entry) => entry.event.id === eventId);
	assert(tournament, "Ongoing tournament missing");
	assert.equal(tournament.event.endDate, draft.endDate);
	assert.equal(tournament.event.timeZone, "America/Vancouver");
	assert.equal(tournament.event.tournamentRoster, undefined);
	assert.equal(
		tournament.responses.filter((response) => response.response === "going")
			.length,
		2,
	);
	assert(
		!tournament.responses.some((response) => response.response === "waiting"),
	);
	for (const offset of [0, 1, 2, 3, 4]) {
		const date = start.add({ days: offset }).toString();
		const day = await player.query(api.pages.schedule, {
			view: "calendar",
			date,
			season: "all",
			now: Date.now(),
			paginationOpts,
		});
		assert(
			day.page.some((entry) => entry.event.id === eventId),
			`Missing on ${date}`,
		);
	}
	const counts = await player.query(api.pages.calendar, {
		from: draft.date,
		to: draft.endDate ?? draft.date,
		season: "all",
	});
	assert((counts[draft.endDate ?? draft.date] ?? 0) >= 1);
	const assignedDraft: EventDraft = {
		...draft,
		tournamentRoster: [{ personId: "sam", team: "Crocs A" }],
	};
	await assert.rejects(
		player.mutation(api.club.apply, {
			action: {
				type: "edit-event",
				eventId,
				scope: "single",
				draft: assignedDraft,
			},
		}),
	);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				type: "edit-event",
				eventId,
				scope: "single",
				draft: {
					...draft,
					tournamentRoster: [{ personId: "foreign", team: "A" }],
				},
			},
		}),
	);
	const feed = await player.action(api.calendar_tokens.enable, {
		personId: "sam",
		includeWaitlisted: false,
	});
	const calendarEvent = async (): Promise<ICAL.Component> => {
		const response = await fetch(
			calendarFeedUrl("http://127.0.0.1:3211", feed.token),
		);
		assert.equal(response.status, 200);
		const entry = new ICAL.Component(ICAL.parse(await response.text()))
			.getAllSubcomponents("vevent")
			.find((entry) => entry.getFirstPropertyValue("summary") === draft.title);
		assert(entry);
		return entry;
	};
	assert.equal(
		(await calendarEvent()).getFirstPropertyValue("status"),
		"TENTATIVE",
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId,
			scope: "single",
			draft: assignedDraft,
		},
	});
	const confirmed = await calendarEvent();
	assert.equal(confirmed.getFirstPropertyValue("status"), "CONFIRMED");
	assert.match(
		String(confirmed.getFirstPropertyValue("description")),
		/Team: Crocs A/,
	);
	const ending = confirmed.getFirstPropertyValue("dtend");
	assert(ending instanceof ICAL.Time);
	assert.equal(
		ending.toJSDate().getTime(),
		clubTimestamp(draft.endDate ?? draft.date, draft.end, draft.timeZone),
	);
	const after = await player.query(api.pages.schedule, {
		view: "past",
		period: "past",
		date: draft.date,
		season: "all",
		now: clubTimestamp(start.add({ days: 5 }).toString(), "12:00"),
		paginationOpts,
	});
	assert(after.page.some((entry) => entry.event.id === eventId));
	console.log(
		"Tournament live verification passed: multi-day creation, household availability without waitlisting, all calendar days, ongoing/past schedule, protected independent roster, tentative-to-confirmed calendar feed.",
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
