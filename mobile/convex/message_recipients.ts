import {
	type RecipientDirectory,
	recipientDirectory,
} from "../src/domain/message-recipients";
import { query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { blockedIds } from "./moderation";

export const directory = query({
	args: {},
	handler: async (ctx): Promise<RecipientDirectory> => {
		const actor = await requireMember(ctx);
		const [memberships, players, blocked, restrictions] = await Promise.all([
			ctx.db
				.query("memberships")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.collect(),
			ctx.db
				.query("members")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.collect(),
			blockedIds(ctx, actor.userId),
			ctx.db
				.query("chatRestrictions")
				.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
				.collect(),
		]);
		return recipientDirectory(
			memberships.map(accountFor),
			players.map((row) => row.value),
			actor.userId,
			[...blocked, ...restrictions.map((row) => row.userId)],
			restrictions.some((row) => row.userId === actor.userId),
		);
	},
});
