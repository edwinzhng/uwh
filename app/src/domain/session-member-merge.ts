import type { ClubEvent, TeamPlan } from "./app-types";
import { clubTimestamp } from "./event-time";
import type { FitnessState } from "./fitness-model";
import type { MemberMergeConflict, MemberMergeCount } from "./member-merge";
import type { SessionCheckIn } from "./session-checkins";
import {
	performanceMemberMergeConflicts,
	type SessionPerformance,
} from "./session-performance";
import type { SeriesEnrollment, SessionSeries } from "./session-series";

export const lineupMemberIds = (plan: TeamPlan): string[] => [
	...plan.black,
	...plan.white,
	...(plan.blackBench ?? []),
	...(plan.whiteBench ?? []),
	...plan.attendees,
	...(plan.excludedPersonIds ?? []),
	...(plan.assignments?.map((entry) => entry.personId) ?? []),
	...(plan.fieldSlots?.map((entry) => entry.personId) ?? []),
	...(plan.rotationSlots?.map((entry) => entry.personId) ?? []),
	...(plan.referees?.map((entry) => entry.personId) ?? []),
	...(plan.captains?.map((entry) => entry.personId) ?? []),
];
export const lineupMemberMergeConflicts = (
	plans: readonly TeamPlan[],
	sourceId: string,
	targetId: string,
): MemberMergeConflict[] =>
	plans.flatMap((plan) => {
		const ids = lineupMemberIds(plan);
		return ids.includes(sourceId) && ids.includes(targetId)
			? [
					{
						category: "Lineups",
						record: `${plan.eventId}${plan.partId ? ` · ${plan.partId}` : ""}`,
						reason:
							"Both profiles occur in this lineup, its bench, exclusions or referee slots.",
						resolution:
							"Review the original lineup and resolve the duplicate roles before merging.",
					},
				]
			: [];
	});
export const relinkLineupMember = (
	plan: TeamPlan,
	sourceId: string,
	targetId: string,
	completed = false,
): TeamPlan => {
	if (!lineupMemberIds(plan).includes(sourceId)) return plan;
	if (lineupMemberMergeConflicts([plan], sourceId, targetId).length)
		throw new Error("Resolve the lineup collision before merging.");
	const person = (personId: string): string =>
		personId === sourceId ? targetId : personId;
	return {
		...plan,
		black: plan.black.map(person),
		white: plan.white.map(person),
		blackBench: plan.blackBench?.map(person),
		whiteBench: plan.whiteBench?.map(person),
		attendees: plan.attendees.map(person),
		excludedPersonIds: plan.excludedPersonIds?.map(person),
		assignments: plan.assignments?.map((entry) => ({
			...entry,
			personId: person(entry.personId),
		})),
		fieldSlots: plan.fieldSlots?.map((entry) => ({
			...entry,
			personId: person(entry.personId),
		})),
		rotationSlots: plan.rotationSlots?.map((entry) => ({
			...entry,
			personId: person(entry.personId),
		})),
		captains: plan.captains?.map((entry) => ({
			...entry,
			personId: entry.personId === sourceId ? targetId : entry.personId,
		})),
		referees: plan.referees?.map((entry) => ({
			...entry,
			personId: person(entry.personId),
		})),
		published: completed ? plan.published : false,
		coachingStale: completed ? plan.coachingStale : true,
		revision: (plan.revision ?? 0) + 1,
	};
};
export const completedLineupEvent = (
	event: ClubEvent | undefined,
	now: number,
): boolean =>
	Boolean(
		event &&
			clubTimestamp(event.endDate ?? event.date, event.end, event.timeZone) <=
				now,
	);
const overlap = (left: SeriesEnrollment, right: SeriesEnrollment): boolean =>
	(left.end === undefined || left.end > left.start) &&
	(right.end === undefined || right.end > right.start) &&
	(left.end === undefined || right.start < left.end) &&
	(right.end === undefined || left.start < right.end);
export const seriesMemberMergeConflicts = (
	series: readonly SessionSeries[],
	sourceId: string,
	targetId: string,
): MemberMergeConflict[] =>
	series.flatMap((entry) => {
		const source = entry.enrollments.filter(
			(enrollment) => enrollment.personId === sourceId,
		);
		const target = entry.enrollments.filter(
			(enrollment) => enrollment.personId === targetId,
		);
		return source.some((left) => target.some((right) => overlap(left, right)))
			? [
					{
						category: "Committed rosters",
						record: entry.title,
						reason:
							"Both profiles have overlapping enrollments in this series.",
						resolution:
							"Review the enrollment dates and preserve separate, non-overlapping intervals before merging.",
					},
				]
			: [];
	});
