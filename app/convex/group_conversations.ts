import type { GroupDraft } from "../src/domain/group-conversation";
import {
	groupLimits,
	planGroupConversation,
	sameGroupCreation,
} from "../src/domain/group-conversation";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { checkContent } from "./chat_policy";
import { accountFor } from "./identity";

export const createGroupConversation = async (
	ctx: MutationCtx,
	actor: Doc<"memberships">,
	input: GroupDraft,
): Promise<string> => {
	const [memberships, people, blocks, restrictions] = await Promise.all([
		ctx.db
			.query("memberships")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.take(groupLimits.rows + 1),
		ctx.db
			.query("members")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.take(groupLimits.rows + 1),
		ctx.db
			.query("blocks")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.take(groupLimits.rows + 1),
		ctx.db
			.query("chatRestrictions")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.take(groupLimits.rows + 1),
	]);
	if (
		[memberships, people, blocks, restrictions].some(
			(rows) => rows.length > groupLimits.rows,
		)
	)
		throw new Error("The messaging directory is too large to load safely.");
	const plan = planGroupConversation(
		input,
		accountFor(actor),
		memberships.map(accountFor),
		people.map((row) => row.value),
		{
			pausedIds: restrictions.map((row) => row.userId),
			blockedPairs: blocks.map((row) => ({
				userId: row.userId,
				targetId: row.targetId,
			})),
		},
	);
	const existing = await ctx.db
		.query("conversations")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", plan.draft.groupId),
		)
		.unique();
	if (existing) {
		if (
			existing.groupCreatorId === actor.userId &&
			existing.value.accountIds.includes(actor.userId) &&
			existing.groupCreation &&
			sameGroupCreation(existing.groupCreation, plan.draft)
		)
			return existing.value.id;
		throw new Error(
			"That group identifier was already used for a different request.",
		);
	}
	await checkContent(ctx, actor, plan.draft.name);
	const recent = await ctx.db
		.query("conversations")
		.withIndex("by_group_creator", (q) =>
			q
				.eq("clubId", actor.clubId)
				.eq("groupCreatorId", actor.userId)
				.gt("_creationTime", Date.now() - 60000),
		)
		.take(groupLimits.perMinute);
	if (recent.length >= groupLimits.perMinute)
		throw new Error("You’re creating groups too quickly. Try again shortly.");
	await ctx.db.insert("conversations", {
		clubId: actor.clubId,
		groupCreatorId: actor.userId,
		groupCreation: {
			name: plan.draft.name,
			recipientIds: plan.draft.recipientIds,
		},
		pendingPersonIds: plan.pendingPersonIds,
		value: plan.conversation,
	});
	return plan.conversation.id;
};
