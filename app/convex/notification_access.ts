import type { Member } from "../src/domain/app-types";
import { clubDate } from "../src/domain/event-time";
import {
	type InboxContent,
	type InboxSource,
	inboxContent,
} from "../src/domain/inbox";
import { practicePartKey } from "../src/domain/practice-parts";
import { resourceHouseholdPrograms } from "../src/domain/resources";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { accountFor } from "./identity";
import { messageFor, threadFor } from "./message_access";
import { blockedIds, canChat } from "./moderation";

export const notificationContent = async (
	ctx: QueryCtx,
	source: InboxSource & { clubId: Doc<"clubs">["_id"] },
	member: Doc<"memberships">,
	mode: "delivery" | "history" = "history",
): Promise<InboxContent | undefined> => {
	if (member.clubId !== source.clubId || member.userId === source.actorId)
		return undefined;
	const [blocked, club] = await Promise.all([
		blockedIds(ctx, member.userId),
		ctx.db.get(source.clubId),
	]);
	if (!club || (source.actorId && blocked.includes(source.actorId)))
		return undefined;
	const people = await Promise.all(
		[member.personId, ...member.children].map(async (id): Promise<Member[]> => {
			const person = await ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", source.clubId).eq("value.id", id),
				)
				.unique();
			return person ? [person.value] : [];
		}),
	);
	if (source.topic === "video" || source.topic === "document") {
		const id = ctx.db.normalizeId("resources", source.entityId);
		const resource = id ? await ctx.db.get(id) : undefined;
		if (!resource || resource.clubId !== member.clubId) return undefined;
		const actor = {
			...accountFor(member),
			clubId: member.clubId,
		};
		return inboxContent(
			source,
			{
				account: accountFor(member),
				people: people.flat(),
				blocked,
				chatPaused: false,
				today: clubDate(undefined, club.timeZone),
				now: Date.now(),
				responses: [],
				resource: { ...resource, id: resource._id },
				resourceActor: {
					...actor,
					programIds: resourceHouseholdPrograms(actor, people.flat()),
				},
			},
			mode,
		);
	}
	if (source.topic === "goalRequest" || source.topic === "progress") {
		const id = ctx.db.normalizeId("members", source.entityId);
		const person = id ? await ctx.db.get(id) : undefined;
		if (!person || person.clubId !== member.clubId) return undefined;
		return inboxContent(
			source,
			{
				account: accountFor(member),
				people: people.flat(),
				blocked,
				chatPaused: false,
				today: clubDate(undefined, club.timeZone),
				now: Date.now(),
				responses: [],
				person: person.value,
			},
			mode,
		);
	}
	const responseId =
		source.topic === "rsvpNo"
			? ctx.db.normalizeId("responses", source.entityId)
			: undefined;
	const response = responseId ? await ctx.db.get(responseId) : undefined;
	if (
		source.topic === "rsvpNo" &&
		(!response || response.clubId !== member.clubId)
	)
		return undefined;
	const eventId = response?.value.eventId ?? source.entityId;
	const message =
		source.kind === "messages"
			? await messageFor(ctx, source.clubId, source.entityId)
			: undefined;
	const [thread, feedback, notice, event, responses, chatAvailable] =
		await Promise.all([
			message
				? threadFor(ctx, source.clubId, message.value.threadId)
				: undefined,
			source.kind === "feedback"
				? ctx.db
						.query("feedback")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", source.clubId).eq("value.id", source.entityId),
						)
						.unique()
				: undefined,
			source.kind === "announcements"
				? ctx.db
						.query("notices")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", source.clubId).eq("value.id", source.entityId),
						)
						.unique()
				: undefined,
			source.kind === "events"
				? ctx.db
						.query("events")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", source.clubId).eq("value.id", eventId),
						)
						.unique()
				: undefined,
			source.kind === "events" &&
			(mode === "delivery" || source.topic === "lineup")
				? Promise.all(
						(source.eventIds ?? [eventId]).map((eventId) =>
							ctx.db
								.query("responses")
								.withIndex("by_event", (q) =>
									q.eq("clubId", source.clubId).eq("value.eventId", eventId),
								)
								.collect(),
						),
					).then((rows) => rows.flat().map((row) => row.value))
				: [],
			source.kind === "messages" ? canChat(ctx, member.userId) : true,
		]);
	const key = practicePartKey(eventId, source.partId);
	const [team, plan] = await Promise.all([
		source.topic === "lineup"
			? ctx.db
					.query("teams")
					.withIndex("by_club_and_key", (q) =>
						q.eq("clubId", member.clubId).eq("value.id", key),
					)
					.unique()
			: undefined,
		source.topic === "sessionPlan"
			? ctx.db
					.query("sessionPlans")
					.withIndex("by_club_key", (q) =>
						q.eq("clubId", member.clubId).eq("key", key),
					)
					.unique()
			: undefined,
	]);
	return inboxContent(
		source,
		{
			account: accountFor(member),
			people: people.flat(),
			blocked,
			chatPaused: !chatAvailable,
			today: clubDate(undefined, club.timeZone),
			now: Date.now(),
			message: message?.value,
			thread: thread?.value,
			feedback: feedback?.value,
			notice: notice?.value,
			event: event?.value,
			responses,
			response: response?.value,
			team: team?.value,
			planExists: Boolean(plan),
			planPublished: plan?.published === true,
		},
		mode,
	);
};
