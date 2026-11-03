import { defineTable } from "convex/server";
import { v } from "convex/values";

export const resourceKind = v.union(v.literal("document"), v.literal("video"));
export const resourceAudience = v.union(
	v.literal("club"),
	v.literal("coaches"),
	v.literal("players"),
	v.literal("programs"),
);
export const resourceCategory = v.union(
	v.literal("rules"),
	v.literal("formations"),
	v.literal("drills"),
	v.literal("announcements"),
	v.literal("other"),
);
export const resourceFilePurpose = v.union(
	v.literal("document"),
	v.literal("video"),
	v.literal("thumbnail"),
	v.literal("voice"),
);
export const resourceFileSlot = v.union(
	v.literal("primary"),
	v.literal("thumbnail"),
	v.literal("voice"),
);
export const resourceDraft = {
	title: v.string(),
	description: v.string(),
	kind: resourceKind,
	audience: resourceAudience,
	personIds: v.array(v.string()),
	programIds: v.optional(v.array(v.string())),
	url: v.optional(v.string()),
	fileId: v.optional(v.id("resourceFiles")),
	category: v.optional(resourceCategory),
	sessionNumber: v.optional(v.number()),
	thumbnailFileId: v.optional(v.id("resourceFiles")),
	voiceFileId: v.optional(v.id("resourceFiles")),
	voiceTranscript: v.optional(v.string()),
};
export const resourceTables = {
	resources: defineTable({
		...resourceDraft,
		clubId: v.id("clubs"),
		key: v.string(),
		authorId: v.optional(v.id("users")),
		archived: v.boolean(),
		revision: v.number(),
		createdAt: v.optional(v.number()),
		updatedAt: v.number(),
	})
		.index("by_club", ["clubId"])
		.index("by_club_archive", ["clubId", "archived", "updatedAt"])
		.index("by_club_key", ["clubId", "key"])
		.index("by_author", ["authorId"])
		.searchIndex("search_title", {
			searchField: "title",
			filterFields: ["clubId", "archived", "kind"],
		}),
	resourceFiles: defineTable({
		clubId: v.id("clubs"),
		ownerId: v.optional(v.id("users")),
		storageId: v.id("_storage"),
		name: v.string(),
		mime: v.string(),
		size: v.number(),
		purpose: v.optional(resourceFilePurpose),
		resourceId: v.optional(v.id("resources")),
	})
		.index("by_owner_resource", ["ownerId", "resourceId"])
		.index("by_owner", ["ownerId"])
		.index("by_club", ["clubId"]),
	resourceComments: defineTable({
		clubId: v.id("clubs"),
		resourceId: v.id("resources"),
		key: v.string(),
		authorId: v.id("users"),
		authorName: v.string(),
		body: v.string(),
		createdAt: v.number(),
	})
		.index("by_resource", ["resourceId", "createdAt"])
		.index("by_resource_key", ["resourceId", "key"])
		.index("by_author", ["authorId"])
		.index("by_club", ["clubId"]),
};
