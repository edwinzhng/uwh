"use node";

import { randomBytes } from "node:crypto";
import { v } from "convex/values";
import type { CalendarFeedInfo } from "../src/domain/calendar-export";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { actionUserId as getAuthUserId } from "./identity";

export const enable = action({
	args: {
		personId: v.string(),
		includeWaitlisted: v.boolean(),
		rotate: v.optional(v.boolean()),
	},
	handler: async (
		ctx,
		{ personId, includeWaitlisted, rotate },
	): Promise<CalendarFeedInfo> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Sign in first.");
		return ctx.runMutation(internal.calendar.register, {
			userId,
			personId,
			includeWaitlisted,
			rotate: rotate ?? false,
			token: randomBytes(32).toString("hex"),
		});
	},
});
