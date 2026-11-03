import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const removeAnnouncement = async (
	ctx: MutationCtx,
	row: Doc<"chatAnnouncements">,
): Promise<void> => {
	for (const ack of await ctx.db
		.query("chatAnnouncementAcks")
		.withIndex("by_announcement", (q) => q.eq("announcementId", row._id))
		.collect())
		await ctx.db.delete(ack._id);
	await ctx.db.delete(row._id);
};
export const eraseMessageAnnouncement = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	messageId: string,
): Promise<void> => {
	const row = await ctx.db
		.query("chatAnnouncements")
		.withIndex("by_message", (q) =>
			q.eq("clubId", clubId).eq("messageId", messageId),
		)
		.unique();
	if (row) await removeAnnouncement(ctx, row);
};
export const eraseChatAnnouncements = async (
	ctx: MutationCtx,
	input: { userId: Id<"users">; clubId?: Id<"clubs">; removeClub: boolean },
): Promise<void> => {
	for (const ack of await ctx.db
		.query("chatAnnouncementAcks")
		.withIndex("by_user", (q) => q.eq("userId", input.userId))
		.collect())
		await ctx.db.delete(ack._id);
	const clubId = input.clubId;
	if (!clubId) return;
	for (const row of await ctx.db
		.query("chatAnnouncements")
		.withIndex("by_club", (q) => q.eq("clubId", clubId))
		.collect()) {
		if (input.removeClub) await removeAnnouncement(ctx, row);
		else if (
			row.createdBy === input.userId ||
			row.acknowledgedBy.includes(input.userId)
		)
			await ctx.db.patch(row._id, {
				createdBy: row.createdBy === input.userId ? undefined : row.createdBy,
				acknowledgedBy: row.acknowledgedBy.filter((id) => id !== input.userId),
			});
	}
};
