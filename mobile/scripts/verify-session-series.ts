import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { signInVerified } from "./test-auth";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const client = new ConvexHttpClient(url, { logger: false });
const password = `${crypto.randomUUID()}Aa1!`;
const result = await signInVerified(client, {
	provider: "password",
	params: {
		flow: "signUp",
		name: "Series verification",
		email: `series-${crypto.randomUUID()}@example.test`,
		password,
	},
});
assert(result.tokens);
client.setAuth(result.tokens.token);
try {
	const clubId = await client.mutation(api.club.create, {
		name: "Session series fixture",
		samples: true,
	});
	const draft: EventDraft = {
		title: "Committed Mondays",
		date: "2027-01-04",
		start: "19:00",
		end: "20:00",
		venue: "Main Pool",
		program: "club",
		kind: "hockey",
		description: "",
		repeat: "weekly",
		occurrences: 4,
		capacity: 1,
		committedRoster: true,
		seriesWaitlist: true,
	};
	await client.mutation(api.club.apply, {
		action: { type: "create-event", id: "mondays", draft },
	});
	assert.equal((await client.query(api.session_series.list, {})).length, 1);
	await Promise.all(
		["alex", "sam"].map((personId) =>
			client.mutation(api.session_series.enroll, {
				seriesId: "mondays",
				personId,
				start: draft.date,
			}),
		),
	);
	const initial = await client.query(api.session_series.detail, {
		seriesId: "mondays",
	});
	const committed = initial.series.enrollments.find(
		(entry) => entry.state === "committed",
	);
	const waiting = initial.series.enrollments.find(
		(entry) => entry.state === "waiting",
	);
	assert(committed);
	assert(waiting);
	assert.equal(
		initial.series.enrollments.filter((entry) => entry.state === "committed")
			.length,
		1,
	);
	const first = initial.events.at(0);
	const second = initial.events.at(1);
	assert(first);
	assert(second);
	await client.mutation(api.session_series.absence, {
		eventId: first.id,
		personId: committed.personId,
		unavailable: true,
	});
	await assert.rejects(
		client.mutation(api.session_series.enroll, {
			seriesId: "mondays",
			personId: waiting.personId,
			start: draft.date,
			promote: true,
		}),
	);
	await client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: first.id,
			personId: "mila",
			response: "going",
		},
	});
	const guestBlocked = await client.query(api.club.current, {});
	assert.equal(
		guestBlocked?.data.responses.find(
			(entry) => entry.eventId === first.id && entry.personId === "mila",
		)?.response,
		"waiting",
	);
	await client.mutation(api.session_series.absence, {
		eventId: first.id,
		personId: committed.personId,
		unavailable: false,
	});
	const state = await client.query(api.club.current, {});
	assert.equal(
		state?.data.responses.find(
			(entry) =>
				entry.eventId === first.id && entry.personId === committed.personId,
		)?.response,
		"going",
	);
	assert.equal(
		state?.data.responses.find(
			(entry) =>
				entry.eventId === first.id && entry.personId === committed.personId,
		)?.attendance,
		"unmarked",
	);
	await client.mutation(api.session_series.end, {
		seriesId: "mondays",
		personId: committed.personId,
		date: second.date,
	});
	const ended = await client.query(api.club.current, {});
	assert.equal(
		ended?.data.responses.find(
			(entry) =>
				entry.eventId === first.id && entry.personId === committed.personId,
		)?.seriesExpected,
		true,
	);
	assert.equal(
		ended?.data.responses.find(
			(entry) =>
				entry.eventId === second.id && entry.personId === committed.personId,
		)?.seriesExpected,
		undefined,
	);
	await client.mutation(api.session_series.enroll, {
		seriesId: "mondays",
		personId: waiting.personId,
		start: second.date,
		promote: true,
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId: second.id,
			scope: "following",
			editId: "series-test-edit",
			draft: { ...draft, date: second.date, occurrences: 5, rebuild: true },
		},
	});
	const edited = await client.query(api.session_series.detail, {
		seriesId: "mondays",
	});
	assert.equal(edited.events.filter((event) => !event.cancelled).length, 6);
	const latest = edited.events.at(-1);
	assert(latest);
	const final = await client.query(api.club.current, {});
	assert.equal(
		final?.data.responses.find(
			(entry) =>
				entry.eventId === latest.id && entry.personId === waiting.personId,
		)?.seriesExpected,
		true,
	);
	await assert.rejects(
		new ConvexHttpClient(url, { logger: false }).query(
			api.session_series.list,
			{},
		),
	);
	console.log(
		"Session series passed: atomic roster creation, concurrent capacity/waitlist, absence preserves term place, restoration, effective end/join, following recurrence expansion and unauthenticated access.",
	);

	await client.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId: first.id,
			scope: "single",
			draft: { ...draft, repeat: "once", capacity: 2 },
		},
	});
	await client.mutation(api.club.apply, {
		action: {
			type: "respond",
			eventId: first.id,
			personId: "mila",
			response: "going",
		},
	});
	const guest = await client.query(api.club.current, {});
	assert.equal(
		guest?.data.responses.find(
			(entry) => entry.eventId === first.id && entry.personId === "mila",
		)?.response,
		"going",
	);
	assert.equal(
		(
			await client.query(api.session_series.detail, { seriesId: "mondays" })
		).series.enrollments.some((entry) => entry.personId === "mila"),
		false,
	);
	await client.mutation(api.session_series.enroll, {
		seriesId: "mondays",
		personId: "taylor",
		start: latest.date,
		invite: true,
	});
	assert.equal(
		(
			await client.query(api.session_series.detail, { seriesId: "mondays" })
		).series.enrollments.find((entry) => entry.personId === "taylor")?.state,
		"invited",
	);
	console.log(
		"Guest verification passed: reserved absence cannot be consumed; guest can use extra event capacity without a term enrollment; invitations recorded separately.",
	);
	await client.mutation(api.session_series.guest, {
		eventId: first.id,
		personId: "mila",
		attending: false,
	});
	await client.mutation(api.session_series.guest, {
		eventId: first.id,
		personId: "taylor",
		attending: true,
	});
	const withGuest = await client.query(api.club.current, {});
	assert.equal(
		withGuest?.data.responses.find(
			(entry) => entry.eventId === first.id && entry.personId === "taylor",
		)?.response,
		"going",
	);
	assert.equal(
		(
			await client.query(api.session_series.detail, { seriesId: "mondays" })
		).series.enrollments.find((entry) => entry.personId === "taylor")?.state,
		"invited",
	);
	await assert.rejects(
		client.mutation(api.session_series.guest, {
			eventId: first.id,
			personId: "mila",
			attending: true,
		}),
	);
	await client.mutation(api.session_series.guest, {
		eventId: first.id,
		personId: "taylor",
		attending: false,
	});
	assert.equal(
		(await client.query(api.club.current, {}))?.data.responses.find(
			(entry) => entry.eventId === first.id && entry.personId === "taylor",
		)?.response,
		"unavailable",
	);
	const memberClient = new ConvexHttpClient(url, { logger: false });
	const memberPassword = `${crypto.randomUUID()}Aa1!`;
	const memberAuth = await signInVerified(memberClient, {
		provider: "password",
		params: {
			flow: "signUp",
			name: "Series player",
			email: `series-member-${crypto.randomUUID()}@example.test`,
			password: memberPassword,
		},
	});
	assert(memberAuth.tokens);
	memberClient.setAuth(memberAuth.tokens.token);
	try {
		await memberClient.mutation(api.club.requestToJoin, { clubCode: clubId });
		const request = (
			await client.query(api.club.current, { screen: "settings" })
		)?.requests.at(0);
		assert(request);
		await client.mutation(api.club.approveRequest, {
			requestId: request.id,
			personId: "taylor",
			children: [],
			coachPrograms: [],
			admin: false,
		});
		await assert.rejects(
			memberClient.mutation(api.session_series.guest, {
				eventId: first.id,
				personId: "taylor",
				attending: true,
			}),
		);
	} finally {
		await memberClient.action(api.account_actions.deleteAccount, {
			password: memberPassword,
		});
	}
	console.log(
		"Admin guest checks passed: add/remove, capacity enforcement, no series enrollment changes, non-admin rejection.",
	);
} finally {
	await client.action(api.account_actions.deleteAccount, { password });
}
