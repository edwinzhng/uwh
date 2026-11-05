import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalQuery } from "./_generated/server";
import { requireLocalEmail } from "./auth_mail";

export const fileStorage = internalQuery({
	args: { ownerId: v.id("users"), fileId: v.id("resourceFiles") },
	handler: async (ctx, { ownerId, fileId }): Promise<Id<"_storage">> => {
		const owner = await ctx.db.get(ownerId);
		requireLocalEmail(owner?.email ?? "");
		if (!owner?.email?.endsWith("@example.test"))
			throw new Error("Fictional accounts only.");
		const file = await ctx.db.get(fileId);
		if (file?.ownerId !== ownerId) throw new Error("Wrong fixture file.");
		return file.storageId;
	},
});

export const storageExists = internalQuery({
	args: { storageId: v.id("_storage") },
	handler: async (ctx, { storageId }): Promise<boolean> => {
		requireLocalEmail("content-safety-inspect@example.test");
		return Boolean(await ctx.db.system.get(storageId));
	},
});
