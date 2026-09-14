import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
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
			email: `teams-${crypto.randomUUID()}@example.test`,
			password,
			name,
		},
	});
	assert(result.tokens);
	client.setAuth(result.tokens.token);
	fixtures.push({ client, password });
	return client;
};
try {
	const coach = await fixture("Teams coach");
	const clubId = await coach.mutation(api.club.create, {
		name: "Teams verification",
		samples: true,
	});
	const admin = await fixture("Admin without coaching");
	await admin.mutation(api.club.requestToJoin, { clubCode: clubId });
	const initial = await coach.query(api.club.current, { screen: "settings" });
	const request = initial?.requests.at(0);
	assert(request);
	await coach.mutation(api.club.approveRequest, {
		requestId: request.id,
		personId: "morgan",
		children: [],
		coachPrograms: [],
		admin: true,
	});
	const outsider = await fixture("Other club coach");
	await outsider.mutation(api.club.create, {
		name: "Other teams club",
		samples: false,
	});
	const profile = await coach.query(api.player_coaching.profile, {
		personId: "alex",
	});
	const updated = {
		...profile,
		rating: 93,
		positions: ["FULL_BACK"] as const,
		ageGroup: "youth" as const,
	};
	await coach.mutation(api.player_coaching.save, {
		...updated,
		positions: [...updated.positions],
	});
	await assert.rejects(
		coach.mutation(api.player_coaching.save, {
			...updated,
			positions: [...updated.positions],
		}),
	);
	await assert.rejects(
		admin.query(api.player_coaching.profile, { personId: "alex" }),
	);
	await assert.rejects(
		admin.mutation(api.player_coaching.save, { ...profile, revision: 1 }),
	);
	await assert.rejects(
		outsider.query(api.player_coaching.profile, { personId: "robin" }),
	);
	await assert.rejects(
		outsider.mutation(api.player_coaching.save, {
			...profile,
			personId: "robin",
		}),
	);
	assert.notEqual(
		(await outsider.query(api.player_coaching.profile, { personId: "alex" }))
			.rating,
		93,
	);
	await coach.mutation(api.club.apply, {
		action: {
			type: "generate-teams",
			eventId: "club-thu",
			separateYouth: true,
			excludedPersonIds: ["robin"],
		},
	});
	const generated = await coach.query(api.club.current, {});
	const plan = generated?.data.teams.find(
		(entry) => entry.eventId === "club-thu",
	);
	assert(plan);
	const assignment = plan.assignments?.find(
		(entry) => entry.personId === "alex",
	);
	assert.equal(assignment?.position, "FULL_BACK");
	assert.equal(assignment?.ageGroup, "youth");
	assert(![...plan.black, ...plan.white].includes("robin"));
	assert.equal(
		generated?.data.responses.find(
			(entry) => entry.eventId === "club-thu" && entry.personId === "robin",
		)?.response,
		"going",
	);
	await coach.mutation(api.club.apply, {
		action: { type: "publish-teams", eventId: "club-thu" },
	});
	await coach.mutation(api.club.apply, {
		action: {
			type: "assign-position",
			eventId: "club-thu",
			personId: "alex",
			position: "CENTER",
		},
	});
	const edited = await coach.query(api.club.current, {});
	assert.equal(
		edited?.data.teams.find((entry) => entry.eventId === "club-thu")?.published,
		false,
	);
	await assert.rejects(
		admin.mutation(api.club.apply, {
			action: {
				type: "assign-position",
				eventId: "club-thu",
				personId: "alex",
				position: "WING",
			},
		}),
	);
	await assert.rejects(
		coach.mutation(api.club.apply, {
			action: { type: "move-player", eventId: "club-thu", personId: "robin" },
		}),
	);
	await coach.mutation(api.club.apply, {
		action: { type: "publish-teams", eventId: "club-thu" },
	});
	await coach.mutation(api.player_coaching.save, {
		...profile,
		rating: 94,
		revision: 1,
	});
	const invalidated = await coach.query(api.club.current, {});
	assert.equal(
		invalidated?.data.teams.find((entry) => entry.eventId === "club-thu")
			?.coachingStale,
		true,
	);
	assert.equal(
		invalidated?.data.teams.find((entry) => entry.eventId === "club-thu")
			?.published,
		false,
	);
	await assert.rejects(
		coach.mutation(api.club.apply, {
			action: { type: "publish-teams", eventId: "club-thu" },
		}),
	);
	const hidden = await admin.query(api.club.current, {});
	assert(!hidden?.data.teams.some((entry) => entry.eventId === "club-thu"));
	assert.equal(hidden?.data.playerCoaching, undefined);
	await coach.mutation(api.club.apply, {
		action: {
			type: "generate-teams",
			eventId: "club-thu",
			separateYouth: false,
		},
	});
	await coach.mutation(api.club.apply, {
		action: { type: "publish-teams", eventId: "club-thu" },
	});
	const practice = (
		await coach.query(api.club.current, { screen: "session", id: "club-thu" })
	)?.data.events.find((event) => event.id === "club-thu");
	assert(practice);
	await coach.mutation(api.club.apply, {
		action: {
			type: "edit-event",
			eventId: practice.id,
			scope: "single",
			draft: {
				title: "Thursday practice",
				date: practice.date,
				start: "19:45",
				end: "21:30",
				venue: practice.venue,
				program: practice.program,
				kind: "training",
				capacity: practice.capacity,
				repeat: "once",
				description: practice.description,
				parts: [
					{
						id: "training",
						title: "Training",
						kind: "training",
						start: "19:45",
						end: "20:30",
					},
					{
						id: "hockey",
						title: "Hockey",
						kind: "hockey",
						start: "20:30",
						end: "21:30",
					},
				],
			},
		},
	});
	for (const partId of ["training", "hockey"])
		await coach.mutation(api.club.apply, {
			action: { type: "generate-teams", eventId: practice.id, partId },
		});
	await coach.mutation(api.club.apply, {
		action: { type: "publish-teams", eventId: practice.id, partId: "hockey" },
	});
	const parts = await coach.query(api.club.current, {
		screen: "session",
		id: practice.id,
	});
	const hockeyPlan = parts?.data.teams.find(
		(entry) => entry.partId === "hockey",
	);
	const trainingPlan = parts?.data.teams.find(
		(entry) => entry.partId === "training",
	);
	assert(hockeyPlan?.published);
	assert(trainingPlan && !trainingPlan.published);
	assert.equal(parts?.data.teams.length, 3);
	await coach.mutation(api.club.apply, {
		action: {
			type: "move-player",
			eventId: practice.id,
			partId: "hockey",
			personId: "alex",
		},
	});
	const movedPart = await coach.query(api.club.current, {
		screen: "session",
		id: practice.id,
	});
	assert.deepEqual(
		movedPart?.data.teams.find((entry) => entry.partId === "training"),
		trainingPlan,
	);
	assert.equal(
		movedPart?.data.teams.find((entry) => entry.partId === "hockey")?.published,
		false,
	);
	await assert.rejects(
		admin.mutation(api.club.apply, {
			action: {
				type: "generate-teams",
				eventId: practice.id,
				partId: "training",
			},
		}),
	);
	await assert.rejects(
		coach.mutation(api.club.apply, {
			action: {
				type: "generate-teams",
				eventId: practice.id,
				partId: "missing",
			},
		}),
	);
	for (const partId of ["training", "hockey"])
		await coach.mutation(api.club.apply, {
			action: {
				type: "save-plan",
				eventId: practice.id,
				partId,
				body: `${partId} plan`,
			},
		});
	const planBodies = (
		await coach.query(api.club.current, { screen: "session", id: practice.id })
	)?.data.plans;
	assert.equal(
		planBodies?.[JSON.stringify([practice.id, "training"])],
		"training plan",
	);
	assert.equal(
		planBodies?.[JSON.stringify([practice.id, "hockey"])],
		"hockey plan",
	);
	assert.deepEqual(
		(
			await admin.query(api.club.current, {
				screen: "session",
				id: practice.id,
			})
		)?.data.plans,
		{},
	);
	console.log(
		"Coaching teams checks passed: private metadata, club isolation, stale revisions, server generation, age groups, exclusions, positions, published visibility, metadata invalidation republishing, per-part lineup persistence, independent edits, and private per-part plans.",
	);
} finally {
	for (const entry of fixtures.toReversed())
		await entry.client.action(api.account_actions.deleteAccount, {
			password: entry.password,
		});
}
