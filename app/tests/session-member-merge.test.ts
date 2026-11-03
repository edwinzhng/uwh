import { expect, test } from "bun:test";
import type { ClubEvent, TeamPlan } from "../src/domain/app-types";
import { clubTimestamp } from "../src/domain/event-time";
import { fitnessSummary } from "../src/domain/fitness-model";
import {
	lineupSnapshot,
	normalizeLineup,
	validateLineup,
} from "../src/domain/lineup";
import {
	lineupMemberIds,
	lineupMemberMergeConflicts,
	planSessionMemberPreview,
	relinkLineupMember,
	relinkSeriesMember,
	type SessionMemberMergeData,
	seriesMemberMergeConflicts,
} from "../src/domain/session-member-merge";
import type { SessionSeries } from "../src/domain/session-series";

const sourceId = "duplicate";
const targetId = "canonical";
const plan: TeamPlan = {
	...normalizeLineup({
		eventId: "practice",
		black: [sourceId],
		white: ["another"],
		attendees: [sourceId, "another", "excluded"],
		excludedPersonIds: ["excluded"],
		published: true,
		revision: 4,
		assignments: [sourceId, "another"].map((personId) => ({
			personId,
			position: "FORWARD",
			ageGroup: "adult",
		})),
	}),
	referees: [{ side: "white", personId: sourceId }],
};
const series: SessionSeries = {
	id: "weekly",
	seriesIds: ["weekly"],
	title: "Weekly practice",
	enrollments: [
		{
			personId: sourceId,
			start: "2026-09-01",
			end: "2026-10-01",
			state: "committed",
		},
		{ personId: targetId, start: "2026-10-01", state: "committed" },
	],
};

test("rotation member identity relinking preserves slot intent and includes its collision boundary", (): void => {
	const rotationPlan: TeamPlan = {
		...plan,
		blackBench: ["reserve"],
		attendees: [...plan.attendees, "reserve"],
		rotationSlots: [{ personId: "reserve", slot: 0 }],
		assignments: [
			...(plan.assignments ?? []),
			{ personId: "reserve", position: "FORWARD", ageGroup: "adult" },
		],
	};
	const relinked = relinkLineupMember(
		rotationPlan,
		"reserve",
		"canonical-reserve",
	);
	expect(relinked.rotationSlots).toEqual([
		{ personId: "canonical-reserve", slot: 0 },
	]);
	expect(relinked.blackBench).toEqual(["canonical-reserve"]);
	expect(validateLineup(relinked, lineupSnapshot(relinked))).toBeUndefined();
	expect(
		lineupMemberMergeConflicts(
			[{ ...rotationPlan, rotationSlots: [{ personId: targetId, slot: 0 }] }],
			sourceId,
			targetId,
		),
	).toHaveLength(1);
});
const data: SessionMemberMergeData = {
	teams: [plan],
	series: [series],
	checkins: [
		{
			eventId: "practice",
			personId: sourceId,
			energy: 3,
			note: "Private original note",
			updatedAt: 42,
		},
	],
	fitness: {
		tests: [
			{ _id: "swim", name: "Swim", unit: "time", archived: false, revision: 0 },
		],
		sessions: ["old", "new"].map((_id, index) => ({
			_id,
			testId: "swim",
			seasonId: "season",
			date: `2026-10-0${index + 1}`,
			notes: "",
			resultCount: 1,
			revision: 2,
		})),
		results: [
			{
				testId: "swim",
				sessionId: "old",
				seasonId: "season",
				personId: sourceId,
				date: "2026-10-01",
				value: 95,
				notes: "Original result",
			},
			{
				testId: "swim",
				sessionId: "new",
				seasonId: "season",
				personId: targetId,
				date: "2026-10-02",
				value: 90,
				notes: "Canonical result",
			},
		],
	},
};

test("lineup relinking preserves slots, cohorts, referee roles and history while invalidating publication with a new revision", (): void => {
	const before = structuredClone(plan);
	const next = relinkLineupMember(plan, sourceId, targetId);
	expect(plan).toEqual(before);
	expect(lineupMemberIds(next)).not.toContain(sourceId);
	expect(next.black).toContain(targetId);
	expect(next.fieldSlots?.find((entry) => entry.personId === targetId)).toEqual(
		{ personId: targetId, slot: 0 },
	);
	expect(next.referees).toEqual([{ side: "white", personId: targetId }]);
	expect(
		next.assignments?.find((entry) => entry.personId === targetId)?.ageGroup,
	).toBe("adult");
	expect(next.excludedPersonIds).toEqual(["excluded"]);
	expect(next.revision).toBe(5);
	expect(next.published).toBe(false);
	expect(next.coachingStale).toBe(true);
	expect(validateLineup(next, lineupSnapshot(next))).toBeUndefined();
});

test("all lineup co-occurrences including auxiliary referees and exclusions block rather than silently collapse roles", (): void => {
	for (const collision of [
		{ ...plan, white: [targetId], attendees: [sourceId, targetId] },
		{ ...plan, referees: [{ side: "black" as const, personId: targetId }] },
		{ ...plan, excludedPersonIds: [targetId] },
	]) {
		expect(
			lineupMemberMergeConflicts([collision], sourceId, targetId),
		).toHaveLength(1);
		expect(() => relinkLineupMember(collision, sourceId, targetId)).toThrow(
			"collision",
		);
	}
});

