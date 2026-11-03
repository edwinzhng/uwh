import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import { addDays } from "../src/domain/calendar-dates";
import { clubDate } from "../src/domain/event-time";
import {
	defaultProgramRsvp,
	type ProgramDraft,
	programDraft,
} from "../src/domain/programs";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("program-series");
const verify = async (): Promise<void> => {
	const owner = await run.fixture("Program series administrator");
	await owner.client.mutation(api.club.create, {
		name: "Fictional program series",
		samples: false,
	});
	const club = await owner.client.query(api.club.current, {});
	assert(club);
	const players = await Promise.all(
		["Original player", "Replacement player"].map((name) => run.fixture(name)),
	);
	for (const player of players)
		await player.client.mutation(api.club.requestToJoin, {
			clubCode: club.inviteCode,
		});
	const accounts = await Promise.all(
		players.map((player) => player.client.query(api.club.current, {})),
	);
	const originalId = accounts.at(0)?.account.personId;
	const replacementId = accounts.at(1)?.account.personId;
	assert(originalId && replacementId);
	const tomorrow = addDays(clubDate(undefined, club.data.timeZone), 1);
	const draft: ProgramDraft = {
		id: `series-${crypto.randomUUID()}`,
		name: "Fictional weekly roster",
		archived: false,
		status: "active",
		kind: "hockey",
		seasonId: "2026-2027",
		schedule: {
			startDate: tomorrow,
			endDate: addDays(tomorrow, 14),
			weekday: new Date(`${tomorrow}T12:00:00Z`).getUTCDay() || 7,
			start: "19:00",
			end: "20:30",
			venue: "Fictional pool",
		},
		rsvp: { ...defaultProgramRsvp(), openDays: 7 },
	};
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft,
			expectedRevision: 0,
			memberIds: [originalId, replacementId],
			requestId: crypto.randomUUID(),
		},
	});
	const initial = await owner.client.query(api.club.current, {});
	const event = initial?.data.events.find(
		(entry) => entry.program === draft.id,
	);
	assert(event?.seriesId);
	const seriesId = event.seriesId;
	await owner.client.mutation(api.session_series.configure, {
		seriesId,
		title: "Fictional limited roster",
		capacity: 1,
	});
	await owner.client.mutation(api.session_series.enroll, {
		seriesId,
		personId: originalId,
		start: tomorrow,
	});
	await assert.rejects(
		owner.client.mutation(api.session_series.enroll, {
			seriesId,
			personId: replacementId,
			start: tomorrow,
		}),
	);
	const enrolled = await owner.client.query(api.club.current, {});
	assert(
		enrolled?.data.responses
			.filter((row) => row.personId === originalId)
			.every((row) => row.seriesExpected),
	);
	assert.equal(
		enrolled?.data.responses.find(
			(row) => row.personId === originalId && row.eventId === event.id,
		)?.response,
		"going",
	);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft,
			expectedRevision: 1,
			memberIds: [replacementId],
			requestId: crypto.randomUUID(),
		},
	});
	const removed = await owner.client.query(api.club.current, {});
	assert(removed);
	const originalRows = removed.data.responses.filter(
		(row) => row.personId === originalId,
	);
	assert.equal(originalRows.length, 3);
	assert(
		originalRows.every(
			(row) =>
				!row.seriesExpected &&
				row.response !== "going" &&
				row.response !== "waiting",
		),
	);
	const series = await owner.client.query(api.session_series.detail, {
		seriesId,
	});
	assert.equal(
		series.series.enrollments.find((row) => row.personId === originalId)?.end,
		tomorrow,
	);
	await owner.client.mutation(api.session_series.enroll, {
		seriesId,
		personId: replacementId,
		start: tomorrow,
	});
	const program = removed.data.programs?.find((entry) => entry.id === draft.id);
	assert(program);
	await owner.client.mutation(api.club.apply, {
		action: {
			type: "save-program",
			draft: programDraft(program),
			expectedRevision: 2,
			memberIds: [originalId, replacementId],
			requestId: crypto.randomUUID(),
		},
	});
	await owner.client.mutation(api.session_series.configure, {
		seriesId,
		title: "Fictional limited roster",
		capacity: 1,
	});
	const restored = await owner.client.query(api.club.current, {});
	assert(restored);
	assert(
		restored.data.responses
			.filter((row) => row.personId === originalId)
			.every((row) => !row.seriesExpected),
	);
	assert(
		restored.data.responses
			.filter((row) => row.personId === replacementId)
			.every((row) => row.seriesExpected),
	);
	assert.equal(
		restored.data.responses.find(
			(row) => row.personId === replacementId && row.eventId === event.id,
		)?.response,
		"going",
	);
	assert.equal(
		(
			await owner.client.query(api.session_series.detail, { seriesId })
		).series.enrollments.find((row) => row.personId === originalId)?.end,
		tomorrow,
	);
	console.log(
		"Program-series checks passed: actual managed schedule, committed capacity, roster removal releases future reservations, original intervals retained, replacement enrollment succeeds and rejoining a program never reactivates old commitments.",
	);
};

const result = (await Promise.allSettled([verify()])).at(0);
const cleanup = (await Promise.allSettled([run.close()])).at(0);
if (result?.status === "rejected" && cleanup?.status === "rejected")
	throw new AggregateError(
		[result.reason, cleanup.reason],
		"Program-series verification and fixture cleanup failed.",
	);
if (result?.status === "rejected") throw result.reason;
if (cleanup?.status === "rejected") throw cleanup.reason;
