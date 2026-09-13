import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const claimPendingMessages = async (
	ctx: MutationCtx,
	membershipId: Id<"memberships">,
): Promise<void> => {
	const member = await ctx.db.get(membershipId);
	if (!member) throw new Error("Club membership unavailable.");
	const people = new Set([member.personId, ...member.children]);
	const conversations = await ctx.db
		.query("conversations")
		.withIndex("by_club", (q) => q.eq("clubId", member.clubId))
		.collect();
	for (const conversation of conversations.filter(
		(thread) =>
			(thread.pendingPersonId && people.has(thread.pendingPersonId)) ||
			thread.pendingPersonIds?.some((id) => people.has(id)) ||
			thread.value.accountIds.some(
				(id) => !ctx.db.normalizeId("users", id) && people.has(id),
			),
	)) {
		const alreadyIncluded = conversation.value.accountIds.includes(
			member.userId,
		);
		if (alreadyIncluded) continue;
		await ctx.db.patch(conversation._id, {
			pendingPersonId:
				conversation.pendingPersonId && people.has(conversation.pendingPersonId)
					? undefined
					: conversation.pendingPersonId,
			pendingPersonIds: conversation.pendingPersonIds?.filter(
				(id) => !people.has(id),
			),
			value: {
				...conversation.value,
				participantPersonIds: [
					...new Set([
						...(conversation.value.participantPersonIds ?? []),
						...conversation.value.accountIds.filter(
							(id) => !ctx.db.normalizeId("users", id) && people.has(id),
						),
					]),
				],
				accountIds: [
					...new Set([
						...conversation.value.accountIds.filter(
							(id) => ctx.db.normalizeId("users", id) || !people.has(id),
						),
						member.userId,
					]),
				],
			},
		});
		const read = await ctx.db
			.query("conversationReads")
			.withIndex("by_user_thread", (q) =>
				q.eq("userId", member.userId).eq("threadId", conversation.value.id),
			)
			.unique();
		if (!read)
			await ctx.db.insert("conversationReads", {
				clubId: member.clubId,
				userId: member.userId,
				threadId: conversation.value.id,
				through: 0,
			});
	}
};
