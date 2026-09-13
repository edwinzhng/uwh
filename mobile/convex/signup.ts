import { v } from "convex/values";
import type { ClubEvent } from "../src/domain/app-types";
import { signupState } from "../src/domain/event-time";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { enqueue } from "./notifications";
import { syncEditedSeries } from "./session_series";

export const refresh = internalMutation({
	args: { clubId: v.id("clubs"), eventId: v.string() },
	handler: async (ctx, { clubId, eventId }): Promise<null> => {
		const row = await ctx.db
			.query("events")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", clubId).eq("value.id", eventId),
			)
			.unique();
		if (row) {
			await ctx.db.patch(row._id, {
				value: { ...row.value, signup: signupState(row.value, Date.now()) },
			});
			await syncEditedSeries(ctx, clubId, [row.value], [row.value]);
		}
		return null;
	},
});
export const scheduleSignup = async (
	ctx: MutationCtx,
	clubId: Id<"clubs">,
	event: ClubEvent,
): Promise<void> => {
	if (!event.cancelled) {
		if (event.opensAt !== undefined && (event.closesAt ?? 0) > Date.now())
			await enqueue(
				ctx,
				{
					clubId,
					kind: "events",
					entityId: event.id,
					eventPhase: "open",
					eventTimestamp: event.opensAt,
					key: `${clubId}:${event.id}:open:${event.opensAt}`,
				},
				event.opensAt,
			);
		if (event.closesAt !== undefined && event.closesAt - 1800000 > Date.now())
			await enqueue(
				ctx,
				{
					clubId,
					kind: "events",
					entityId: event.id,
					eventPhase: "closing",
					eventTimestamp: event.closesAt,
					key: `${clubId}:${event.id}:closing:${event.closesAt}`,
				},
				event.closesAt - 1800000,
			);
	}
	for (const timestamp of [event.opensAt, event.closesAt]) {
		if (timestamp !== undefined && timestamp > Date.now())
			await ctx.scheduler.runAt(timestamp, internal.signup.refresh, {
				clubId,
				eventId: event.id,
			});
	}
};
