import { type PaginationResult, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { defaultPrograms } from "../src/domain/programs";
import {
	canManageResources,
	canReadResource,
	type Resource,
	type ResourceActor,
	type ResourceComment,
	type ResourceFile,
	resourceFileIds,
	resourceHouseholdPrograms,
	resourceLimits,
	resourceMatches,
	resourceTimestamps,
	resourceUrl,
	sameResourceDraft,
	validateResource,
	validateResourceComment,
} from "../src/domain/resources";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { requireMember } from "./identity";
import { enqueue } from "./notifications";
import {
	resourceCategory,
	resourceDraft,
	resourceFilePurpose,
	resourceFileSlot,
	resourceKind,
} from "./resources_schema";
import { hasAcceptedTerms, requireAcceptedTerms } from "./terms_access";

const actorFor = async (
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<Doc<"memberships"> | null> =>
	ctx.db
		.query("memberships")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first();
export const resourceActor = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
): Promise<ResourceActor> => {
	if (canManageResources(actor)) return actor;
	const people = await Promise.all(
		[...new Set([actor.personId, ...actor.children])].map(async (id) =>
			ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", id),
				)
				.unique(),
		),
	);
	return {
		...actor,
		programIds: resourceHouseholdPrograms(
			actor,
			people.flatMap((person) => (person ? [person.value] : [])),
		),
	};
};
export const canAccessResource = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	resource: Doc<"resources">,
): Promise<boolean> =>
	canReadResource(
		resource.audience === "programs" ? await resourceActor(ctx, actor) : actor,
		resource,
	);
