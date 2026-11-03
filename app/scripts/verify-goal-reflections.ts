import assert from "node:assert/strict";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("development");

const verify = async (): Promise<void> => {
	const { client: owner } = await run.fixture("Goal reflection coach");
	await owner.mutation(api.club.create, {
		name: "Goal reflection verification",
		samples: true,
	});
	const inviteCode = (
		await owner.query(api.club.current, { screen: "settings" })
	)?.inviteCode;
	assert(inviteCode);
	const join = async (
		name: string,
		admin = false,
	): Promise<ConvexHttpClient> => {
		const { client } = await run.fixture(name);
		await client.mutation(api.club.requestToJoin, { clubCode: inviteCode });
		const account = await client.query(api.account.current, {});
		assert(account);
		await owner.mutation(api.club.setAccess, {
			accountId: account.id,
			children: [],
			coachPrograms: [],
			admin,
		});
		return client;
	};
	const player = await join("Goal reflection player");
	const personId = (await player.query(api.club.current, {}))?.account.personId;
	assert(personId);
	const goal = "Track the next pass";
	await owner.mutation(api.club.apply, {
		action: { type: "set-goal", personId, goal },
	});
	const guardian = await join("Goal reflection guardian");
	const guardianAccount = await guardian.query(api.account.current, {});
	assert(guardianAccount);
	await owner.mutation(api.club.setAccess, {
		accountId: guardianAccount.id,
		children: [personId],
		coachPrograms: [],
		admin: false,
	});
	const admin = await join("Goal reflection admin", true);
	const { client: outsider } = await run.fixture("Goal reflection other club");
	await outsider.mutation(api.club.create, {
		name: "Other goal club",
		samples: true,
	});
	const draft = {
		personId,
		requestId: crypto.randomUUID(),
		goal,
		expectedSteps: 0,
		note: "I found the passing lane",
		selfRating: 4,
	};
	for (const other of [owner, guardian, admin, outsider])
		await assert.rejects(other.mutation(api.goal_reflections.record, draft));
	for (const other of [admin, outsider])
		await assert.rejects(
			other.query(api.goal_reflections.list, {
				personId,
				paginationOpts: { cursor: null, numItems: 10 },
			}),
		);
	await Promise.all([
		player.mutation(api.goal_reflections.record, draft),
		player.mutation(api.goal_reflections.record, draft),
	]);
	await player.mutation(api.goal_reflections.record, {
		...draft,
		expectedSteps: 6,
	});
	const first = await player.query(api.goal_reflections.list, {
		personId,
		paginationOpts: { cursor: null, numItems: 10 },
	});
	assert.equal(first.page.length, 1);
	assert.equal(first.page.at(0)?.selfRating, 4);
	assert.equal(first.page.at(0)?.goal, goal);
	assert.equal(
		(
			await player.query(api.club.current, { screen: "member", id: personId })
		)?.data.members.find((member) => member.id === personId)?.steps,
		1,
	);
	assert.equal(
		(
			await guardian.query(api.goal_reflections.list, {
				personId,
				paginationOpts: { cursor: null, numItems: 10 },
			})
		).page.length,
		1,
	);
	assert.equal(
		(
			await owner.query(api.goal_reflections.list, {
				personId,
				paginationOpts: { cursor: null, numItems: 10 },
			})
		).page.length,
		1,
	);
	await assert.rejects(
		player.mutation(api.goal_reflections.record, { ...draft, selfRating: 3 }),
	);
	await assert.rejects(
		player.mutation(api.goal_reflections.record, {
			...draft,
			requestId: crypto.randomUUID(),
			selfRating: 6,
			expectedSteps: 1,
		}),
	);
	await assert.rejects(
		player.mutation(api.goal_reflections.record, {
			...draft,
			requestId: crypto.randomUUID(),
			expectedSteps: 0,
		}),
	);
	const nextGoal = "Create space for the pass";
	await owner.mutation(api.club.apply, {
		action: { type: "set-goal", personId, goal: nextGoal },
	});
	await assert.rejects(
		player.mutation(api.goal_reflections.record, {
			...draft,
			requestId: crypto.randomUUID(),
		}),
	);
	await player.mutation(api.goal_reflections.record, draft);
	assert.equal(
		(
			await player.query(api.club.current, { screen: "member", id: personId })
		)?.data.members.find((member) => member.id === personId)?.steps,
		0,
	);
	await player.mutation(api.goal_reflections.record, {
		...draft,
		requestId: crypto.randomUUID(),
		goal: nextGoal,
		selfRating: 5,
	});
	const history = await player.query(api.goal_reflections.list, {
		personId,
		paginationOpts: { cursor: null, numItems: 10 },
	});
	assert.equal(history.page.length, 2);
	assert.equal(history.page.at(0)?.goal, nextGoal);
	for (const index of Array.from({ length: 39 }, (_, index) => index)) {
		const paginationGoal = `History goal ${Math.floor(index / 6) + 1}`;
		const expectedSteps = index % 6;
		if (expectedSteps === 0)
			await owner.mutation(api.club.apply, {
				action: { type: "set-goal", personId, goal: paginationGoal },
			});
		await player.mutation(api.goal_reflections.record, {
			...draft,
			requestId: crypto.randomUUID(),
			goal: paginationGoal,
			expectedSteps,
		});
	}
	const oversizedPage = await player.query(api.goal_reflections.list, {
		personId,
		paginationOpts: {
			cursor: null,
			numItems: 10000,
			maximumRowsRead: 1000000,
		},
	});
	assert.equal(oversizedPage.page.length, 40);
	assert.equal(oversizedPage.isDone, false);
	const remainingPage = await player.query(api.goal_reflections.list, {
		personId,
		paginationOpts: {
			cursor: oversizedPage.continueCursor,
			numItems: 10000,
			maximumRowsRead: 1000000,
		},
	});
	assert.equal(remainingPage.page.length, 1);
	assert.equal(remainingPage.isDone, true);
	const visibleIds = [...oversizedPage.page, ...remainingPage.page].map(
		(entry) => entry.id,
	);
	assert.equal(new Set(visibleIds).size, 41);
	assert(history.page.every((entry) => visibleIds.includes(entry.id)));
	assert.equal(
		(
			await player.query(api.goal_reflections.list, {
				personId,
				paginationOpts: { cursor: null, numItems: 0 },
			})
		).page.length,
		1,
	);
	console.log(
		"Goal reflection checks passed: self-only writes, guardian/coach reads, admin and club isolation, dated goal snapshots, rating bounds, stale-goal/count protection, atomic idempotent single increments and bounded cursor history pagination.",
	);
};

const result = (await Promise.allSettled([verify()])).at(0);
const cleanup = (await Promise.allSettled([run.close()])).at(0);
if (result?.status === "rejected") throw result.reason;
if (cleanup?.status === "rejected") throw cleanup.reason;
