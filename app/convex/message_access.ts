import type { Message } from "../src/domain/app-types";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export const messageFor = (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	messageId: string,
): Promise<Doc<"messages"> | null> =>
	ctx.db
		.query("messages")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", messageId),
		)
		.unique();

import { resolveClubThread } from "./general_chat";

export const threadFor = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	threadId: string,
): Promise<Doc<"conversations"> | null> => {
	const thread = await ctx.db
		.query("conversations")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", threadId),
		)
		.unique();
	return thread ? resolveClubThread(ctx, thread) : null;
};

export const visibleMessage = (
	message: Message,
	blocked: string[],
): Message => ({
	...message,
	reactions: message.reactions
		?.map((reaction) => ({
			...reaction,
			accountIds: reaction.accountIds.filter((id) => !blocked.includes(id)),
		}))
		.filter((reaction) => reaction.accountIds.length > 0),
});
