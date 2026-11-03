import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("coaching-gender");
try {
	const coach = await run.fixture("Fictional coaching details");
	await coach.client.mutation(api.club.create, {
		name: "Coaching field verification",
		samples: true,
	});
	const workspace = await coach.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Fictional non-coaching member");
	await player.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const before = await coach.client.query(api.player_coaching.profile, {
		personId: "alex",
	});
	await coach.client.mutation(api.club.apply, {
		action: {
			type: "generate-teams",
			eventId: "club-thu",
			separateYouth: false,
		},
	});
	const generated = await coach.client.query(api.club.current, {});
	const draft = generated?.data.teams.find(
		(team) => team.eventId === "club-thu" && !team.partId,
	);
	assert(draft);
	await coach.client.mutation(api.club.apply, {
		action: {
			type: "publish-teams",
			eventId: "club-thu",
			expectedRevision: draft.revision,
		},
	});
	const published = (
		await coach.client.query(api.club.current, {})
	)?.data.teams.find((team) => team.eventId === "club-thu" && !team.partId);
	assert(published?.published);
	await coach.client.mutation(api.player_coaching.save, {
		...before,
		gender: "female",
	});
	const after = await coach.client.query(api.player_coaching.profile, {
		personId: "alex",
	});
	assert.equal(after.gender, "female");
	assert.equal(after.revision, before.revision + 1);
	assert.deepEqual(
		(await coach.client.query(api.club.current, {}))?.data.teams.find(
			(team) => team.eventId === "club-thu" && !team.partId,
		),
		published,
	);
	await assert.rejects(
		coach.client.mutation(api.player_coaching.save, {
			...before,
			gender: "male",
		}),
	);
	await assert.rejects(
		player.client.query(api.player_coaching.profile, { personId: "alex" }),
	);
	assert.equal(
		(await player.client.query(api.club.current, {}))?.data.playerCoaching,
		undefined,
	);
	await coach.client.mutation(api.player_coaching.save, {
		...after,
		gender: undefined,
	});
	assert.equal(
		(
			await coach.client.query(api.player_coaching.profile, {
				personId: "alex",
			})
		).gender,
		undefined,
	);
	assert.deepEqual(
		(await coach.client.query(api.club.current, {}))?.data.teams.find(
			(team) => team.eventId === "club-thu" && !team.partId,
		),
		published,
	);
	console.log(
		"PASS: optional coach-only gender, first-write and clear preserve published lineups, revision conflicts and non-coach privacy.",
	);
} finally {
	await run.close();
}
