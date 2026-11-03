import { v } from "convex/values";
import { addDays } from "../src/domain/app-rules";
import type { ClubEvent } from "../src/domain/app-types";
import {
	clubTimestamp,
	futureSignupOpening,
	signupState,
} from "../src/domain/event-time";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { enqueue } from "./notifications";
import { applyProgramRsvpDefaults } from "./program_rsvp";
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
			await applyProgramRsvpDefaults(ctx, row);
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
	const now = Date.now();
	const opensAt = futureSignupOpening(event, now);
	if (!event.cancelled) {
		if (event.programRsvp && event.closesAt !== undefined) {
			const reminderAt = clubTimestamp(
				addDays(event.date, -event.programRsvp.reminderDays),
				event.start,
				event.timeZone,
			);
			if (reminderAt > now && reminderAt < event.closesAt)
				await enqueue(
					ctx,
					{
						clubId,
						kind: "events",
						entityId: event.id,
						eventPhase: "closing",
						eventTimestamp: event.closesAt,
						key: `${clubId}:${event.id}:program-reminder:${reminderAt}:${event.closesAt}`,
					},
					Math.max(reminderAt, event.opensAt ?? 0),
				);
		}
		if (opensAt !== undefined)
			await enqueue(
				ctx,
				{
					clubId,
					kind: "events",
					entityId: event.id,
					eventPhase: "open",
					eventTimestamp: opensAt,
					key: `${clubId}:${event.id}:open:${opensAt}`,
				},
				opensAt,
			);
		if (event.closesAt !== undefined && event.closesAt - 1800000 > now)
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
		if (timestamp !== undefined && timestamp > now)
			await ctx.scheduler.runAt(timestamp, internal.signup.refresh, {
				clubId,
				eventId: event.id,
			});
	}
};
