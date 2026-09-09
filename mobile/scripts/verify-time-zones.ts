import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import ICAL from "ical.js";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { calendarFeedUrl } from "../src/domain/calendar-links";
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
			name,
			email: `zone-${crypto.randomUUID()}@example.test`,
			password,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
try {
	const owner = await fixture("Zone admin");
	const clubId = await owner.mutation(api.club.create, {
		name: "Time zone verification",
		samples: true,
	});
	const player = await fixture("Zone member");
	await player.mutation(api.club.requestToJoin, { clubCode: clubId });
	const original = await owner.query(api.club.current, { screen: "settings" });
	assert(original);
	assert.equal(original.data.timeZone, "America/Edmonton");
	const request = original.requests.at(0);
	assert(request);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: [],
		coachPrograms: [],
		admin: false,
	});
	const settings = {
		type: "settings" as const,
		clubName: original.data.clubName,
		reminders: true,
	};
	await assert.rejects(
		player.mutation(api.club.apply, {
			action: { ...settings, timeZone: "America/New_York" },
		}),
	);
	for (const timeZone of ["", "Not/A_Time_Zone", "+05:00"])
		await assert.rejects(
			owner.mutation(api.club.apply, { action: { ...settings, timeZone } }),
		);
	await owner.mutation(api.club.apply, {
		action: { ...settings, timeZone: "America/New_York" },
	});
	assert.equal(
		(await owner.query(api.club.current, { screen: "settings" }))?.data
			.timeZone,
		"America/New_York",
	);
	const draft: EventDraft = {
		title: "Zone snapshot",
		date: "2027-03-15",
		start: "19:00",
		end: "20:00",
		venue: "Test pool",
		program: "club",
		kind: "hockey",
		capacity: 30,
		repeat: "once",
		description: "",
		seasonId: "2026-2027",
		timeZone: "Asia/Tokyo",
		signupOpens: "week",
		signupCloses: "hour",
		public: true,
	};
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: "zone-first", draft },
	});
	const firstId = "zone-first-0";
	const first = (
		await owner.query(api.club.current, { screen: "session", id: firstId })
	)?.data.events.find((event) => event.id === firstId);
	assert(first);
	assert.equal(first.timeZone, "America/New_York");
	const firstStart = Date.parse("2027-03-15T23:00:00Z");
	assert.equal(first.opensAt, firstStart - 7 * 86400000);
	assert.equal(first.closesAt, firstStart - 3600000);
	assert.equal(first.signup, "scheduled");
	const pagingArgs = {
		view: "upcoming" as const,
		date: "2027-03-15",
		season: "2026-2027",
		now: firstStart - 3600000,
	};
	const beforeZoneChange = await owner.query(api.pages.schedule, {
		...pagingArgs,
		paginationOpts: { cursor: null, numItems: 1 },
	});
	await owner.mutation(api.club.apply, {
		action: { ...settings, timeZone: "Pacific/Auckland" },
	});
	await owner.query(api.pages.schedule, {
		...pagingArgs,
		paginationOpts: { cursor: beforeZoneChange.continueCursor, numItems: 1 },
	});
	const unchanged = (
		await owner.query(api.club.current, { screen: "session", id: firstId })
	)?.data.events.find((event) => event.id === firstId);
	assert.deepEqual(unchanged, first);
	await owner.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId: firstId,
			scope: "single",
			draft: { ...draft, signupOpens: "now" },
		},
	});
	const edited = (
		await owner.query(api.club.current, { screen: "session", id: firstId })
	)?.data.events.find((event) => event.id === firstId);
	assert.equal(edited?.timeZone, "America/New_York");
	assert.equal(edited?.closesAt, firstStart - 3600000);
	await owner.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: firstId,
			personId: original.account.personId,
			response: "going",
		},
	});
	const feed = await owner.action(api.calendar_tokens.enable, {
		personId: original.account.personId,
		includeWaitlisted: false,
	});
	const calendarResponse = await fetch(
		calendarFeedUrl("http://127.0.0.1:3211", feed.token),
	);
	assert.equal(calendarResponse.status, 200);
	const calendarEvent = new ICAL.Component(
		ICAL.parse(await calendarResponse.text()),
	)
		.getAllSubcomponents("vevent")
		.find(
			(event) => event.getFirstPropertyValue("summary") === "Zone snapshot",
		);
	assert(calendarEvent);
	assert.equal(
		new ICAL.Event(calendarEvent).startDate.toJSDate().getTime(),
		firstStart,
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: "zone-second",
			draft: { ...draft, title: "Auckland practice" },
		},
	});
	const secondId = "zone-second-0";
	const second = (
		await owner.query(api.club.current, { screen: "session", id: secondId })
	)?.data.events.find((event) => event.id === secondId);
	assert.equal(second?.timeZone, "Pacific/Auckland");
	assert.equal(second?.closesAt, Date.parse("2027-03-15T06:00:00Z") - 3600000);
	const nearMidnight = await owner.query(api.pages.schedule, {
		view: "upcoming",
		date: "2027-03-16",
		season: "2026-2027",
		now: firstStart - 3600000,
		paginationOpts: { cursor: null, numItems: 40 },
	});
	assert(nearMidnight.page.some((entry) => entry.event.id === firstId));
	const past = await owner.query(api.pages.schedule, {
		view: "past",
		date: "2027-03-16",
		season: "2026-2027",
		now: firstStart + 2 * 3600000,
		paginationOpts: { cursor: null, numItems: 40 },
	});
	assert(past.page.some((entry) => entry.event.id === firstId));
	const slug = `zone-${crypto.randomUUID()}`;
	await owner.mutation(api.public_schedule.configure, { slug, enabled: true });
	assert.equal(
		(await owner.query(api.public_schedule.info, { slug }))?.timeZone,
		"Pacific/Auckland",
	);
	const publicRows = await owner.query(api.public_schedule.events, {
		slug,
		from: "2027-03-01",
		to: "2027-03-31",
		paginationOpts: { cursor: null, numItems: 50 },
	});
	assert.equal(
		publicRows.page.find((event) => event.id === firstId)?.timeZone,
		"America/New_York",
	);
	assert.equal(
		publicRows.page.find((event) => event.id === secondId)?.timeZone,
		"Pacific/Auckland",
	);
	console.log(
		"Time zones verified: admin-only settings, invalid zones rejected, persistence, server-enforced new-event snapshots, calendar instants, registration/push schedule timestamps, unchanged existing events and public zone labels.",
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
