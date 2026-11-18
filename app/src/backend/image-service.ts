import { imageLimits, imageMime, type MessageImage } from "../domain/messaging";
import { readImageBytes } from "./image-bytes";
import { createMediaMemoryCache } from "./media-memory-cache";

export type ImageService = {
	upload: (threadId: string, blob: Blob, name: string) => Promise<MessageImage>;
	load: (id: string, signal?: AbortSignal) => Promise<Blob>;
	remove: (id: string) => Promise<void>;
};

export const prepareImage = async (blob: Blob): Promise<Blob> => {
	if (!blob.size || blob.size > imageLimits.bytes)
		throw new Error("Choose a photo under 5 MB.");
	const mime = imageMime(
		new Uint8Array(await readImageBytes(blob.slice(0, 16))),
	);
	if (!mime) throw new Error("Choose a JPG, PNG or WebP photo.");
	return blob.slice(0, blob.size, mime);
};

export const createImageService = (
	token: string | (() => string | undefined),
	remove: (id: string) => Promise<void>,
): ImageService => {
	const site =
		process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??
		process.env.EXPO_PUBLIC_CONVEX_URL?.replace(
			".convex.cloud",
			".convex.site",
		).replace(":3210", ":3211");
	const cache = createMediaMemoryCache(10 * 1024 * 1024);
	const request = async (
		params: Record<string, string>,
		options: RequestInit = {},
		allowNotModified = false,
	): Promise<Response> => {
		const currentToken = typeof token === "function" ? token() : token;
		if (!currentToken || !site)
			throw new Error("Photo storage is unavailable.");
		const response = await fetch(
			`${site}/images?${new URLSearchParams(params)}`,
			{
				...options,
				headers: {
					...options.headers,
					Authorization: `Bearer ${currentToken}`,
				},
			},
		);
		if (!response.ok && !(allowNotModified && response.status === 304)) {
			const payload: { error?: string } = await response.json();
			throw new Error(payload.error ?? "Could not load photo.");
		}
		return response;
	};
	return {
		upload: async (threadId, blob, name): Promise<MessageImage> => {
			const response = await request(
				{
					thread: threadId,
					name,
					kind: blob.type.startsWith("image/") ? "photo" : "file",
				},
				{ method: "POST", body: blob, headers: { "Content-Type": blob.type } },
			);
			const image: MessageImage = await response.json();
			return image;
		},
		load: async (id, signal): Promise<Blob> => {
			const cached = cache.get(id);
			try {
				const response = await request(
					{ id },
					{
						signal,
						headers: cached ? { "If-None-Match": cached.etag } : undefined,
					},
					Boolean(cached),
				);
				if (response.status === 304 && cached) return cached.blob;
				const blob = await response.blob();
				const etag = response.headers.get("ETag");
				if (etag) cache.put(id, { blob, etag });
				else cache.remove(id);
				return blob;
			} catch (error) {
				cache.remove(id);
				throw error;
			}
		},
		remove: async (id): Promise<void> => {
			cache.remove(id);
			await remove(id);
		},
	};
};

const previewPhotos = new Map<string, Blob>();
export const previewImageService: ImageService = {
	upload: async (_threadId, blob, name): Promise<MessageImage> => {
		const id = crypto.randomUUID();
		previewPhotos.set(id, blob);
		return { id, name, mime: blob.type };
	},
	load: async (id): Promise<Blob> => {
		const blob = previewPhotos.get(id);
		if (!blob) throw new Error("Photo unavailable.");
		return blob;
	},
	remove: async (id): Promise<void> => {
		previewPhotos.delete(id);
	},
};
