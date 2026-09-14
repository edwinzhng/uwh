import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { EventDraft } from "../src/domain/app-types";
import { coachingTotals } from "../src/domain/coaching-hours";
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
			email: `hours-${crypto.randomUUID()}@example.test`,
			password,
			name,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
const draft: EventDraft = {
	title: "Coach hours check",
	date: "2026-09-04",
	start: "19:00",
	end: "20:00",
	venue: "Test pool",
	program: "club",
	kind: "training",
	capacity: 30,
	repeat: "once",
	description: "",
	seasonId: "2026-2027",
};
const paginationOpts = { cursor: null, numItems: 25 };
try {
	const owner = await fixture("Hours coach");
	const clubId = await owner.mutation(api.club.create, {
		name: "Hours verification",
		samples: true,
	});
	const workspace = await owner.query(api.club.current, { screen: "settings" });
	assert(workspace);
	const coachId = workspace.account.id;
	const outsider = await fixture("Outside coach");
	await outsider.mutation(api.club.create, {
		name: "Other hours club",
		samples: false,
	});
	const foreign = await outsider.query(api.club.current, {
		screen: "settings",
	});
	assert(foreign);
	const player = await fixture("Hours player parent");
	await player.mutation(api.club.requestToJoin, { clubCode: clubId });
	const pending = await owner.query(api.club.current, { screen: "settings" });
	const request = pending?.requests.at(0);
	assert(request);
	await owner.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "jamie",
		children: ["sam"],
		coachPrograms: [],
		admin: false,
	});
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: "hours-check", draft },
	});
	const eventId = "hours-check-0";
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: true,
	});
	assert.equal(
		(await owner.query(api.coaching_hours.eventCoaches, { eventId })).at(0)
			?.durationMinutes,
		60,
	);
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: true,
		durationMinutes: 150,
	});
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: true,
		durationMinutes: 150,
	});
	const assignments = await owner.query(api.coaching_hours.eventCoaches, {
		eventId,
	});
	assert.equal(assignments.length, 1);
	assert.equal(assignments.at(0)?.durationMinutes, 150);
	await assert.rejects(
		owner.mutation(api.coaching_hours.setCoach, {
			eventId,
			coachId,
			assigned: true,
			durationMinutes: 61,
		}),
	);
	await assert.rejects(
		owner.mutation(api.coaching_hours.setCoach, {
			eventId,
			coachId: foreign.account.id,
			assigned: true,
		}),
	);
	await assert.rejects(
		outsider.query(api.coaching_hours.eventCoaches, { eventId }),
	);
	await assert.rejects(
		player.query(api.coaching_hours.eventCoaches, { eventId }),
	);
	await assert.rejects(
		player.query(api.coaching_hours.coaches, { paginationOpts }),
	);
	await assert.rejects(
		player.query(api.coaching_hours.seasonPractices, {
			seasonId: "2026-2027",
			paginationOpts,
		}),
	);
	await assert.rejects(
		player.mutation(api.coaching_hours.setCoach, {
			eventId,
			coachId,
			assigned: false,
		}),
	);
	const future = { ...draft, date: "2027-08-01" };
	await owner.mutation(api.club.apply, {
		action: { type: "create-event", id: "hours-future", draft: future },
	});
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId: "hours-future-0",
		coachId,
		assigned: true,
	});
	const report = await owner.query(api.coaching_hours.seasonPractices, {
		seasonId: "2026-2027",
		paginationOpts,
	});
	assert.equal(report.page.length, 1);
	assert.equal(coachingTotals(report.page).at(0)?.minutes, 150);
	await owner.mutation(api.club.apply, {
		action: {
			type: "add-season",
			season: {
				id: "hours-other",
				name: "Other",
				start: "2025-09-01",
				end: "2026-08-31",
			},
		},
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId,
			scope: "single",
			draft: { ...draft, seasonId: "hours-other" },
		},
	});
	assert.equal(
		(
			await owner.query(api.coaching_hours.seasonPractices, {
				seasonId: "2026-2027",
				paginationOpts,
			})
		).page.length,
		0,
	);
	assert.equal(
		coachingTotals(
			(
				await owner.query(api.coaching_hours.seasonPractices, {
					seasonId: "hours-other",
					paginationOpts,
				})
			).page,
		).at(0)?.minutes,
		150,
	);
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: false,
	});
	assert.equal(
		(await owner.query(api.coaching_hours.eventCoaches, { eventId })).length,
		0,
	);
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId,
		assigned: true,
	});
	await owner.mutation(api.club.apply, {
		action: { type: "cancel-event", eventId },
	});
	assert.equal(
		(
			await owner.query(api.coaching_hours.seasonPractices, {
				seasonId: "hours-other",
				paginationOpts,
			})
		).page.length,
		0,
	);
	await assert.rejects(
		owner.mutation(api.coaching_hours.setCoach, {
			eventId,
			coachId,
			assigned: true,
		}),
	);
	await owner.mutation(api.club.setAccess, {
		accountId: coachId,
		children: [],
		coachPrograms: [],
		admin: true,
	});
	await assert.rejects(
		owner.query(api.coaching_hours.seasonPractices, {
			seasonId: "hours-other",
			paginationOpts,
		}),
	);
	await assert.rejects(
		owner.mutation(api.coaching_hours.setCoach, {
			eventId: "hours-future-0",
			coachId,
			assigned: true,
		}),
	);
	console.log(
		"Coaching hours verified: defaults, editable duration, idempotent assignment/removal, role and club boundaries, season moves, future/cancelled exclusions.",
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
