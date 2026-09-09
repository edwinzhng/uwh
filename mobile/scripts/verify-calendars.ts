import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import ICAL from "ical.js";
import { api } from "../convex/_generated/api";
import { calendarFeedUrl } from "../src/domain/calendar-links";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210")
	throw new Error("Use the isolated local backend only.");
const runId = crypto.randomUUID();
const signUp = async (name: string): Promise<ConvexHttpClient> => {
	const client = new ConvexHttpClient(url, { logger: false });
	const result = await signInVerified(client, {
		provider: "password",
		params: {
			flow: "signUp",
			name,
			email: `calendar-${name}-${runId}@example.test`,
			password: `${crypto.randomUUID()}Aa1!`,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	return client;
};
const owner = await signUp("owner");
const clubId = await owner.mutation(api.club.create, {
	name: `Calendar ${runId.slice(0, 8)}`,
	samples: true,
});
const parent = await signUp("parent");
await parent.mutation(api.club.requestToJoin, { clubCode: clubId });
const initial = await owner.query(api.club.current, {});
assert(initial);
const request = initial.requests.at(0);
assert(request);
await owner.mutation(api.club.approveRequest, {
	requestId: request.id,
	personId: "jamie",
	children: ["sam", "mila"],
	coachPrograms: [],
	admin: false,
});
const family = await parent.query(api.club.current, {});
assert(family);
const snapshot = await parent.query(api.calendar.householdSnapshot, {
	personIds: ["sam", "mila"],
});
const exported = new ICAL.Component(ICAL.parse(snapshot)).getAllSubcomponents(
	"vevent",
);
assert(
	exported.length > 0,
	"Household export includes saved RSVPs without loading schedule pages",
);
assert(
	exported.some((event) =>
		String(event.getFirstPropertyValue("summary")).includes("Sam"),
	),
);
assert(
	exported.some((event) =>
		String(event.getFirstPropertyValue("summary")).includes("Mila"),
	),
);
await assert.rejects(
	parent.query(api.calendar.householdSnapshot, { personIds: ["alex"] }),
);
await assert.rejects(
	parent.query(api.calendar.householdSnapshot, { personIds: [] }),
);
const stranger = await signUp("stranger");
await stranger.mutation(api.club.create, {
	name: "Different club",
	samples: true,
});
await assert.rejects(
	parent.action(api.calendar_tokens.enable, {
		personId: "alex",
		includeWaitlisted: false,
	}),
);
await assert.rejects(
	owner.action(api.calendar_tokens.enable, {
		personId: "taylor",
		includeWaitlisted: false,
	}),
);
const sam = await parent.action(api.calendar_tokens.enable, {
	personId: "sam",
	includeWaitlisted: false,
});
const mila = await parent.action(api.calendar_tokens.enable, {
	personId: "mila",
	includeWaitlisted: false,
});
assert.match(sam.token, /^[a-f0-9]{64}$/);
assert.notEqual(sam.token, mila.token);
assert.equal(
	(
		await parent.action(api.calendar_tokens.enable, {
			personId: "sam",
			includeWaitlisted: false,
		})
	).token,
	sam.token,
);
assert.deepEqual(await stranger.query(api.calendar.list, {}), []);
assert.equal(
	(await owner.query(api.calendar.list, {})).some(
		(feed) => feed.token === sam.token,
	),
	false,
);
const get = (token: string): Promise<Response> =>
	fetch(calendarFeedUrl("http://127.0.0.1:3211", token));
const parse = (text: string): ICAL.Component[] =>
	new ICAL.Component(ICAL.parse(text)).getAllSubcomponents("vevent");
const active = (text: string): ICAL.Component[] =>
	parse(text).filter(
		(event) => event.getFirstPropertyValue("status") !== "CANCELLED",
	);
const firstResponse = await get(sam.token);
assert.equal(firstResponse.status, 200);
assert.match(firstResponse.headers.get("content-type") ?? "", /text\/calendar/);
assert.equal(firstResponse.headers.get("cache-control"), "no-store");
const before = await firstResponse.text();
assert.equal(await (await get(sam.token)).text(), before);
assert.equal(before.includes("rating"), false);
assert.equal(before.includes("BEGIN:VALARM"), false);
const milaBefore = await (await get(mila.token)).text();
await parent.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: "youth-thu",
		personId: "sam",
		response: "unavailable",
	},
});
const withdrawn = await (await get(sam.token)).text();
assert.equal(active(withdrawn).length, active(before).length - 1);
const cancellation = parse(withdrawn).find(
	(event) => event.getFirstPropertyValue("status") === "CANCELLED",
);
assert(cancellation);
assert.equal(cancellation.getFirstPropertyValue("sequence"), 1);
assert.equal(await (await get(mila.token)).text(), milaBefore);
await parent.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: "youth-thu",
		personId: "sam",
		response: "going",
	},
});
const rejoined = parse(await (await get(sam.token)).text()).find(
	(event) =>
		event.getFirstPropertyValue("uid") ===
		cancellation.getFirstPropertyValue("uid"),
);
assert.equal(rejoined?.getFirstPropertyValue("sequence"), 2);
assert.equal(rejoined?.getFirstPropertyValue("status"), "CONFIRMED");
await owner.mutation(api.club.apply, {
	action: {
		type: "create-event",
		id: "calendar-capacity",
		draft: {
			title: "Calendar capacity",
			date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
			start: "19:00",
			end: "20:00",
			venue: "Test pool",
			program: "club",
			kind: "training",
			capacity: 1,
			repeat: "once",
			description: "",
		},
	},
});
const capacityEvent = (
	await owner.query(api.club.current, {})
)?.data.events.find((event) => event.title === "Calendar capacity");
assert(capacityEvent);
await owner.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: capacityEvent.id,
		personId: initial.account.personId,
		response: "going",
	},
});
await parent.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: capacityEvent.id,
		personId: "sam",
		response: "going",
	},
});
assert.equal(
	parse(await (await get(sam.token)).text()).some((event) =>
		String(event.getFirstPropertyValue("summary")).includes(
			"Calendar capacity",
		),
	),
	false,
);
await parent.mutation(api.calendar.preferences, {
	personId: "sam",
	includeWaitlisted: true,
});
const waitlisted = parse(await (await get(sam.token)).text()).find(
	(event) =>
		event.getFirstPropertyValue("summary") === "Waitlisted · Calendar capacity",
);
assert.equal(waitlisted?.getFirstPropertyValue("status"), "TENTATIVE");
assert.equal(waitlisted?.getFirstPropertyValue("transp"), "TRANSPARENT");
await owner.mutation(api.club.apply, {
	action: {
		type: "respond",
		eventId: capacityEvent.id,
		personId: initial.account.personId,
		response: "unavailable",
	},
});
const promoted = parse(await (await get(sam.token)).text()).find(
	(event) => event.getFirstPropertyValue("summary") === "Calendar capacity",
);
assert.equal(
	promoted?.getFirstPropertyValue("uid"),
	waitlisted?.getFirstPropertyValue("uid"),
);
assert.equal(promoted?.getFirstPropertyValue("status"), "CONFIRMED");
assert.equal(promoted?.getFirstPropertyValue("sequence"), 1);
await owner.mutation(api.club.apply, {
	action: { type: "cancel-event", eventId: "youth-thu" },
});
const cancelledEvent = parse(await (await get(mila.token)).text()).find(
	(event) => event.getFirstPropertyValue("summary") === "Youth training",
);
assert.equal(cancelledEvent?.getFirstPropertyValue("status"), "CANCELLED");
const rotated = await parent.action(api.calendar_tokens.enable, {
	personId: "sam",
	includeWaitlisted: false,
	rotate: true,
});
assert.notEqual(rotated.token, sam.token);
assert.equal((await get(sam.token)).status, 404);
assert.equal((await get(rotated.token)).status, 200);
await parent.mutation(api.calendar.preferences, {
	personId: "sam",
	includeWaitlisted: true,
});
assert.equal(
	(await parent.query(api.calendar.list, {})).find(
		(feed) => feed.personId === "sam",
	)?.includeWaitlisted,
	true,
);
await owner.mutation(api.club.setAccess, {
	accountId: family.account.id,
	children: ["sam"],
	coachPrograms: [],
	admin: false,
});
assert.equal((await get(mila.token)).status, 404);
assert.equal(
	(await parent.query(api.calendar.list, {})).some(
		(feed) => feed.personId === "mila",
	),
	false,
);
await assert.rejects(
	parent.action(api.calendar_tokens.enable, {
		personId: "mila",
		includeWaitlisted: false,
		rotate: true,
	}),
);
await parent.mutation(api.calendar.disable, { personId: "sam" });
assert.equal((await get(rotated.token)).status, 404);
assert.equal((await get("invalid")).status, 404);
assert.equal((await get("f".repeat(64))).status, 404);
console.log(
	"Live calendars passed: private per-person feeds, stable output/UIDs, withdrawal, rejoining, waitlist promotion, event cancellation, family isolation, ownership, rotation, revocation and disabling.",
);
