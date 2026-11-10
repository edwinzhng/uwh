import { v } from "convex/values";
import { reduceApp } from "../src/domain/app-reducer";
import { eventResponse } from "../src/domain/app-rules";
import type { AppAction } from "../src/domain/app-types";
import { signupState } from "../src/domain/event-time";
import { practiceEvent } from "../src/domain/event-types";
import {
	changedPartResponse,
	partResponse,
} from "../src/domain/schedule-agenda";
import { mutation } from "./_generated/server";
import { actionData } from "./action_data";
import { saveData } from "./data";
import { accountFor, requireMember } from "./identity";
import { rejectMergedAliasAction } from "./member_alias_guard";
import { notifyChanges } from "./notification_events";

export const respond = mutation({
	args: {
		eventId: v.string(),
		personId: v.string(),
		partId: v.optional(v.string()),
		going: v.boolean(),
	},
	handler: async (ctx, input): Promise<{ response: string }> => {
		const member = await requireMember(ctx);
		const initial: AppAction = {
			type: "respond",
			eventId: input.eventId,
			personId: input.personId,
			response: input.going ? "going" : "unavailable",
		};
		await rejectMergedAliasAction(ctx, member.clubId, initial);
		const { data, rows } = await actionData(ctx, member.clubId, initial);
		const event = data.events.find((entry) => entry.id === input.eventId);
		if (!event || !practiceEvent(event))
			throw new Error("Practice unavailable.");
		if (Boolean(event.parts?.length) !== Boolean(input.partId))
			throw new Error("Choose a practice section.");
		const current = eventResponse(data, event.id, input.personId);
		const action: AppAction = input.partId
			? {
					...initial,
					...changedPartResponse(event, current, input.partId, input.going),
				}
			: initial;
		const now = Date.now();
		const currentData = {
			...data,
			events: data.events.map((entry) => ({
				...entry,
				signup: signupState(entry, now),
			})),
		};
		const next = reduceApp(currentData, accountFor(member), action);
		await saveData(ctx, member.clubId, rows, next);
		await notifyChanges(ctx, member.clubId, member.userId, data, next);
		const saved = eventResponse(next, event.id, input.personId);
		return {
			response: input.partId
				? partResponse(saved, input.partId)
				: saved.response,
		};
	},
});
