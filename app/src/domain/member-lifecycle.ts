import type { Member } from "./app-types";
import type { SessionSeries } from "./session-series";

export const setMemberArchived = (
	member: Member,
	archived: boolean,
	date: string,
): Member => ({
	...member,
	archived,
	archivedAt: archived ? date : member.archivedAt,
});

export const endMemberEnrollments = (
	series: SessionSeries,
	personId: string,
	date: string,
): SessionSeries => ({
	...series,
	enrollments: series.enrollments.map((entry) =>
		entry.personId === personId && (!entry.end || entry.end > date)
			? { ...entry, end: entry.start > date ? entry.start : date }
			: entry,
	),
});
