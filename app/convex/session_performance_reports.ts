import { v } from "convex/values";
import {
	canReportSessionPerformance,
	type SessionPerformance,
} from "../src/domain/session-performance";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation } from "./_generated/server";
import { accountFor, requireMember } from "./identity";

export const report = mutation({
	args: { id: v.string(), revision: v.number(), reason: v.string() },
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!input.reason.trim()) throw new Error("Add a reason");
		if (input.reason.length > 1000)
			throw new Error("Keep the reason to 1,000 characters");
		const id = ctx.db.normalizeId("sessionPerformance", input.id);
		const row = id ? await ctx.db.get(id) : undefined;
		const person = row
			? await ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", actor.clubId).eq("value.id", row.personId),
					)
					.unique()
			: undefined;
		const entry: SessionPerformance | undefined = row
			? { ...row, id: row._id }
			: undefined;
		if (
			!row ||
			row.clubId !== actor.clubId ||
			!person ||
			!entry ||
			!canReportSessionPerformance(accountFor(actor), person.value, entry)
		)
			throw new Error("This session feedback is unavailable to report.");
		if (row.revision !== input.revision)
			throw new Error(
				"Feedback changed. Review it again; your reason is kept.",
			);
		const messageId = `performance:${row._id}:${row.revision}`;
		const previous = await ctx.db
			.query("chatReports")
			.withIndex("by_reporter_message", (q) =>
				q.eq("reporterId", actor.userId).eq("messageId", messageId),
			)
			.first();
		if (previous) return;
		const recent = await ctx.db
			.query("chatReports")
			.withIndex("by_reporter", (q) =>
				q
					.eq("reporterId", actor.userId)
					.gt("_creationTime", Date.now() - 3600000),
			)
			.take(10);
		if (recent.length >= 10)
			throw new Error("Too many reports. Try again later.");
		await ctx.db.insert("chatReports", {
			clubId: actor.clubId,
			reporterId: actor.userId,
			subjectId: row.authorId,
			messageId,
			threadId: "session-performance",
			author: row.authorName,
			body: row.comments,
			imageIds: [],
			reason: input.reason.trim(),
			state: "open",
			source: {
				kind: "sessionPerformance",
				id: row._id,
				personId: row.personId,
				eventId: row.eventId,
				revision: row.revision,
				rating: row.rating,
			},
		});
	},
});
export const removeReportedPerformance = async (
	ctx: MutationCtx,
	report: Doc<"chatReports">,
): Promise<void> => {
	const source = report.source;
	if (!source) throw new Error("Choose a session feedback report.");
	const row = await ctx.db.get(source.id);
	if (!row || row.clubId !== report.clubId || row.removed) return;
	if (row.revision !== source.revision)
		throw new Error(
			"Feedback changed. Dismiss this report; newer feedback wasn’t removed.",
		);
	await ctx.db.patch(row._id, {
		removed: true,
		comments: "",
		revision: row.revision + 1,
	});
};
