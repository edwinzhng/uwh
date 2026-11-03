import assert from "node:assert/strict";
import type { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { emptyCoachingSchedule } from "../src/domain/coaching-schedule";
import { createVerificationRun } from "./verification-fixtures";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (url !== "http://127.0.0.1:3210") throw new Error("Local backend only.");
const verification = createVerificationRun("weekly-coaches");
const fixture = async (name: string): Promise<ConvexHttpClient> =>
	(await verification.fixture(name)).client;
try {
	const owner = await fixture("Weekly roster coach");
	await owner.mutation(api.club.create, {
		name: "Weekly roster verification",
		samples: false,
	});
	const workspace = await owner.query(api.club.current, {});
	assert(workspace);
	const coach = await fixture("Backup coach");
	await coach.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	const coachAccount = (await coach.query(api.club.current, {}))?.account;
	assert(coachAccount);
	await owner.mutation(api.club.setAccess, {
		accountId: coachAccount.id,
		children: [],
		coachPrograms: ["club"],
		admin: false,
	});
	const player = await fixture("Ordinary player");
	await player.mutation(api.club.requestToJoin, {
		clubCode: workspace.inviteCode,
	});
	await assert.rejects(player.query(api.coaching_schedule.current, {}));
	await assert.rejects(
		player.mutation(api.coaching_schedule.save, emptyCoachingSchedule()),
	);
	const outsider = await fixture("Other club coach");
	await outsider.mutation(api.club.create, {
		name: "Other weekly roster club",
		samples: false,
	});
	const schedule = {
		...emptyCoachingSchedule(),
		programs: [{ programId: "club", coachIds: [workspace.account.id] }],
		days: emptyCoachingSchedule().days.map((day) => ({
			...day,
			coachIds: day.weekday === "monday" ? [workspace.account.id] : [],
		})),
		backupCoachIds: [coachAccount.id],
	};
	await owner.mutation(api.coaching_schedule.save, schedule);
	await assert.rejects(
		coach.mutation(api.coaching_schedule.save, {
			...schedule,
			revision: 1,
			programs: [
				...schedule.programs,
				{ programId: "youth", coachIds: [coachAccount.id] },
			],
		}),
	);
	const otherWorkspace = await outsider.query(api.club.current, {});
	assert(otherWorkspace);
	await assert.rejects(
		owner.mutation(api.coaching_schedule.save, {
			...schedule,
			revision: 1,
			programs: [{ programId: "club", coachIds: [otherWorkspace.account.id] }],
		}),
	);
	await assert.rejects(owner.mutation(api.coaching_schedule.save, schedule));
	await assert.rejects(
		owner.mutation(api.coaching_schedule.save, {
			...schedule,
			revision: 1,
			backupCoachIds: ["not-a-coach"],
		}),
	);
	const eventKey = `weekly-past-${crypto.randomUUID()}`;
	const eventId = `${eventKey}-0`;
	await owner.mutation(api.club.apply, {
		action: {
			type: "create-event",
			id: eventKey,
			draft: {
				title: "Confirmed coaching verification",
				date: "2026-09-08",
				start: "19:00",
				end: "19:45",
				venue: "Verification pool",
				program: "club",
				kind: "hockey",
				repeat: "once",
				seasonId: "2026-2027",
				description: "Local fictional verification event",
			},
		},
	});
	const weekly = await owner.query(api.coaching_schedule.eventState, {
		eventId,
	});
	assert.equal(weekly.usingWeekly, true);
	assert.equal(weekly.assignments.at(0)?.durationMinutes, 45);
	assert.deepEqual(
		weekly.assignments.map((entry) => entry.coachId),
		[workspace.account.id],
	);
	assert(
		!weekly.assignments.some((entry) => entry.coachId === coachAccount.id),
	);
	const before = await owner.query(api.coaching_hours.seasonPractices, {
		seasonId: "2026-2027",
		paginationOpts: { cursor: null, numItems: 25 },
	});
	assert(
		!before.page.some((practice) => practice.eventId === eventId),
		"Program defaults must not invent completed coaching hours.",
	);
	await assert.rejects(
		outsider.query(api.coaching_schedule.eventState, { eventId }),
	);
	await owner.mutation(api.coaching_hours.setCoach, {
		eventId,
		coachId: workspace.account.id,
		assigned: false,
	});
	const emptyOverride = await owner.query(api.coaching_schedule.eventState, {
		eventId,
	});
	assert.equal(emptyOverride.usingWeekly, false);
	assert.equal(emptyOverride.assignments.length, 0);
	await owner.mutation(api.coaching_schedule.save, {
		...schedule,
		revision: 1,
		programs: [{ programId: "club", coachIds: [coachAccount.id] }],
		days: schedule.days.map((day) => ({
			...day,
			coachIds: day.weekday === "monday" ? [coachAccount.id] : [],
		})),
	});
	assert.equal(
		(await owner.query(api.coaching_schedule.eventState, { eventId }))
			.assignments.length,
		0,
		"An explicit empty override must stay empty when defaults change.",
	);
	await owner.mutation(api.coaching_schedule.useWeeklyForEvent, { eventId });
	const restored = await owner.query(api.coaching_schedule.eventState, {
		eventId,
	});
	assert.equal(restored.usingWeekly, true);
	assert.deepEqual(
		restored.assignments.map((entry) => entry.coachId),
		[coachAccount.id],
	);
	await owner.mutation(api.coaching_schedule.confirmEvent, { eventId });
	await owner.mutation(api.coaching_schedule.save, {
		...emptyCoachingSchedule(),
		revision: 2,
	});
	const confirmed = await owner.query(api.coaching_schedule.eventState, {
		eventId,
	});
	assert.equal(confirmed.usingWeekly, false);
	assert.deepEqual(
		confirmed.assignments.map((entry) => entry.coachId),
		[coachAccount.id],
	);
	const after = await owner.query(api.coaching_hours.seasonPractices, {
		seasonId: "2026-2027",
		paginationOpts: { cursor: null, numItems: 25 },
	});
	assert.equal(
		after.page.find((practice) => practice.eventId === eventId)?.coaches.at(0)
			?.coachId,
		coachAccount.id,
	);
	console.log(
		"Program coach checks passed: scoped staff access, active-club coach validation, backups stay optional, program inheritance, explicit empty overrides, unchanged confirmed history, stale revisions and cross-club isolation.",
	);
} finally {
	await verification.close();
}
