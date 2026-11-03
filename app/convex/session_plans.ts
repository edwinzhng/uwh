import { v } from "convex/values";
import { practicePartKey } from "../src/domain/practice-parts";
import {
	canReadSharedSessionPlan,
	emptySessionPlan,
	nextSessionPlan,
	planResourceIds,
	publishSessionPlan,
	type SessionPlan,
	type SessionPlanDraft,
	type SharedSessionPlan,
	sessionPlanPublicationPayload,
	sessionPlanRequestPayload,
	sharedSessionPlan,
} from "../src/domain/session-plan";
import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { accountFor, requireMember } from "./identity";
import { enqueue } from "./notifications";
import { canAccessResource, readResource } from "./resources";
import { sessionDrillValue } from "./session_plans_schema";

const requirePlanEvent = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	eventId: string,
	partId?: string,
): Promise<Doc<"events">> => {
	const event = await ctx.db
		.query("events")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", eventId),
		)
		.unique();
	if (
		!event ||
		["social", "meeting"].includes(event.value.kind) ||
		(partId && !event.value.parts?.some((part) => part.id === partId))
	)
		throw new Error("Choose a practice and a valid practice part.");
	return event;
};
const currentPlan = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	key: string,
): Promise<SessionPlan> => {
	const plan = await ctx.db
		.query("sessionPlans")
		.withIndex("by_club_key", (q) =>
			q.eq("clubId", actor.clubId).eq("key", key),
		)
		.unique();
	if (plan)
		return {
			body: plan.body,
			goals: plan.goals,
			objective: plan.objective,
			notes: plan.notes,
			drills: plan.drills,
			revision: plan.revision,
			updatedAt: plan.updatedAt,
			published: plan.published,
			publishedAt: plan.publishedAt,
		};
	const legacy = await ctx.db
		.query("plans")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", actor.clubId).eq("value.id", key),
		)
		.unique();
	return emptySessionPlan(legacy?.value.body);
};
const requirePlanMedia = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	plan: SessionPlanDraft,
): Promise<void> => {
	await Promise.all(
		planResourceIds(plan).map(async (id): Promise<void> => {
			const resourceId = ctx.db.normalizeId("resources", id);
			if (!resourceId) throw new Error("A selected resource is unavailable.");
			const resource = await readResource(ctx, actor, resourceId);
			if (resource.archived)
				throw new Error("Remove or replace an archived session-plan resource.");
		}),
	);
};
export const state = query({
	args: { eventId: v.string(), partId: v.optional(v.string()) },
	handler: async (ctx, { eventId, partId }): Promise<SessionPlan> => {
		const actor = await requireMember(ctx);
		if (!actor.coachPrograms.length) throw new Error("Coach access required.");
		await requirePlanEvent(ctx, actor, eventId, partId);
		return currentPlan(ctx, actor, practicePartKey(eventId, partId));
	},
});
export const shared = query({
	args: { eventId: v.string(), partId: v.optional(v.string()) },
	handler: async (
		ctx,
		{ eventId, partId },
	): Promise<SharedSessionPlan | null> => {
		const actor = await requireMember(ctx);
		const event = await requirePlanEvent(ctx, actor, eventId, partId);
		const people = await Promise.all(
			[actor.personId, ...actor.children].map((id) =>
				ctx.db
					.query("members")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", actor.clubId).eq("value.id", id),
					)
					.unique(),
			),
		);
		if (
			!canReadSharedSessionPlan(
				accountFor(actor),
				event.value,
				people.flatMap((person) => (person ? [person.value] : [])),
			)
		)
			return null;
		const plan = await currentPlan(
			ctx,
			actor,
			practicePartKey(eventId, partId),
		);
		if (!plan.published) return null;
		const resources = await Promise.all(
			planResourceIds(plan).map(async (id): Promise<string[]> => {
				const resourceId = ctx.db.normalizeId("resources", id);
				const resource = resourceId ? await ctx.db.get(resourceId) : undefined;
				return resource &&
					!resource.archived &&
					(await canAccessResource(ctx, actor, resource))
					? [id]
					: [];
			}),
		);
		const allowed = new Set(resources.flat());
		return sharedSessionPlan(plan, (id) => allowed.has(id)) ?? null;
	},
});
export const save = mutation({
	args: {
		eventId: v.string(),
		partId: v.optional(v.string()),
		revision: v.number(),
		requestId: v.string(),
		body: v.optional(v.string()),
		goals: v.optional(v.string()),
		objective: v.string(),
		notes: v.string(),
		drills: v.array(sessionDrillValue),
	},
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!actor.coachPrograms.length) throw new Error("Coach access required.");
		const event = await requirePlanEvent(
			ctx,
			actor,
			input.eventId,
			input.partId,
		);
		if (event.value.cancelled) throw new Error("This practice is cancelled.");
		if (input.requestId.length < 16 || input.requestId.length > 128)
			throw new Error("Reopen the plan and retry.");
		const key = practicePartKey(input.eventId, input.partId);
		const previous = await ctx.db
			.query("sessionPlanRequests")
			.withIndex("by_request", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("actorId", actor.userId)
					.eq("requestId", input.requestId),
			)
			.unique();
		const payload = sessionPlanRequestPayload(input);
		if (previous) {
			if (previous.payload !== payload)
				throw new Error(
					"This request was already used for a different session plan.",
				);
			return;
		}
		const row = await ctx.db
			.query("sessionPlans")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", actor.clubId).eq("key", key),
			)
			.unique();
		const next = nextSessionPlan(
			await currentPlan(ctx, actor, key),
			input,
			Date.now(),
		);
		await requirePlanMedia(ctx, actor, next);
		const values = {
			...next,
			updatedAt: next.updatedAt ?? Date.now(),
			clubId: actor.clubId,
			key,
			eventId: input.eventId,
			partId: input.partId,
			updatedBy: actor.userId,
			publishedAt: undefined,
		};
		if (row) await ctx.db.patch(row._id, values);
		else await ctx.db.insert("sessionPlans", values);
		await ctx.db.insert("sessionPlanRequests", {
			clubId: actor.clubId,
			actorId: actor.userId,
			requestId: input.requestId,
			payload,
		});
		await enqueue(ctx, {
			clubId: actor.clubId,
			actorId: actor.userId,
			kind: "events",
			topic: "sessionPlan",
			entityId: input.eventId,
			partId: input.partId,
			sourceRevision: next.revision,
			key: `${actor.clubId}:plan:${key}:${next.revision}:saved`,
			staffOnly: true,
		});
	},
});
export const publish = mutation({
	args: {
		eventId: v.string(),
		partId: v.optional(v.string()),
		revision: v.number(),
		requestId: v.string(),
		published: v.boolean(),
	},
	handler: async (ctx, input): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!actor.coachPrograms.length) throw new Error("Coach access required.");
		const event = await requirePlanEvent(
			ctx,
			actor,
			input.eventId,
			input.partId,
		);
		if (event.value.cancelled) throw new Error("This practice is cancelled.");
		if (input.requestId.length < 16 || input.requestId.length > 128)
			throw new Error("Reopen the plan and retry.");
		const payload = sessionPlanPublicationPayload(input);
		const receipt = await ctx.db
			.query("sessionPlanRequests")
			.withIndex("by_request", (q) =>
				q
					.eq("clubId", actor.clubId)
					.eq("actorId", actor.userId)
					.eq("requestId", input.requestId),
			)
			.unique();
		if (receipt) {
			if (receipt.payload !== payload)
				throw new Error(
					"This request was already used for another session plan action.",
				);
			return;
		}
		const key = practicePartKey(input.eventId, input.partId);
		const row = await ctx.db
			.query("sessionPlans")
			.withIndex("by_club_key", (q) =>
				q.eq("clubId", actor.clubId).eq("key", key),
			)
			.unique();
		if (!row) throw new Error("Save the session plan before publishing.");
		const next = publishSessionPlan(row, input, Date.now());
		if (next !== row) {
			if (input.published) await requirePlanMedia(ctx, actor, next);
			await ctx.db.patch(row._id, {
				published: next.published,
				publishedAt: next.publishedAt,
				revision: next.revision,
				updatedAt: next.updatedAt ?? Date.now(),
				updatedBy: actor.userId,
			});
			await enqueue(ctx, {
				clubId: actor.clubId,
				actorId: actor.userId,
				kind: "events",
				topic: "sessionPlan",
				entityId: input.eventId,
				partId: input.partId,
				sourceRevision: next.revision,
				key: `${actor.clubId}:plan:${key}:${next.revision}:${input.published ? "published" : "unpublished"}`,
				staffOnly: !input.published,
			});
		}
		await ctx.db.insert("sessionPlanRequests", {
			clubId: actor.clubId,
			actorId: actor.userId,
			requestId: input.requestId,
			payload,
		});
	},
});
