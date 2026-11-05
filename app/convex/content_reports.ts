import { v } from "convex/values";
import type { ContentReference } from "../src/domain/content-report";
import { resourceFileIds } from "../src/domain/resources";
import type { Doc } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { contentReference } from "./content_report_schema";
import { contentReportTarget, contentVersion } from "./content_report_target";
import { requireMember } from "./identity";
import { profilePerson, profileRecord } from "./member_profiles";
import { blockedIds } from "./moderation";
import { releaseYoutubeResource } from "./youtube_cleanup";

export const target = query({
	args: { source: contentReference },
	handler: async (
		ctx,
		{ source },
	): Promise<{ canBlock: boolean; available: boolean }> => {
		const actor = await requireMember(ctx);
		const content = await contentReportTarget(ctx, actor, source).catch(
			() => undefined,
		);
		if (!content) return { canBlock: false, available: false };
		return {
			available: true,
			canBlock: Boolean(content.authorId && content.authorId !== actor.userId),
		};
	},
});

export const report = mutation({
	args: {
		source: contentReference,
		reason: v.string(),
		blockAuthor: v.boolean(),
	},
	handler: async (ctx, { source, reason, blockAuthor }): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!reason.trim() || reason.length > 1000 || source.id.length > 200)
			throw new Error("Add a reason of up to 1,000 characters.");
		const content = await contentReportTarget(ctx, actor, source);
		const subjectId = content.authorId;
		const subject = subjectId
			? await ctx.db
					.query("memberships")
					.withIndex("by_user", (q) => q.eq("userId", subjectId))
					.first()
			: undefined;
		if (
			blockAuthor &&
			(!subject ||
				subject.clubId !== actor.clubId ||
				subject.userId === actor.userId)
		)
			throw new Error(
				"The author cannot be blocked. Send the report without blocking.",
			);
		const version = contentVersion(content.version);
		const messageId = `content:${source.kind}:${source.id}:${version}`;
		const previous = await ctx.db
			.query("chatReports")
			.withIndex("by_reporter_message", (q) =>
				q.eq("reporterId", actor.userId).eq("messageId", messageId),
			)
			.first();
		if (!previous) {
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
				subjectId,
				messageId,
				threadId: "content",
				author: subject?.name ?? "Club content",
				body: content.body,
				imageIds: [],
				reason: reason.trim(),
				state: "open",
				contentSource: { kind: source.kind, id: source.id, version },
			});
		}
		if (
			blockAuthor &&
			subjectId &&
			!(await blockedIds(ctx, actor.userId)).includes(subjectId)
		)
			await ctx.db.insert("blocks", {
				clubId: actor.clubId,
				userId: actor.userId,
				targetId: subjectId,
			});
	},
});

export const removeReportedContent = async (
	ctx: MutationCtx,
	actor: Doc<"memberships">,
	report: Doc<"chatReports">,
): Promise<void> => {
	const source = report.contentSource;
	if (!source) throw new Error("Choose a content report.");
	const reference: ContentReference = { kind: source.kind, id: source.id };
	const current = await contentReportTarget(ctx, actor, reference, true).catch(
		() => undefined,
	);
	if (!current)
		throw new Error(
			"The content is unavailable. It may already have been removed.",
		);
	if (contentVersion(current.version) !== source.version)
		throw new Error(
			"Content changed since this report. Review the current version before removing it.",
		);
	if (source.kind === "resource") {
		const id = ctx.db.normalizeId("resources", source.id);
		const row = id ? await ctx.db.get(id) : undefined;
		if (!row || row.clubId !== actor.clubId)
			throw new Error("Resource unavailable.");
		for (const fileId of resourceFileIds(row)) {
			const id = ctx.db.normalizeId("resourceFiles", fileId);
			const file = id ? await ctx.db.get(id) : undefined;
			if (file && file.clubId === actor.clubId && file.resourceId === row._id) {
				await ctx.storage.delete(file.storageId);
				await ctx.db.delete(file._id);
			}
		}
		for (const comment of await ctx.db
			.query("resourceComments")
			.withIndex("by_resource", (q) => q.eq("resourceId", row._id))
			.collect())
			await ctx.db.delete(comment._id);
		await releaseYoutubeResource(ctx, actor.clubId, row._id);
		await ctx.db.delete(row._id);
	} else if (source.kind === "comment") {
		const id = ctx.db.normalizeId("resourceComments", source.id);
		if (id) await ctx.db.delete(id);
	} else if (source.kind === "feedback" || source.kind === "notice") {
		const table = source.kind === "feedback" ? "feedback" : "notices";
		const row = await ctx.db
			.query(table)
			.withIndex("by_club_and_key", (q) =>
				q.eq("clubId", actor.clubId).eq("value.id", source.id),
			)
			.unique();
		if (row) await ctx.db.delete(row._id);
	} else if (source.kind === "profile") {
		const person = await profilePerson(ctx, actor.clubId, source.id);
		const profile = await profileRecord(ctx, actor.clubId, source.id);
		await ctx.db.patch(person._id, {
			value: { ...person.value, name: "Member" },
		});
		for (const member of await ctx.db
			.query("memberships")
			.withIndex("by_person", (q) =>
				q.eq("clubId", actor.clubId).eq("personId", source.id),
			)
			.collect()) {
			await ctx.db.patch(member._id, { name: "Member" });
			await ctx.db.patch(member.userId, { name: "Member" });
		}
		if (profile) {
			const photo = profile.photoId
				? await ctx.db.get(profile.photoId)
				: undefined;
			if (photo && photo.clubId === actor.clubId) {
				await ctx.storage.delete(photo.storageId);
				await ctx.db.delete(photo._id);
			}
			await ctx.db.patch(profile._id, {
				photoId: undefined,
				revision: profile.revision + 1,
			});
		}
	} else {
		const normalized = ctx.db.normalizeId("sessionPlans", source.id);
		const row = normalized
			? await ctx.db.get(normalized)
			: await ctx.db
					.query("sessionPlans")
					.withIndex("by_club_key", (q) =>
						q.eq("clubId", actor.clubId).eq("key", source.id),
					)
					.unique();
		if (!row || row.clubId !== actor.clubId)
			throw new Error("Plan unavailable.");
		for (const file of await ctx.db
			.query("resourceFiles")
			.withIndex("by_club", (q) => q.eq("clubId", actor.clubId))
			.filter((q) => q.eq(q.field("sessionPlanKey"), row.key))
			.collect()) {
			await ctx.storage.delete(file.storageId);
			await ctx.db.delete(file._id);
		}
		await ctx.db.delete(row._id);
	}
};
