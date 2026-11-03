import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const needsImportedResourceLink = (
	resource: { _id: string; clubId: string },
	file: { clubId: string; resourceId?: string } | null,
): boolean => {
	if (
		!file ||
		file.clubId !== resource.clubId ||
		(file.resourceId !== undefined && file.resourceId !== resource._id)
	)
		throw new Error("Imported media ownership needs review.");
	return file.resourceId === undefined;
};

export const linkImportedResourceFiles = async (
	ctx: MutationCtx,
	resource: Doc<"resources">,
	dryRun: boolean,
): Promise<number> => {
	const fileIds = [
		...new Set(
			[resource.fileId, resource.thumbnailFileId, resource.voiceFileId].filter(
				(id) => id !== undefined,
			),
		),
	];
	const files = await Promise.all(fileIds.map((id) => ctx.db.get(id)));
	const pending = files.filter((file) =>
		needsImportedResourceLink(resource, file),
	);
	if (!dryRun)
		for (const file of pending)
			if (file) await ctx.db.patch(file._id, { resourceId: resource._id });
	return pending.length;
};
