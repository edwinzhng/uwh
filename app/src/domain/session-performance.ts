import { canCoachMember, canManagePerson, canReadProgress } from "./app-rules";
import type { Account, ClubEvent, Member } from "./app-types";
import { mergeCollision } from "./core-member-merge";
import { canRegister } from "./event-eligibility";
import { practiceEvent } from "./event-types";
import type { MemberMergeConflict } from "./member-merge";

export type SessionPerformanceKind = "coach" | "self";
export type SessionPerformance = {
	id: string;
	personId: string;
	eventId: string;
	sessionNumber?: number;
	eventTitle: string;
	eventDate: string;
	dateKind?: "recorded";
	programId: string;
	kind: SessionPerformanceKind;
	authorId: string;
	authorName: string;
	rating: number;
	comments: string;
	revision: number;
	updatedAt: number;
	removed?: boolean;
};
export type SessionPerformanceEntry = SessionPerformance & {
	canEdit: boolean;
	canReport: boolean;
};
export type SessionPerformanceCommand = Pick<
	SessionPerformance,
	"personId" | "eventId" | "kind" | "rating" | "comments" | "revision"
> & { requestId: string };
export type PerformanceSession = Pick<ClubEvent, "id" | "title" | "date"> & {
	sessionNumber?: number;
};
export const performanceSession = (event: ClubEvent): PerformanceSession => ({
	id: event.id,
	title: event.title,
	date: event.date,
	sessionNumber:
		event.seriesId &&
		event.seriesOrder !== undefined &&
		Number.isInteger(event.seriesOrder) &&
		event.seriesOrder >= 0
			? event.seriesOrder + 1
			: undefined,
});
export const performanceSessionEligible = (
	member: Member,
	event: ClubEvent,
): boolean =>
	practiceEvent(event) &&
	!event.cancelled &&
	canRegister(member, event) &&
	(event.eligiblePersonIds !== undefined ||
		event.program === "all" ||
		member.programs.includes(event.program));
export const canReadSessionPerformance = (
	actor: Account,
	person: Member,
	kind?: SessionPerformanceKind,
): boolean =>
	!person.mergedInto &&
	canReadProgress(actor, person) &&
	(kind !== "coach" || canCoachMember(actor, person));
export const sessionPerformanceHistory = (
	entries: readonly SessionPerformance[],
	actor: Account,
	person: Member | undefined,
	kind?: SessionPerformanceKind,
): SessionPerformance[] =>
	person && canReadSessionPerformance(actor, person)
		? entries
				.filter(
					(entry) =>
						entry.personId === person.id &&
						!entry.removed &&
						canReadSessionPerformance(actor, person, entry.kind) &&
						(!kind || entry.kind === kind),
				)
				.sort(
					(left, right) =>
						right.eventDate.localeCompare(left.eventDate) ||
						right.updatedAt - left.updatedAt,
				)
		: [];
export const canWriteSessionPerformance = (
	actor: Account,
	person: Member,
	kind: SessionPerformanceKind,
): boolean =>
	!person.archived &&
	!person.mergedInto &&
	(kind === "coach"
		? canCoachMember(actor, person)
		: canManagePerson(actor, person.id));
export const canEditSessionPerformance = (
	actor: Account,
	person: Member,
	event: ClubEvent | undefined,
	entry: SessionPerformance,
): boolean =>
	Boolean(
		!entry.removed &&
			entry.dateKind !== "recorded" &&
			event &&
			performanceSessionEligible(person, event) &&
			canWriteSessionPerformance(actor, person, entry.kind) &&
			(entry.kind === "self" || entry.authorId === actor.id),
	);
export const canReportSessionPerformance = (
	actor: Account,
	person: Member,
	entry: SessionPerformance,
): boolean =>
	!entry.removed &&
	entry.kind === "coach" &&
	entry.authorId !== actor.id &&
	canReadSessionPerformance(actor, person, entry.kind);
export const validateSessionPerformance = (
	command: Pick<SessionPerformanceCommand, "eventId" | "rating" | "comments">,
): string | undefined =>
	!command.eventId
		? "Choose a session."
		: !Number.isInteger(command.rating) ||
				command.rating < 1 ||
				command.rating > 10
			? "Choose a whole-number rating from 1–10"
			: command.comments.length > 2000
				? "Keep comments to 2,000 characters"
				: undefined;
export const sessionPerformanceAuthorKey = (
	kind: SessionPerformanceKind,
	authorId: string,
): string => (kind === "self" ? "self" : authorId);
export const sessionPerformancePayload = (
	command: SessionPerformanceCommand,
): string =>
	JSON.stringify({
		personId: command.personId,
		eventId: command.eventId,
		kind: command.kind,
		rating: command.rating,
		comments: command.comments.trim(),
	});
export const nextSessionPerformance = (
	current: SessionPerformance | undefined,
	command: SessionPerformanceCommand,
	actor: Account,
	event: ClubEvent,
	id: string,
	now: number,
): SessionPerformance => {
	if (current?.dateKind === "recorded")
		throw new Error(
			"This imported rating has no linked practice and is read-only.",
		);
	const error = validateSessionPerformance(command);
	if (error) throw new Error(error);
	if ((current?.revision ?? 0) !== command.revision)
		throw new Error(
			"This session rating changed. Review the saved version before editing; your draft is kept.",
		);
	return {
		id: current?.id ?? id,
		personId: command.personId,
		eventId: command.eventId,
		sessionNumber: current
			? current.sessionNumber
			: performanceSession(event).sessionNumber,
		eventTitle: current?.eventTitle ?? event.title,
		eventDate: current?.eventDate ?? event.date,
		programId: current?.programId ?? event.program,
		kind: command.kind,
		authorId: actor.id,
		authorName: actor.name,
		rating: command.rating,
		comments: command.comments.trim(),
		revision: (current?.revision ?? 0) + 1,
		updatedAt: now,
	};
};
export const performanceMemberMergeConflicts = (
	entries: readonly Pick<
		SessionPerformance,
		"personId" | "eventId" | "kind" | "authorId"
	>[],
	sourceId: string,
	targetId: string,
): MemberMergeConflict[] =>
	entries
		.filter((row) => row.personId === sourceId)
		.flatMap((row) =>
			entries.some(
				(other) =>
					other.personId === targetId &&
					other.eventId === row.eventId &&
					other.kind === row.kind &&
					sessionPerformanceAuthorKey(other.kind, other.authorId) ===
						sessionPerformanceAuthorKey(row.kind, row.authorId),
			)
				? [
						mergeCollision(
							"Session performance",
							row.eventId,
							"Both profiles have the same self-rating or coach’s rating for this session.",
							"Review the original session ratings before merging; no rating or comment will be overwritten or removed.",
						),
					]
				: [],
		);
