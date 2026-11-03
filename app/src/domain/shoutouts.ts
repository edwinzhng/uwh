import type { Account, CoachingFeedback, Member } from "./app-types";
import { feedbackKind } from "./feedback-access";

export const shoutoutCategories = [
	{ value: "mvp", label: "MVP of the session" },
	{ value: "above_usual", label: "Played above their usual level" },
	{ value: "stood_out", label: "Really stood out" },
	{ value: "great_session", label: "Had a great session" },
] as const;
export type ShoutoutCategory = (typeof shoutoutCategories)[number]["value"];
export type ClubShoutout = CoachingFeedback & { personName: string };
export const shoutoutLabel = (category?: ShoutoutCategory): string =>
	shoutoutCategories.find((entry) => entry.value === category)?.label ??
	"Club shoutout";
export const publicFeedback = (entry: CoachingFeedback): CoachingFeedback =>
	feedbackKind(entry) === "shoutout"
		? { ...entry, authorId: "anonymous", authorName: undefined }
		: entry;

export const shoutoutRecipientIds = (
	account: Pick<Account, "personId" | "children">,
	personId?: string,
): string[] => {
	const owned = [...new Set([account.personId, ...account.children])];
	return personId ? owned.filter((id) => id === personId) : owned;
};

export const clubShoutoutPreview = (
	entries: readonly CoachingFeedback[],
	members: readonly Pick<Member, "id" | "name">[],
	account: Pick<Account, "personId" | "children">,
	personId?: string,
): ClubShoutout[] =>
	entries
		.filter(
			(entry) =>
				feedbackKind(entry) === "shoutout" &&
				entry.visibility === "published" &&
				shoutoutRecipientIds(account, personId).includes(entry.personId),
		)
		.sort(
			(left, right) =>
				right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
		)
		.map((entry) => ({
			...publicFeedback(entry),
			personName:
				members.find((person) => person.id === entry.personId)?.name ??
				"Former player",
		}));
export const shoutoutSummary = (
	entries: CoachingFeedback[],
): { category: ShoutoutCategory; label: string; count: number }[] =>
	shoutoutCategories
		.map(({ value, label }) => ({
			category: value,
			label,
			count: entries.filter(
				(entry) =>
					feedbackKind(entry) === "shoutout" &&
					entry.visibility === "published" &&
					entry.category === value,
			).length,
		}))
		.filter((entry) => entry.count > 0);
