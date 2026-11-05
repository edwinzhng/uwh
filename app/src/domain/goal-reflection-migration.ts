import { clubDate } from "./event-time";
import type { GoalReflection } from "./goal-reflections";
import { goalCategoryLabel } from "./goals";

export const migratedGoalEventId = (id: string): string =>
	`goal-reflection:${id}`;
export const migratedGoalReflection = <
	ClubId extends string,
	AuthorId extends string,
>(
	source: GoalReflection & { clubId: ClubId; authorId: AuthorId },
	timeZone: string,
	authorName: string,
): {
	clubId: ClubId;
	personId: string;
	eventId: string;
	eventTitle: string;
	eventDate: string;
	dateKind: "recorded";
	programId: string;
	kind: "self";
	authorKey: string;
	authorId: AuthorId;
	authorName: string;
	rating: number;
	comments: string;
	revision: number;
	updatedAt: number;
} => ({
	clubId: source.clubId,
	personId: source.personId,
	eventId: migratedGoalEventId(source.id),
	eventTitle: "Goal reflection",
	eventDate: clubDate(source.createdAt, timeZone),
	dateKind: "recorded",
	programId: "all",
	kind: "self",
	authorKey: "self",
	authorId: source.authorId,
	authorName,
	rating: source.selfRating * 2,
	comments: [
		`Goal: ${source.goal}`,
		source.goalDetails ? goalCategoryLabel(source.goalDetails) : undefined,
		source.goalDetails?.remarks,
		source.note,
		`Original rating: ${source.selfRating}/5`,
		`Check-in ${source.checkIn}`,
	]
		.filter(Boolean)
		.join("\n\n"),
	revision: 1,
	updatedAt: source.createdAt,
});
