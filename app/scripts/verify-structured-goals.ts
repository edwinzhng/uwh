import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import type { GoalDetails } from "../src/domain/goals";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("structured-goals");
try {
	const { client: owner } = await run.fixture("Structured goal coach");
	await owner.mutation(api.club.create, {
		name: "Structured goal verification",
		samples: false,
	});
	const club = await owner.query(api.club.current, {});
	assert(club);
	const { client: player } = await run.fixture("Structured goal player");
	await player.mutation(api.club.requestToJoin, { clubCode: club.inviteCode });
	const personId = (await player.query(api.club.current, {}))?.account.personId;
	assert(personId);
	const details: GoalDetails = {
		category: "positioning",
		remarks: "Find the passing lane",
	};
	const goal = "Recover sooner";
	await owner.mutation(api.club.apply, {
		action: { type: "set-goal", personId, goal, details, expectedRevision: 0 },
	});
	const reflection = {
		personId,
		goal,
		goalRevision: 1,
		expectedSteps: 0,
		selfRating: 4,
		note: "Found space",
		requestId: crypto.randomUUID(),
	};
	await player.mutation(api.goal_reflections.record, reflection);
	await owner.mutation(api.club.apply, {
		action: {
			type: "set-goal",
			personId,
			goal,
			details: { ...details, remarks: "Updated coaching plan" },
			expectedRevision: 1,
		},
	});
	await assert.rejects(
		player.mutation(api.goal_reflections.record, {
			...reflection,
			requestId: crypto.randomUUID(),
		}),
	);
	const history = await player.query(api.goal_reflections.list, {
		personId,
		paginationOpts: { cursor: null, numItems: 10 },
	});
	assert.deepEqual(history.page.at(0)?.goalDetails, details);
	assert.equal(history.page.at(0)?.goalRevision, 1);
	await player.mutation(api.club.apply, {
		action: {
			type: "request-goal",
			personId,
			goal,
			details: { category: "fitness", remarks: "First proposal" },
			expectedRevision: 2,
		},
	});
	await player.mutation(api.club.apply, {
		action: {
			type: "request-goal",
			personId,
			goal,
			details: { category: "fitness", remarks: "Updated proposal" },
			expectedRevision: 2,
			expectedPendingRevision: 1,
		},
	});
	await assert.rejects(
		player.mutation(api.club.apply, {
			action: {
				type: "request-goal",
				personId,
				goal,
				details: { category: "fitness", remarks: "Stale proposal" },
				expectedRevision: 2,
				expectedPendingRevision: 1,
			},
		}),
	);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				type: "review-goal",
				personId,
				goal,
				requestRevision: 1,
				approve: true,
			},
		}),
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "review-goal",
			personId,
			goal,
			requestRevision: 2,
			approve: true,
		},
	});
	const current = (
		await player.query(api.club.current, { screen: "member", id: personId })
	)?.data.members.find((member) => member.id === personId);
	assert.equal(current?.goalDetails?.category, "fitness");
	assert.equal(current?.goalDetails?.remarks, "Updated proposal");
	assert.equal(current?.steps, 0);
	const { client: outsider } = await run.fixture("Unrelated member");
	await outsider.mutation(api.club.requestToJoin, {
		clubCode: club.inviteCode,
	});
	const redacted = (
		await outsider.query(api.club.current, { screen: "member", id: personId })
	)?.data.members.find((member) => member.id === personId);
	assert.equal(redacted?.goalDetails, undefined);
	assert.equal(redacted?.pendingGoalDetails, undefined);
	await assert.rejects(
		outsider.query(api.goal_reflections.list, {
			personId,
			paginationOpts: { cursor: null, numItems: 10 },
		}),
	);
	console.log(
		"Structured goals verified: category/remarks approval, stale request/version rejection, private snapshots and six-check-in reset.",
	);
} finally {
	await run.close();
}
