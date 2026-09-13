import { generalConversation } from "../src/domain/general-chat";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { resolveSessionThread } from "./session_discussion";

const clubAccounts = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
): Promise<string[]> =>
	(
		await ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", clubId))
			.collect()
	).map((member) => member.userId);
export const resolveClubThread = async (
	ctx: QueryCtx,
	thread: Doc<"conversations">,
): Promise<Doc<"conversations">> =>
	thread.value.id === "club"
		? {
				...thread,
				value: generalConversation(
					await clubAccounts(ctx, thread.clubId),
					thread.value,
				),
			}
		: resolveSessionThread(ctx, thread);
export const ensureGeneralChat = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
): Promise<string> => {
	const existing = await ctx.db
		.query("conversations")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", "club"),
		)
		.unique();
	const value = generalConversation(
		await clubAccounts(ctx, clubId),
		existing?.value,
	);
	if (!existing) await ctx.db.insert("conversations", { clubId, value });
	else if (JSON.stringify(existing.value) !== JSON.stringify(value))
		await ctx.db.patch(existing._id, { value });
	return "club";
};
