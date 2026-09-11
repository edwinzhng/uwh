import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const client = new ConvexHttpClient(url, { logger: false });
const result = await signInVerified(client, {
	provider: "password",
	params: {
		flow: "signUp",
		name: "Event configuration verification",
		email: `events-${crypto.randomUUID()}@example.test`,
		password: `${crypto.randomUUID()}Aa1!`,
	},
});
assert(result.tokens);
client.setAuth(result.tokens.token);
await client.mutation(api.club.create, {
	name: "Event configuration fixture",
	samples: true,
});
await client.mutation(api.club.apply, {
	action: {
		type: "settings",
		clubName: "Event configuration fixture",
		reminders: false,
		venues: ["Main Pool", "Training Pool"],
	},
});
const draft: EventDraft = {
	title: "Configured practice",
	date: "2027-01-07",
	start: "19:00",
	end: "21:00",
	venue: "Main Pool",
	program: "club",
	kind: "training",
	description: "",
	repeat: "weekly",
	repeatInterval: 2,
	repeatUntil: "2027-02-04",
	registrationOpen: { weeksBefore: 1, weekday: 1, time: "12:00" },
	registrationCloseHours: 2.5,
	parts: [
		{
			id: "warmup",
			title: "Warm up",
			kind: "training",
			start: "19:00",
			end: "19:15",
		},
		{
			id: "skills",
			title: "Skills",
			kind: "training",
			start: "19:15",
			end: "20:00",
		},
		{
			id: "game",
			title: "Hockey",
			kind: "hockey",
			start: "20:00",
			end: "21:00",
		},
	],
};
await client.mutation(api.club.apply, {
	action: { type: "create-event", id: "configured-practice", draft },
});
const current = await client.query(api.club.current, {});
assert(current);
assert.deepEqual(current.data.venues, ["Main Pool", "Training Pool"]);
const events = current.data.events.filter(
	(event) => event.title === draft.title,
);
assert.deepEqual(
	events.map((event) => event.date),
	["2027-01-07", "2027-01-21", "2027-02-04"],
);
assert(
	events.every(
		(event) => event.capacity === undefined && event.parts?.length === 3,
	),
);
assert.equal(events.at(0)?.opensAt, clubTimestamp("2026-12-28", "12:00"));
assert.equal(events.at(0)?.closesAt, clubTimestamp("2027-01-07", "16:30"));
console.log(
	"Event configuration passed: saved venues, three sections, unlimited capacity, custom cadence/end date, and registration timing.",
);
