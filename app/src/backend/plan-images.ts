import type { ResourceFile } from "../domain/resources";
import { prepareImage } from "./image-service";

export type PlanImages = {
	upload: (blob: Blob, name: string) => Promise<ResourceFile>;
	read: (fileId: string) => Promise<Blob>;
};
const previewImages = new Map<string, { blob: Blob; ownerId: string }>();
export const createPreviewPlanImages = (access: {
	actorId: () => string;
	canUpload: () => boolean;
	canRead: (fileId: string, ownerId: string) => boolean;
}): PlanImages => ({
	upload: async (blob, name): Promise<ResourceFile> => {
		if (!access.canUpload()) throw new Error("Coach access required.");
		const image = await prepareImage(blob);
		const id = crypto.randomUUID();
		previewImages.set(id, { blob: image, ownerId: access.actorId() });
		return { id, name, mime: image.type, size: image.size };
	},
	read: async (fileId): Promise<Blob> => {
		const image = previewImages.get(fileId);
		if (!image || !access.canRead(fileId, image.ownerId))
			throw new Error("Image unavailable.");
		return image.blob;
	},
});
export const createPlanImages = (token: string | undefined): PlanImages => {
	const site =
		process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
		process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
			".convex.cloud",
			".convex.site",
		).replace(":3210", ":3211");
	const request = async (
		params: Record<string, string>,
		options: RequestInit = {},
	): Promise<Response> => {
		if (!site || !token) throw new Error("Sign in to use plan images.");
		const response = await fetch(
			`${site}/resources/file?${new URLSearchParams(params)}`,
			{
				...options,
				headers: { ...options.headers, Authorization: `Bearer ${token}` },
			},
		);
		if (!response.ok)
			throw new Error("Could not load or upload this plan image.");
		return response;
	};
	return {
		upload: async (blob, name): Promise<ResourceFile> => {
			const image = await prepareImage(blob);
			return (
				await request(
					{ name, purpose: "document" },
					{
						method: "POST",
						body: image,
						headers: { "Content-Type": image.type },
					},
				)
			).json();
		},
		read: async (fileId): Promise<Blob> =>
			(await request({ planImage: fileId })).blob(),
	};
};
