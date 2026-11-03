import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { emptyCoachingSchedule } from "../src/domain/coaching-schedule";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("review-policy");
try {
	const { client: owner } = await run.fixture("Review policy administrator");
	await owner.mutation(api.club.create, {
		name: "Review policy verification",
		samples: true,
	});
	const workspace = await owner.query(api.club.current, {});
	assert(workspace);
	const joinCoach = async (
		name: string,
	): Promise<Awaited<ReturnType<typeof run.fixture>> & { id: string }> => {
		const fixture = await run.fixture(name);
		await fixture.client.mutation(api.club.requestToJoin, {
			clubCode: workspace.inviteCode,
		});
		const current = await fixture.client.query(api.club.current, {});
		assert(current);
		await owner.mutation(api.club.setAccess, {
			accountId: current.account.id,
			children: [],
			coachPrograms: ["club"],
			admin: false,
		});
		return { ...fixture, id: current.account.id };
	};
	const backup = await joinCoach("Backup-only reviewer");
	const regular = await joinCoach("Regular and backup reviewer");
	const schedule = emptyCoachingSchedule();
	await owner.mutation(api.coaching_schedule.save, {
		...schedule,
		days: schedule.days.map((day) => ({
			...day,
			coachIds:
				day.weekday === "monday" ? [workspace.account.id, regular.id] : [],
		})),
		backupCoachIds: [backup.id, regular.id],
	});
	const state = await owner.query(api.development_policy.state, {});
	assert.deepEqual(
		[...state.requiredIds].sort(),
		[workspace.account.id, regular.id].sort(),
	);
	await assert.rejects(
		backup.client.mutation(api.development.save, {
			personId: "alex",
			round: 1,
			revision: 0,
			rating: 60,
			observation: "Not required",
			submit: true,
		}),
	);
	await owner.mutation(api.development.save, {
		personId: "alex",
		round: 1,
		revision: 0,
		rating: 70,
		observation: "Opening review",
		submit: true,
	});
	await assert.rejects(
		regular.client.mutation(api.development_policy.save, {
			revision: 0,
			mode: "selected",
			reviewerIds: [regular.id],
		}),
	);
	await owner.mutation(api.development_policy.save, {
		revision: 0,
		mode: "selected",
		reviewerIds: [workspace.account.id],
	});
	const changed = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(changed?.round);
	assert.equal(changed.rosterChanged, true);
	await assert.rejects(
		owner.mutation(api.development.finalize, {
			personId: "alex",
			round: 1,
			revision: changed.round.revision,
		}),
	);
	await owner.mutation(api.development.reopen, {
		personId: "alex",
		round: 1,
		revision: changed.round.revision,
	});
	await owner.mutation(api.development.save, {
		personId: "alex",
		round: 2,
		revision: 0,
		rating: 75,
		observation: "Current reviewer policy",
		submit: true,
	});
	const complete = await owner.query(api.development.player, {
		personId: "alex",
	});
	assert(complete?.round);
	assert.equal(complete.requiredCount, 1);
	assert.equal(complete.canFinalize, true);
	await owner.mutation(api.development.finalize, {
		personId: "alex",
		round: 2,
		revision: complete.round.revision,
	});
	await assert.rejects(
		owner.mutation(api.development_policy.save, {
			revision: 0,
			mode: "regular",
			reviewerIds: [],
		}),
	);
	console.log(
		"Reviewer policy verified: backup-only exclusion, selected subset, admin boundary, snapshot changes and explicit new-round finalization.",
	);
} finally {
	await run.close();
}
