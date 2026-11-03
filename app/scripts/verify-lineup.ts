import assert from "node:assert/strict";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { TeamPlan } from "../src/domain/app-types";
import {
	editLineup,
	lineupPeople,
	lineupSnapshot,
	validateLineup,
} from "../src/domain/lineup";
import { createVerificationRun } from "./verification-fixtures";

if (process.env.EXPO_PUBLIC_CONVEX_URL !== "http://127.0.0.1:3210")
	throw new Error("Local backend only.");
const verification = createVerificationRun("weekly-coaches-lineup");
const eventKey = `lineup-${crypto.randomUUID()}`;
const eventId = `${eventKey}-0`;
const planFor = async (
	client: ConvexHttpClient,
	partId = "hockey",
): Promise<TeamPlan> => {
	const workspace = await client.query(api.club.current, {
		screen: "session",
		id: eventId,
	});
	const plan = workspace?.data.teams.find(
		(entry) => entry.eventId === eventId && entry.partId === partId,
	);
	assert(plan, "Expected a saved lineup.");
	return plan;
};
try {
	const owner = (await verification.fixture("Lineup coach")).client;
	await owner.mutation(api.club.create, {
		name: "Lineup verification",
		samples: false,
	});
	const workspace = await owner.query(api.club.current, {});
	assert(workspace);
	const people = Array.from(
		{ length: 17 },
		(_, index) => `lineup-player-${index}`,
	);
	for (const [index, personId] of people.entries())
		await owner.mutation(api.club.apply, {
			action: {
				type: "add-member",
				charge: 0,
				member: {
					id: personId,
					name: `Lineup Player ${index}`,
					programs: ["club"],
					position: "Forward",
					rating: 50,
					registration: "approved",
					goal: "",
					steps: 0,
				},
			},
		});
	await owner.mutation(api.club.setAccess, {
		accountId: workspace.account.id,
		children: people,
		coachPrograms: ["club"],
		admin: true,
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: eventKey,
			draft: {
				title: "Lineup verification",
				date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
				start: "19:00",
				end: "20:30",
				venue: "Verification pool",
				program: "club",
				kind: "hockey",
				repeat: "once",
				seasonId: "2026-2027",
				description: "Fictional local lineup verification",
				parts: [
					{
						id: "training",
						title: "Training",
						kind: "training",
						start: "19:00",
						end: "19:30",
					},
					{
						id: "hockey",
						title: "Hockey",
						kind: "hockey",
						start: "19:30",
						end: "20:30",
					},
				],
			},
		},
	});
	for (const personId of people)
		await owner.mutation(api.club.apply, {
			action: { type: "respond", eventId, personId, response: "going" },
		});
	const excluded = people.at(-1);
	assert(excluded);
	for (const partId of ["training", "hockey"])
		await owner.mutation(api.club.apply, {
			action: {
				type: "generate-teams",
				eventId,
				partId,
				separateYouth: false,
				excludedPersonIds: [excluded],
				expectedRevision: 0,
			},
		});
	const plan = await planFor(owner);
	const training = await planFor(owner, "training");
	const snapshot = lineupSnapshot(plan);
	assert.equal(plan.black.length, 6);
	assert.equal(plan.white.length, 6);
	assert.equal(snapshot.blackBench.length + snapshot.whiteBench.length, 4);
	assert.equal(new Set(lineupPeople(snapshot)).size, 16);
	assert(!lineupPeople(snapshot).includes(excluded));
	assert.equal(validateLineup(plan, snapshot), undefined);
	assert.equal(plan.revision, 1);
	const viewer = (await verification.fixture("Lineup admin without coaching"))
		.client;
	await viewer.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const viewerAccount = (await viewer.query(api.club.current, {}))?.account;
	assert(viewerAccount);
	await owner.mutation(api.club.setAccess, {
		accountId: viewerAccount.id,
		children: [],
		coachPrograms: [],
		admin: true,
	});
	assert.equal(
		(await viewer.query(api.club.current, { screen: "session", id: eventId }))
			?.data.teams.length,
		0,
	);
	const save = {
		type: "save-lineup" as const,
		eventId,
		partId: "hockey",
		expectedRevision: plan.revision ?? 0,
		snapshot,
	};
	const starterSlot = snapshot.fieldSlots?.find((entry) =>
		snapshot.black.includes(entry.personId),
	);
	assert(starterSlot);
	const rotated = snapshot.blackBench.reduce(
		(current, personId) =>
			editLineup(plan, current, {
				kind: "rotation",
				personId,
				slot: starterSlot.slot,
			}),
		snapshot,
	);
	assert.equal(
		rotated.rotationSlots?.length,
		snapshot.blackBench.length + snapshot.whiteBench.length,
	);
	await owner.mutation(api.club.apply, {
		action: { ...save, snapshot: rotated },
	});
	const rotationSaved = await planFor(owner);
	assert.deepEqual(rotationSaved.rotationSlots, rotated.rotationSlots);
	assert.deepEqual(rotationSaved.black, plan.black);
	assert.equal(rotationSaved.black.length, 6);
	assert.equal(rotationSaved.revision, 2);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				...save,
				expectedRevision: 2,
				snapshot: {
					...rotated,
					rotationSlots: [
						{ personId: starterSlot.personId, slot: starterSlot.slot },
					],
				},
			},
		}),
	);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				...save,
				expectedRevision: 2,
				snapshot: {
					...rotated,
					rotationSlots: [
						{ personId: snapshot.blackBench.at(0) ?? "", slot: 6 },
					],
				},
			},
		}),
	);
	assert.deepEqual(await planFor(owner), rotationSaved);
	await assert.rejects(viewer.mutation(api.club.apply, { action: save }));
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				...save,
				snapshot: {
					...snapshot,
					blackBench: [...snapshot.blackBench, excluded],
				},
			},
		}),
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "publish-teams",
			eventId,
			partId: "hockey",
			expectedRevision: rotationSaved.revision ?? 0,
		},
	});
	const published = await planFor(owner);
	assert.equal((await planFor(viewer)).published, true);
	const active = snapshot.black.at(0);
	const reserve = snapshot.blackBench.at(0);
	assert(active && reserve);
	const moved = editLineup(published, snapshot, {
		kind: "swap",
		personId: active,
		otherId: reserve,
	});
	const formation = editLineup(published, moved, {
		kind: "formation",
		side: "black",
		formation: "3-3",
	});
	await owner.mutation(api.club.apply, {
		action: {
			...save,
			expectedRevision: published.revision ?? 0,
			snapshot: formation,
		},
	});
	const changed = await planFor(owner);
	assert.equal(changed.revision, 4);
	assert.equal(changed.blackFormation, "3-3");
	assert.equal(changed.published, false);
	assert(changed.black.includes(reserve));
	assert(changed.blackBench?.includes(active));
	assert.equal(
		(await viewer.query(api.club.current, { screen: "session", id: eventId }))
			?.data.teams.length,
		0,
	);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: { ...save, expectedRevision: published.revision ?? 0 },
		}),
	);
	assert.deepEqual(await planFor(owner, "training"), training);
	await owner.mutation(api.club.apply, {
		action: { ...save, expectedRevision: changed.revision ?? 0 },
	});
	const undone = await planFor(owner);
	assert.deepEqual(undone.black, plan.black);
	assert.equal(undone.revision, 5);
	const outsider = (await verification.fixture("Other club lineup coach"))
		.client;
	await outsider.mutation(api.club.create, {
		name: "Other lineup verification",
		samples: false,
	});
	await assert.rejects(
		outsider.mutation(api.club.apply, {
			action: { ...save, expectedRevision: undone.revision ?? 0 },
		}),
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "publish-teams",
			eventId,
			partId: "hockey",
			expectedRevision: undone.revision ?? 0,
		},
	});
	const reserveProfile = await owner.query(api.player_coaching.profile, {
		personId: reserve,
	});
	await owner.mutation(api.player_coaching.save, {
		...reserveProfile,
		rating: 75,
	});
	const coachingStale = await planFor(owner);
	assert.equal(coachingStale.published, false);
	assert.equal(
		coachingStale.coachingStale,
		true,
		"Coaching changes for a grouped player must invalidate the lineup.",
	);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: { ...save, expectedRevision: coachingStale.revision ?? 0 },
		}),
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "generate-teams",
			eventId,
			partId: "hockey",
			separateYouth: false,
			excludedPersonIds: [excluded],
			expectedRevision: coachingStale.revision ?? 0,
		},
	});
	const fresh = await planFor(owner);
	const beforeAdd = await owner.query(api.club.current, {
		screen: "session",
		id: eventId,
	});
	const added = editLineup(fresh, lineupSnapshot(fresh), {
		kind: "add",
		personId: excluded,
		side: "black",
		slot: 0,
	});
	assert.equal(validateLineup(fresh, added), undefined);
	await owner.mutation(api.club.apply, {
		action: { ...save, expectedRevision: fresh.revision ?? 0, snapshot: added },
	});
	const addedPlan = await planFor(owner);
	assert.equal(new Set(lineupPeople(lineupSnapshot(addedPlan))).size, 17);
	assert(!addedPlan.excludedPersonIds?.includes(excluded));
	const afterAdd = await owner.query(api.club.current, {
		screen: "session",
		id: eventId,
	});
	assert.deepEqual(afterAdd?.data.responses, beforeAdd?.data.responses);
	await owner.mutation(api.club.apply, {
		action: {
			type: "attendance",
			eventId,
			partId: "hockey",
			personId: active,
			attendance: "absent",
		},
	});
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				...save,
				expectedRevision: addedPlan.revision ?? 0,
				snapshot: lineupSnapshot(addedPlan),
			},
		}),
	);
	console.log(
		"Lineup checks passed: real generation, six pool spots, position groups, Yes-only direct addition, exclusions, formation/swap/undo, revision conflicts, part isolation, unpublished audience redaction, staff guards and stale attendance protection.",
	);
} finally {
	await verification.close();
}
