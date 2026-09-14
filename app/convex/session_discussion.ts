import { canDiscussSession } from "../src/domain/session-discussion";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { accountFor } from "./identity";

export const sessionAccounts = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	eventId: string,
): Promise<string[]> => {
	const [event, memberships, people] = await Promise.all([
		ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", eventId),
			)
			.unique(),
		ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect(),
		ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect(),
	]);
	if (!event) return [];
	return memberships
		.filter((member) =>
			canDiscussSession(
				accountFor(member),
				event.value,
				people.map((person) => person.value),
			),
		)
		.map((member) => member.userId);
};
export const resolveSessionThread = async (
	ctx: QueryCtx,
	thread: Doc<"conversations">,
): Promise<Doc<"conversations">> =>
	thread.value.eventId
		? {
				...thread,
				value: {
					...thread.value,
					accountIds: await sessionAccounts(
						ctx,
						thread.clubId,
						thread.value.eventId,
					),
				},
			}
		: thread;
