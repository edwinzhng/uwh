import { v } from "convex/values";
import { addDays } from "../src/domain/calendar-dates";
import {
	type ChatPractice,
	chatProgramId,
	isUpcomingPractice,
} from "../src/domain/chat-practice";
import { clubDate } from "../src/domain/event-time";
import { query } from "./_generated/server";
import { eventRows } from "./action_data";
import { requireMember } from "./identity";
import { threadFor } from "./message_access";

export const next = query({
	args: { threadId: v.string(), now: v.number() },
	handler: async (ctx, { threadId, now }): Promise<ChatPractice | null> => {
		const member = await requireMember(ctx);
		const programId = chatProgramId(threadId);
		if (!programId) return null;
		const thread = await threadFor(ctx, member.clubId, threadId);
		if (!thread?.value.accountIds.includes(member.userId)) return null;
		const rows = ctx.db.query("events").withIndex("by_program_date", (q) =>
			q
				.eq("clubId", member.clubId)
				.eq("value.program", programId)
				.gte("value.date", addDays(clubDate(now, "UTC"), -14)),
		);
		for await (const row of rows.order("asc")) {
			if (!isUpcomingPractice(row.value, now)) continue;
			const responses = await eventRows(ctx, member.clubId, [row.value.id]);
			return {
				event: row.value,
				attending: responses.filter(
					(response) => response.value.response === "going",
				).length,
			};
		}
		return null;
	},
});
