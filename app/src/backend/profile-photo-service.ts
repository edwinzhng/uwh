export type ProfilePhotoService = {
	upload: (personId: string, blob: Blob, key: string) => Promise<string>;
	load: (id: string, signal?: AbortSignal) => Promise<Blob>;
	remove: (id: string) => Promise<void>;
};
export const createProfilePhotoService = (
	token: string | undefined | (() => string | undefined),
	remove: (id: string) => Promise<void>,
): ProfilePhotoService => {
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
		const currentToken = typeof token === "function" ? token() : token;
		if (!currentToken || !site)
			throw new Error("Sign in to use profile photos.");
		const response = await fetch(
			`${site}/profiles/photo?${new URLSearchParams(params)}`,
			{
				...options,
				headers: {
					...options.headers,
					Authorization: `Bearer ${currentToken}`,
				},
			},
		);
		if (!response.ok) {
			const payload: { error?: string } = await response.json();
			throw new Error(payload.error ?? "Could not load profile photo.");
		}
		return response;
	};
	return {
		upload: async (personId, blob, key): Promise<string> => {
			const response = await request(
				{ person: personId, key },
				{ method: "POST", body: blob, headers: { "Content-Type": blob.type } },
			);
			const payload: { id: string } = await response.json();
			return payload.id;
		},
		load: async (id, signal): Promise<Blob> =>
			(await request({ id }, { signal })).blob(),
		remove,
	};
};
