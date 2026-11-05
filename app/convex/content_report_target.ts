import { sha256 } from "@oslojs/crypto/sha2";
import { canCoach, visibleNotices } from "../src/domain/app-rules";
import type { ContentReference } from "../src/domain/content-report";
import { canReadFeedback } from "../src/domain/feedback-access";
import { canReadSharedSessionPlan } from "../src/domain/session-plan";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { loadData } from "./data";
import { accountFor } from "./identity";
import { profilePerson, profileRecord } from "./member_profiles";
import { readResource } from "./resources";

export type ReportTarget = {
	body: string;
	version: string;
	authorId?: Id<"users">;
};

export const contentVersion = (version: string): string =>
	Array.from(sha256(new TextEncoder().encode(version)), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");

export const contentReportTarget = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	reference: ContentReference,
	moderating = false,
): Promise<ReportTarget> => {
	const account = accountFor(actor);
	if (reference.kind === "resource") {
		const id = ctx.db.normalizeId("resources", reference.id);
		if (!id) throw new Error("Resource unavailable.");
		const row =
			moderating && actor.admin
				? await ctx.db.get(id)
				: await readResource(ctx, actor, id);
		if (!row || row.clubId !== actor.clubId)
			throw new Error("Resource unavailable.");
		if (reference.revision !== undefined && row.revision !== reference.revision)
			throw new Error("Content changed. Reopen it before reporting.");
		return {
			body: [row.title, row.description, row.voiceTranscript]
				.filter(Boolean)
				.join("\n"),
			version: String(row.revision),
			authorId: row.authorId,
		};
	}
	if (reference.kind === "comment") {
		const id = ctx.db.normalizeId("resourceComments", reference.id);
		const row = id ? await ctx.db.get(id) : undefined;
		if (!row || row.clubId !== actor.clubId)
			throw new Error("Comment unavailable.");
		await readResource(ctx, actor, row.resourceId);
		return { body: row.body, version: row.body, authorId: row.authorId };
	}
	if (reference.kind === "feedback") {
		const row = await ctx.db
			.query("feedback")
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", reference.id),
			)
			.unique();
		const person = row
			? await profilePerson(ctx, actor.clubId, row.value.personId)
			: undefined;
		if (
			!row ||
			!person ||
			(!(moderating && actor.admin) &&
				!canReadFeedback(row.value, account, person.value))
		)
			throw new Error("Feedback unavailable.");
		return {
			body: row.value.body,
			version: JSON.stringify(row.value),
			authorId: ctx.db.normalizeId("users", row.value.authorId) ?? undefined,
		};
	}
	if (reference.kind === "profile") {
		const person = await profilePerson(ctx, actor.clubId, reference.id);
		const profile = await profileRecord(ctx, actor.clubId, reference.id);
		const membership = await ctx.db
			.query("memberships")
			.withIndex("by_person", (q) =>
				q.eq("clubId", actor.clubId).eq("personId", reference.id),
			)
			.first();
		return {
			body: `${person.value.name}${profile?.photoId ? "\nProfile photo" : ""}`,
			version: JSON.stringify([person.value.name, profile?.photoId]),
			authorId: profile?.lastActorId ?? membership?.userId,
		};
	}
	if (reference.kind === "notice") {
		const { data } = await loadData(ctx, actor.clubId, {
			select: {
				members: [actor.personId, ...actor.children],
				notices: [reference.id],
			},
		});
		const notice = visibleNotices(data, account).find(
			(row) => row.id === reference.id,
		);
		if (!notice) throw new Error("Announcement unavailable.");
		return {
			body: notice.body,
			version: JSON.stringify([
				notice.body,
				notice.date,
				notice.program,
				notice.postedAt,
			]),
		};
	}
	const id = ctx.db.normalizeId("sessionPlans", reference.id);
	const row = id
		? await ctx.db.get(id)
		: await ctx.db
				.query("sessionPlans")
				.withIndex("by_club_key", (q) =>
					q.eq("clubId", actor.clubId).eq("key", reference.id),
				)
				.unique();
	const event = row
		? await ctx.db
				.query("events")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", row.eventId),
				)
				.unique()
		: undefined;
	const people = await Promise.all(
		[actor.personId, ...actor.children].map((personId) =>
			profilePerson(ctx, actor.clubId, personId),
		),
	);
	if (
		!row ||
		row.clubId !== actor.clubId ||
		!event ||
		!(
			(moderating && actor.admin) ||
			canCoach(account, event.value.program) ||
			(row.published &&
				canReadSharedSessionPlan(
					account,
					event.value,
					people.map((person) => person.value),
				))
		)
	)
		throw new Error("Plan unavailable.");
	if (reference.revision !== undefined && row.revision !== reference.revision)
		throw new Error("Content changed. Reopen it before reporting.");
	return {
		body: row.body,
		version: String(row.revision),
		authorId: row.updatedBy,
	};
};
