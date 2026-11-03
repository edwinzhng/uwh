"use node";

import { v } from "convex/values";
import {
	resourceDocumentMimes,
	validateDocumentContainer,
} from "../src/domain/resource-documents";
import {
	type ResourceFile,
	resourceMediaMime,
	validateStoredResourceMedia,
} from "../src/domain/resources";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { resourceFilePurpose } from "./resources_schema";

export const ingest = internalAction({
	args: {
		userId: v.id("users"),
		storageId: v.id("_storage"),
		name: v.string(),
		mime: v.string(),
		purpose: resourceFilePurpose,
		size: v.number(),
	},
	handler: async (ctx, file): Promise<ResourceFile> => {
		const blob = await ctx.storage.get(file.storageId);
		if (!blob) throw new Error("Media upload was incomplete or too large.");
		const mime = resourceMediaMime(
			new Uint8Array(await blob.slice(0, 64).arrayBuffer()),
			file.purpose,
			file.mime,
			file.name,
		);
		const error = validateStoredResourceMedia(file, { size: blob.size, mime });
		if (error) throw new Error(error);
		if (
			file.purpose === "document" &&
			resourceDocumentMimes.includes(file.mime) &&
			!validateDocumentContainer(
				new Uint8Array(await blob.arrayBuffer()),
				file.mime,
				file.name,
			)
		)
			throw new Error(
				"This document is invalid or contains unsupported active content.",
			);
		return ctx.runMutation(internal.resources.registerFile, file);
	},
});