test("completed whole and part lineups keep their publication history while active or missing-event lineups fail closed", (): void => {
	const event: ClubEvent = {
		id: "practice",
		date: "2026-10-25",
		title: "Practice",
		start: "19:00",
		end: "21:00",
		venue: "Pool",
		kind: "hockey",
		program: "club",
		cancelled: false,
		signup: "closed",
		description: "",
	};
	const now = clubTimestamp(event.date, event.end);
	const history = planSessionMemberPreview(
		{ ...data, events: [event], teams: [plan, { ...plan, partId: "hockey" }] },
		sourceId,
		targetId,
		now,
	);
	expect(history.conflicts).toEqual([]);
	expect(
		history.next.teams.every(
			(entry) =>
				entry.published && !entry.coachingStale && entry.revision === 5,
		),
	).toBe(true);
	expect(
		history.counts.find(
			(entry) =>
				entry.label === "Completed lineups relinked with publication preserved",
		)?.count,
	).toBe(2);
	const active = planSessionMemberPreview(
		{ ...data, events: [{ ...event, end: "22:00" }] },
		sourceId,
		targetId,
		now,
	);
	expect(active.next.teams.at(0)).toMatchObject({
		published: false,
		coachingStale: true,
		revision: 5,
	});
	const missing = planSessionMemberPreview(
		{ ...data, events: [] },
		sourceId,
		targetId,
		now,
	);
	expect(missing.next.teams.at(0)).toMatchObject({
		published: false,
		coachingStale: true,
		revision: 5,
	});
	const overnight = planSessionMemberPreview(
		{ ...data, events: [{ ...event, endDate: "2026-10-26" }] },
		sourceId,
		targetId,
		now,
	);
	expect(overnight.next.teams.at(0)?.published).toBe(false);
});

test("series relinking preserves disjoint and empty historical ranges and rejects overlapping commitments", (): void => {
	expect(seriesMemberMergeConflicts([series], sourceId, targetId)).toEqual([]);
	const next = relinkSeriesMember(series, sourceId, targetId);
	expect(next.enrollments).toEqual(
		series.enrollments.map((entry) => ({ ...entry, personId: targetId })),
	);
	const empty = {
		...series,
		enrollments: [
			{
				personId: sourceId,
				start: "2026-10-01",
				end: "2026-10-01",
				state: "committed" as const,
			},
			...series.enrollments.filter((entry) => entry.personId === targetId),
		],
	};
	expect(seriesMemberMergeConflicts([empty], sourceId, targetId)).toEqual([]);
	const collision = {
		...series,
		enrollments: series.enrollments.map((entry) =>
			entry.personId === sourceId ? { ...entry, end: "2026-10-02" } : entry,
		),
	};
	expect(
		seriesMemberMergeConflicts([collision], sourceId, targetId),
	).toHaveLength(1);
	expect(() => relinkSeriesMember(collision, sourceId, targetId)).toThrow(
		"collision",
	);
});

test("preview uses the same preflight and preserves private note/result contents while refreshing affected result editors", (): void => {
	const before = structuredClone(data);
	const result = planSessionMemberPreview(data, sourceId, targetId);
	expect(result.conflicts).toEqual([]);
	expect(data).toEqual(before);
	expect(result.next.checkins.at(0)).toEqual({
		eventId: "practice",
		personId: targetId,
		energy: 3,
		note: "Private original note",
		updatedAt: 42,
	});
	expect(result.next.fitness.results).toEqual(
		data.fitness.results.map((entry) => ({ ...entry, personId: targetId })),
	);
	expect(result.next.fitness.sessions.at(0)?.revision).toBe(3);
	expect(result.next.fitness.sessions.at(1)?.revision).toBe(2);
	expect(result.next.fitness.sessions.at(0)?.resultCount).toBe(1);
	expect(
		result.counts.find((entry) => entry.label === "Fitness summaries rebuilt")
			?.count,
	).toBe(1);
	expect(fitnessSummary("time", result.next.fitness.results)).toEqual({
		count: 2,
		total: 185,
		best: 90,
	});
});

test("session or fitness natural-key collisions block every preview relink without deleting either history", (): void => {
	const checkinCollision = {
		...data,
		checkins: [
			...data.checkins,
			{
				...data.checkins.at(0),
				eventId: "practice",
				personId: targetId,
				energy: 5,
				note: "Different note",
				updatedAt: 43,
			},
		],
	};
	const checkin = planSessionMemberPreview(
		checkinCollision,
		sourceId,
		targetId,
	);
	expect(checkin.conflicts.at(0)?.category).toBe("Private energy check-ins");
	expect(checkin.next).toBe(checkinCollision);
	const fitnessCollision = {
		...data,
		fitness: {
			...data.fitness,
			results: data.fitness.results.map((entry) => ({
				...entry,
				sessionId: "old",
			})),
		},
	};
	const fitness = planSessionMemberPreview(
		fitnessCollision,
		sourceId,
		targetId,
	);
	expect(fitness.conflicts.at(0)?.category).toBe("Fitness results");
	expect(fitness.next).toBe(fitnessCollision);
	expect(fitness.next.fitness.results).toHaveLength(2);
});