export const readResource = async (
	ctx: QueryCtx,
	actor: Doc<"memberships">,
	id: Id<"resources">,
): Promise<Doc<"resources">> => {
	const resource = await ctx.db.get(id);
	if (!resource || !(await canAccessResource(ctx, actor, resource)))
		throw new Error("Resource unavailable.");
	return resource;
};
const summary = async (
	ctx: QueryCtx,
	resource: Doc<"resources">,
	includePeople = false,
): Promise<Resource> => {
	const file = resource.fileId ? await ctx.db.get(resource.fileId) : undefined;
	const people = includePeople
		? await Promise.all(
				resource.personIds.map(async (personId): Promise<[string, string]> => {
					const person = await ctx.db
						.query("members")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", resource.clubId).eq("value.id", personId),
						)
						.unique();
					return [personId, person?.value.name ?? "Former player"];
				}),
			)
		: [];
	return {
		id: resource._id,
		clubId: resource.clubId,
		title: resource.title,
		description: resource.description,
		kind: resource.kind,
		audience: resource.audience,
		personIds: resource.personIds,
		programIds: resource.programIds,
		url: resource.url,
		fileId: resource.fileId,
		fileName: file?.name,
		fileMime: file?.mime,
		category:
			resource.kind === "document" ? (resource.category ?? "other") : undefined,
		sessionNumber: resource.sessionNumber,
		thumbnailFileId: resource.thumbnailFileId,
		voiceFileId: resource.voiceFileId,
		voiceTranscript: resource.voiceTranscript,
		personNames: includePeople ? Object.fromEntries(people) : undefined,
		archived: resource.archived,
		revision: resource.revision,
		createdAt: resource.createdAt,
		updatedAt: resource.updatedAt,
	};
};
export const list = query({
	args: {
		kind: v.optional(resourceKind),
		category: v.optional(resourceCategory),
		archived: v.boolean(),
		search: v.string(),
		personId: v.optional(v.string()),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args): Promise<PaginationResult<Resource>> => {
		const actor = await requireMember(ctx);
		const search = args.search.trim().slice(0, 120);
		const rows = ctx.db
			.query("resources")
			.withIndex("by_club_archive", (q) =>
				q.eq("clubId", actor.clubId).eq("archived", args.archived),
			)
			.order("desc");
		const result = await rows.paginate({
			...args.paginationOpts,
			numItems: Math.min(40, Math.max(1, args.paginationOpts.numItems)),
			maximumRowsRead: 200,
		});
		const access = result.page.some(
			(resource) => resource.audience === "programs",
		)
			? await resourceActor(ctx, actor)
			: actor;
		const visible = result.page.filter(
			(resource) =>
				canReadResource(access, resource) &&
				(!args.kind || resource.kind === args.kind) &&
				(!args.category ||
					(resource.kind === "document" &&
						(resource.category ?? "other") === args.category)) &&
				(!args.personId || resource.personIds.includes(args.personId)),
		);
		return {
			...result,
			page: (
				await Promise.all(
					visible.map((row) => summary(ctx, row, Boolean(search))),
				)
			).filter((row) =>
				resourceMatches(row, {
					kind: args.kind ?? "all",
					archived: args.archived,
					search,
					personId: args.personId,
					category: args.category,
				}),
			),
		};
	},
});
export const details = query({
	args: { id: v.id("resources") },
	handler: async (
		ctx,
		{ id },
	): Promise<{
		resource: Resource;
		comments: ResourceComment[];
		limited: boolean;
	}> => {
		const actor = await requireMember(ctx);
		const resource = await readResource(ctx, actor, id);
		const rows = await ctx.db
			.query("resourceComments")
			.withIndex("by_resource", (q) => q.eq("resourceId", id))
			.order("desc")
			.take(101);
		const comments: ResourceComment[] = rows.slice(0, 100).map((row) => ({
			id: row._id,
			authorId: row.authorId,
			authorName: row.authorName,
			body: row.body,
			createdAt: row.createdAt,
		}));
		return {
			resource: await summary(ctx, resource, true),
			comments,
			limited: rows.length > 100,
		};
	},
});
export const save = mutation({
	args: {
		...resourceDraft,
		id: v.optional(v.id("resources")),
		key: v.string(),
		revision: v.number(),
	},
	handler: async (
		ctx,
		{ id, key, revision, ...draft },
	): Promise<Id<"resources">> => {
		const actor = await requireMember(ctx);
		if (!canManageResources(actor))
			throw new Error("Coach or admin access required.");
		const error = validateResource(draft);
		if (error) throw new Error(error);
		if (!key || key.length > 100)
			throw new Error("Reopen this form and try again.");
		const previous = id
			? await readResource(ctx, actor, id)
			: await ctx.db
					.query("resources")
					.withIndex("by_club_key", (q) =>
						q.eq("clubId", actor.clubId).eq("key", key),
					)
					.unique();
		if (!id && previous) {
			if (
				previous.authorId === actor.userId &&
				sameResourceDraft(previous, draft)
			)
				return previous._id;
			throw new Error(
				"This resource was already saved. Open it to make further changes.",
			);
		}
		if (previous && previous.revision !== revision)
			throw new Error("This resource changed. Reopen it before saving.");
		if (draft.audience === "programs") {
			const club = await ctx.db.get(actor.clubId);
			const programs = club?.programs ?? defaultPrograms();
			if (
				draft.programIds?.some(
					(id) =>
						!programs.some(
							(program) =>
								program.id === id &&
								((!program.archived && program.status !== "completed") ||
									previous?.programIds?.includes(id)),
						),
				)
			)
				throw new Error("Choose active programs from this club.");
		}
		for (const personId of draft.personIds) {
			const member = await ctx.db
				.query("members")
				.withIndex("by_club_and_key", (q) =>
					q.eq("clubId", actor.clubId).eq("value.id", personId),
				)
				.unique();
			if (
				!member ||
				!member.value.programs.length ||
				member.value.archived ||
				member.value.mergedInto
			)
				throw new Error("Choose an active player for each tag.");
		}
		const files = await Promise.all(
			(
				[
					{ id: draft.fileId, purpose: draft.kind },
					{ id: draft.thumbnailFileId, purpose: "thumbnail" },
					{ id: draft.voiceFileId, purpose: "voice" },
				] as const
			).map(
				async ({
					id: fileId,
					purpose,
				}): Promise<Doc<"resourceFiles"> | undefined> => {
					if (!fileId) return undefined;
					const file = await ctx.db.get(fileId);
					if (
						!file ||
						file.clubId !== actor.clubId ||
						(file.purpose ?? "document") !== purpose ||
						(file.resourceId
							? file.resourceId !== previous?._id
							: file.ownerId !== actor.userId)
					)
						throw new Error("Upload that media file again before saving.");
					return file;
				},
			),
		);
		const fields = {
			...draft,
			title: draft.title.trim(),
			description: draft.description.trim(),
			url: draft.url ? resourceUrl(draft.url.trim()) : undefined,
			category:
				draft.kind === "document" ? (draft.category ?? "other") : undefined,
			voiceTranscript: draft.voiceTranscript?.trim() || undefined,
			revision: (previous?.revision ?? 0) + 1,
			...resourceTimestamps(previous ?? undefined, Date.now()),
		};
		const resourceId =
			previous?._id ??
			(await ctx.db.insert("resources", {
				...fields,
				key,
				clubId: actor.clubId,
				authorId: actor.userId,
				archived: false,
			}));
		if (previous) await ctx.db.patch(previous._id, fields);
		for (const file of files)
			if (file) await ctx.db.patch(file._id, { resourceId });
		for (const fileId of previous
			? resourceFileIds(previous).filter(
					(id) => !resourceFileIds(draft).includes(id),
				)
			: []) {
			const normalized = ctx.db.normalizeId("resourceFiles", fileId);
			const oldFile = normalized ? await ctx.db.get(normalized) : undefined;
			if (oldFile?.resourceId === resourceId) {
				await ctx.storage.delete(oldFile.storageId);
				await ctx.db.delete(oldFile._id);
			}
		}
		if (!previous)
			await enqueue(ctx, {
				clubId: actor.clubId,
				actorId: actor.userId,
				kind: "announcements",
				topic: draft.kind === "video" ? "video" : "document",
				entityId: resourceId,
				key: `${actor.clubId}:resource:${resourceId}`,
			});
		return resourceId;
	},
});
export const archive = mutation({
	args: { id: v.id("resources"), revision: v.number(), archived: v.boolean() },
	handler: async (ctx, args): Promise<void> => {
		const actor = await requireMember(ctx);
		if (!canManageResources(actor))
			throw new Error("Coach or admin access required.");
		const resource = await readResource(ctx, actor, args.id);
		if (resource.revision !== args.revision)
			throw new Error("This resource changed. Reopen it and try again.");
		await ctx.db.patch(args.id, {
			archived: args.archived,
			revision: resource.revision + 1,
			...resourceTimestamps(resource, Date.now()),
		});
	},
});
export const comment = mutation({
	args: { id: v.id("resources"), key: v.string(), body: v.string() },
	handler: async (ctx, { id, key, body }): Promise<void> => {
		const actor = await requireMember(ctx);
		const resource = await readResource(ctx, actor, id);
		if (resource.archived)
			throw new Error("Restore this resource before adding a comment.");
		const error = validateResourceComment(body);
		if (error) throw new Error(error);
		if (!key || key.length > 100)
			throw new Error("Reopen this form and try again.");
		const existing = await ctx.db
			.query("resourceComments")
			.withIndex("by_resource_key", (q) =>
				q.eq("resourceId", id).eq("key", key),
			)
			.unique();
		if (existing) {
			if (existing.authorId !== actor.userId)
				throw new Error("Comment unavailable.");
			if (existing.body !== body.trim())
				throw new Error(
					"This comment retry changed. Submit it with a new request.",
				);
			return;
		}
		await ctx.db.insert("resourceComments", {
			clubId: actor.clubId,
			resourceId: id,
			key,
			authorId: actor.userId,
			authorName: actor.name,
			body: body.trim(),
			createdAt: Date.now(),
		});
	},
});
export const removeComment = mutation({
	args: { id: v.id("resourceComments") },
	handler: async (ctx, { id }): Promise<void> => {
		const actor = await requireMember(ctx);
		const comment = await ctx.db.get(id);
		if (!comment) throw new Error("Comment unavailable.");
		await readResource(ctx, actor, comment.resourceId);
		if (comment.authorId !== actor.userId && !canManageResources(actor))
			throw new Error("You can only remove your own comments.");
		await ctx.db.delete(id);
	},
});
export const canUpload = internalQuery({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }): Promise<boolean> => {
		const actor = await actorFor(ctx, userId);
		return Boolean(
			actor &&
				canManageResources(actor) &&
				(await hasAcceptedTerms(ctx, actor)),
		);
	},
});
export const uploadUrl = internalMutation({
	args: { userId: v.id("users") },
	handler: async (ctx, { userId }): Promise<string> => {
		const actor = await actorFor(ctx, userId);
		if (!actor || !canManageResources(actor))
			throw new Error("Coach or admin access required.");
		await requireAcceptedTerms(ctx, actor);
		return ctx.storage.generateUploadUrl();
	},
});
export const registerFile = internalMutation({
	args: {
		userId: v.id("users"),
		storageId: v.id("_storage"),
		name: v.string(),
		mime: v.string(),
		size: v.number(),
		purpose: resourceFilePurpose,
	},
	handler: async (ctx, { userId, ...file }): Promise<ResourceFile> => {
		const actor = await actorFor(ctx, userId);
		if (!actor || !canManageResources(actor))
			throw new Error("Coach or admin access required.");
		await requireAcceptedTerms(ctx, actor);
		const pending = await ctx.db
			.query("resourceFiles")
			.withIndex("by_owner_resource", (q) =>
				q.eq("ownerId", userId).eq("resourceId", undefined),
			)
			.take(resourceLimits.pendingFiles);
		if (pending.length >= resourceLimits.pendingFiles)
			throw new Error("Finish saving your pending documents first.");
		const id = await ctx.db.insert("resourceFiles", {
			...file,
			clubId: actor.clubId,
			ownerId: userId,
		});
		await ctx.scheduler.runAfter(
			resourceLimits.fileLifetime,
			internal.resources.expireFile,
			{ id },
		);
		return {
			id,
			name: file.name,
			mime: file.mime,
			size: file.size,
			purpose: file.purpose,
		};
	},
});
export const readableFile = internalQuery({
	args: {
		userId: v.id("users"),
		resourceId: v.string(),
		slot: v.optional(resourceFileSlot),
	},
	handler: async (
		ctx,
		{ userId, resourceId, slot = "primary" },
	): Promise<Doc<"resourceFiles"> | null> => {
		const actor = await actorFor(ctx, userId);
		const id = ctx.db.normalizeId("resources", resourceId);
		const resource = id ? await ctx.db.get(id) : undefined;
		if (!actor || !resource || !(await canAccessResource(ctx, actor, resource)))
			return null;
		const fileId =
			slot === "primary"
				? resource.fileId
				: slot === "thumbnail"
					? resource.thumbnailFileId
					: resource.voiceFileId;
		const file = fileId ? await ctx.db.get(fileId) : undefined;
		return file?.clubId === actor.clubId && file.resourceId === resource._id
			? file
			: null;
	},
});
export const expireFile = internalMutation({
	args: { id: v.id("resourceFiles") },
	handler: async (ctx, { id }): Promise<void> => {
		const file = await ctx.db.get(id);
		if (file && !file.resourceId) {
			await ctx.storage.delete(file.storageId);
			await ctx.db.delete(id);
		}
	},
});