export const relinkSeriesMember = (
	series: SessionSeries,
	sourceId: string,
	targetId: string,
): SessionSeries => {
	if (seriesMemberMergeConflicts([series], sourceId, targetId).length)
		throw new Error("Resolve the enrollment collision before merging.");
	return {
		...series,
		enrollments: series.enrollments.map((entry) =>
			entry.personId === sourceId ? { ...entry, personId: targetId } : entry,
		),
	};
};
export const sessionCheckinMergeConflicts = (
	entries: readonly Pick<SessionCheckIn, "eventId" | "personId">[],
	sourceId: string,
	targetId: string,
): MemberMergeConflict[] =>
	entries
		.filter((entry) => entry.personId === sourceId)
		.flatMap((entry) =>
			entries.some(
				(other) =>
					other.personId === targetId && other.eventId === entry.eventId,
			)
				? [
						{
							category: "Private energy check-ins",
							record: entry.eventId,
							reason:
								"Both profiles have a private energy check-in for this session.",
							resolution:
								"Review the duplicate session records before merging; neither private note will be overwritten.",
						},
					]
				: [],
		);
export const fitnessMemberMergeConflicts = (
	results: FitnessState["results"],
	sourceId: string,
	targetId: string,
): MemberMergeConflict[] =>
	results
		.filter((result) => result.personId === sourceId)
		.flatMap((result) =>
			results.some(
				(other) =>
					other.personId === targetId && other.sessionId === result.sessionId,
			)
				? [
						{
							category: "Fitness results",
							record: result.date,
							reason:
								"Both profiles have a result in the same fitness session.",
							resolution:
								"Review the original result entries before merging; no result will be overwritten or deleted.",
						},
					]
				: [],
		);
export type SessionMemberMergeData = {
	events?: ClubEvent[];
	teams: TeamPlan[];
	series: SessionSeries[];
	checkins: SessionCheckIn[];
	fitness: FitnessState;
	performance?: SessionPerformance[];
};
export const planSessionMemberPreview = (
	data: SessionMemberMergeData,
	sourceId: string,
	targetId: string,
	now = Date.now(),
): {
	next: SessionMemberMergeData;
	conflicts: MemberMergeConflict[];
	counts: MemberMergeCount[];
} => {
	const affectedTeams = data.teams.filter((plan) =>
		lineupMemberIds(plan).includes(sourceId),
	);
	const completed = new Set(
		affectedTeams
			.filter((plan) =>
				completedLineupEvent(
					data.events?.find((event) => event.id === plan.eventId),
					now,
				),
			)
			.map((plan) => plan.eventId),
	);
	const affectedSeries = data.series.filter((entry) =>
		entry.enrollments.some((enrollment) => enrollment.personId === sourceId),
	);
	const results = data.fitness.results.filter(
		(entry) => entry.personId === sourceId,
	);
	const sessionIds = new Set(results.map((entry) => entry.sessionId));
	const conflicts = [
		...lineupMemberMergeConflicts(data.teams, sourceId, targetId),
		...seriesMemberMergeConflicts(data.series, sourceId, targetId),
		...sessionCheckinMergeConflicts(data.checkins, sourceId, targetId),
		...fitnessMemberMergeConflicts(data.fitness.results, sourceId, targetId),
		...performanceMemberMergeConflicts(
			data.performance ?? [],
			sourceId,
			targetId,
		),
	];
	const counts = [
		{
			label: "Lineups relinked and unpublished",
			count: affectedTeams.filter((plan) => !completed.has(plan.eventId))
				.length,
		},
		{
			label: "Completed lineups relinked with publication preserved",
			count: affectedTeams.filter((plan) => completed.has(plan.eventId)).length,
		},
		{
			label: "Private energy check-ins relinked",
			count: data.checkins.filter((entry) => entry.personId === sourceId)
				.length,
		},
		{
			label: "Committed roster enrollments relinked",
			count: affectedSeries.reduce(
				(count, entry) =>
					count +
					entry.enrollments.filter(
						(enrollment) => enrollment.personId === sourceId,
					).length,
				0,
			),
		},
		{ label: "Fitness results relinked", count: results.length },
		{ label: "Fitness sessions refreshed", count: sessionIds.size },
		{
			label: "Fitness summaries rebuilt",
			count: new Set(
				results.map((entry) => JSON.stringify([entry.testId, entry.seasonId])),
			).size,
		},
		{
			label: "Session performance ratings relinked",
			count:
				data.performance?.filter((entry) => entry.personId === sourceId)
					.length ?? 0,
		},
	];
	return {
		conflicts,
		counts,
		next: conflicts.length
			? data
			: {
					events: data.events,
					teams: data.teams.map((plan) =>
						relinkLineupMember(
							plan,
							sourceId,
							targetId,
							completed.has(plan.eventId),
						),
					),
					series: data.series.map((entry) =>
						relinkSeriesMember(entry, sourceId, targetId),
					),
					checkins: data.checkins.map((entry) =>
						entry.personId === sourceId
							? { ...entry, personId: targetId }
							: entry,
					),
					fitness: {
						...data.fitness,
						results: data.fitness.results.map((entry) =>
							entry.personId === sourceId
								? { ...entry, personId: targetId }
								: entry,
						),
						sessions: data.fitness.sessions.map((entry) =>
							sessionIds.has(entry._id)
								? { ...entry, revision: entry.revision + 1 }
								: entry,
						),
					},
					performance: data.performance?.map((entry) =>
						entry.personId === sourceId
							? { ...entry, personId: targetId, revision: entry.revision + 1 }
							: entry,
					),
				},
	};
};
