import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { clubDate } from "../src/domain/event-time";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("poolside");
try {
	const owner = await run.fixture("Poolside coach");
	await owner.client.mutation(api.club.create, {
		name: "Poolside isolated verification",
		samples: false,
	});
	const workspace = await owner.client.query(api.club.current, {});
	assert(workspace);
	const player = await run.fixture("Poolside player");
	await player.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const playerSpace = await player.client.query(api.club.current, {});
	assert(playerSpace);
	await owner.client.mutation(api.club.setAccess, {
		accountId: playerSpace.account.id,
		children: [],
		coachPrograms: [],
		admin: false,
	});
	const personId = playerSpace.account.personId;
	const peer = await run.fixture("Poolside peer coach");
	await peer.client.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const peerSpace = await peer.client.query(api.club.current, {});
	assert(peerSpace);
	await owner.client.mutation(api.club.setAccess, {
		accountId: peerSpace.account.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	const draftId = crypto.randomUUID();
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-feedback",
			feedback: {
				id: draftId,
				personId,
				authorId: workspace.account.id,
				body: "Only this coach’s unfinished draft",
				kind: "coaching",
				visibility: "draft",
				date: clubDate(),
			},
		},
	});
	await player.client.mutation(api.club.apply, {
		action: {
			type: "request-goal",
			personId,
			goal: "Improve support positioning",
		},
	});
	const coachTasks = await owner.client.query(api.pages.coachingHome, {});
	assert(coachTasks.drafts.some((entry) => entry.id === draftId));
	assert(coachTasks.goals.some((person) => person.id === personId));
	assert(
		coachTasks.goals.every((person) =>
			Object.keys(person).every((key) =>
				["id", "name", "pendingGoal"].includes(key),
			),
		),
	);
	const peerTasks = await peer.client.query(api.pages.coachingHome, {});
	assert(!peerTasks.drafts.some((entry) => entry.id === draftId));
	assert(peerTasks.goals.some((person) => person.id === personId));
	assert.deepEqual(await player.client.query(api.pages.coachingHome, {}), {
		goals: [],
		drafts: [],
		morePlayers: false,
		moreDrafts: false,
	});
	const signedOut = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	assert.deepEqual(await signedOut.query(api.pages.coachingHome, {}), {
		goals: [],
		drafts: [],
		morePlayers: false,
		moreDrafts: false,
	});
	const outsider = await run.fixture("Poolside other club");
	await outsider.client.mutation(api.club.create, {
		name: "Poolside other isolated club",
		samples: false,
	});
	const outsideTasks = await outsider.client.query(api.pages.coachingHome, {});
	assert(!outsideTasks.goals.some((person) => person.id === personId));
	assert(!outsideTasks.drafts.some((entry) => entry.id === draftId));
	console.log(
		"Poolside live verification passed: real goal requests, own drafts only, peer isolation, member/signed-out denial, and cross-club isolation.",
	);
} finally {
	await run.close();
}
