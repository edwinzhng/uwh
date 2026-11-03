import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { editLineup, lineupSnapshot } from "../src/domain/lineup";
import { createVerificationRun } from "./verification-fixtures";

const verification = createVerificationRun("rankings-lineup");
try {
	const owner = (await verification.fixture("Ranking verification owner"))
		.client;
	await owner.mutation(api.club.create, {
		name: "Rankings verification",
		samples: true,
	});
	const workspace = await owner.query(api.club.current, { screen: "settings" });
	assert(workspace);
	const anonymous = new ConvexHttpClient("http://127.0.0.1:3210", {
		logger: false,
	});
	await assert.rejects(anonymous.query(api.player_coaching.rankings, {}));
	await assert.rejects(
		anonymous.mutation(api.player_coaching.score, {
			personId: "alex",
			score: 90,
			expectedRevision: 0,
		}),
	);
	await assert.rejects(
		anonymous.query(api.player_coaching.teamStrength, { personIds: ["alex"] }),
	);
	await owner.mutation(api.player_coaching.score, {
		personId: "alex",
		score: 0,
		expectedRevision: 0,
	});
	const ranked = (await owner.query(api.player_coaching.rankings, {})).find(
		(entry) => entry.personId === "alex",
	);
	assert.equal(ranked?.scores.length, 1);
	assert.equal(ranked?.coachCount, 1);
	assert.equal(ranked?.scores.at(0)?.coachId, workspace.account.id);
	const profile = await owner.query(api.player_coaching.profile, {
		personId: "alex",
	});
	assert.equal(profile.rating, 0);
	assert.equal(profile.ratingKnown, true);
	const { scores: _scores, ...details } = profile;
	await owner.mutation(api.player_coaching.save, { ...details, rating: 99 });
	assert.equal(
		(await owner.query(api.player_coaching.profile, { personId: "alex" }))
			.rating,
		0,
	);
	await assert.rejects(
		owner.mutation(api.player_coaching.score, {
			personId: "alex",
			score: 55,
			expectedRevision: 0,
		}),
		/score changed/,
	);
	await assert.rejects(
		owner.mutation(api.player_coaching.score, {
			personId: "alex",
			score: 101,
			expectedRevision: 1,
		}),
		/0–100/,
	);
	await assert.rejects(
		owner.mutation(api.player_coaching.score, {
			personId: "not-in-club",
			score: 55,
			expectedRevision: 0,
		}),
	);
	await owner.mutation(api.player_coaching.score, {
		personId: "alex",
		score: 80,
		expectedRevision: 1,
	});
	assert.equal(
		(await owner.query(api.player_coaching.profile, { personId: "alex" }))
			.rating,
		80,
	);
	await owner.mutation(api.club.apply, {
		action: {
			type: "generate-teams",
			eventId: "club-thu",
			separateYouth: false,
			expectedRevision: 0,
		},
	});
	const generated = await owner.query(api.club.current, {
		screen: "session",
		id: "club-thu",
	});
	const plan = generated?.data.teams.find(
		(entry) => entry.eventId === "club-thu",
	);
	assert(plan);
	const captainId = plan.black.at(0);
	assert(captainId);
	const snapshot = editLineup(plan, lineupSnapshot(plan), {
		kind: "captain",
		side: "black",
		personId: captainId,
	});
	await owner.mutation(api.club.apply, {
		action: {
			type: "save-lineup",
			eventId: "club-thu",
			expectedRevision: plan.revision ?? 0,
			snapshot,
		},
	});
	const saved = (
		await owner.query(api.club.current, { screen: "session", id: "club-thu" })
	)?.data.teams.find((entry) => entry.eventId === "club-thu");
	assert.deepEqual(saved?.captains, [{ side: "black", personId: captainId }]);
	await assert.rejects(
		owner.mutation(api.club.apply, {
			action: {
				type: "save-lineup",
				eventId: "club-thu",
				expectedRevision: plan.revision ?? 0,
				snapshot,
			},
		}),
	);
	assert.deepEqual(
		await owner.query(api.player_coaching.teamStrength, {
			personIds: ["alex", "alex"],
		}),
		[{ personId: "alex", rating: 80, ratingKnown: true }],
	);
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId: "club-thu",
		coachId: workspace.account.id,
		assigned: true,
	});
	assert.equal(
		(
			await owner.query(api.coaching_hours.eventCoaches, {
				eventId: "club-thu",
			})
		).length,
		1,
	);
	const outsider = (
		await verification.fixture("Other rankings verification owner")
	).client;
	await outsider.mutation(api.club.create, {
		name: "Other rankings verification",
		samples: false,
	});
	assert.equal(
		(await outsider.query(api.player_coaching.rankings, {})).some(
			(entry) => entry.personId === "casey",
		),
		false,
	);
	await assert.rejects(
		outsider.mutation(api.player_coaching.score, {
			personId: "casey",
			score: 90,
			expectedRevision: 0,
		}),
	);
	console.log(
		"Isolated live scoring, actor ownership, zero ratings, stale saves, validation, captain persistence, private team totals, coaching hours and club boundaries verified. No permission changes performed.",
	);
} finally {
	await verification.close();
}
