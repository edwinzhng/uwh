import { createContext } from "react";

export type AvatarPhoto = { personId: string; name: string; photoId?: string };
export type AvatarSource = {
	photos: readonly AvatarPhoto[];
	load: (id: string) => Promise<string | undefined>;
};
export const AvatarSourceContext = createContext<AvatarSource | undefined>(
	undefined,
);

const indexes = new WeakMap<
	readonly AvatarPhoto[],
	{
		people: Map<string, string | undefined>;
		names: Map<string, string | undefined>;
	}
>();
export const avatarPhotoId = (
	photos: readonly AvatarPhoto[],
	name: string,
	personId?: string,
): string | undefined => {
	const cached = indexes.get(photos);
	const index = cached ?? {
		people: new Map<string, string | undefined>(),
		names: new Map<string, string | undefined>(),
	};
	if (!cached) {
		for (const photo of photos) {
			const normalized = photo.name.trim().toLowerCase();
			index.people.set(
				photo.personId,
				index.people.has(photo.personId) ? undefined : photo.photoId,
			);
			index.names.set(
				normalized,
				index.names.has(normalized) ? undefined : photo.photoId,
			);
		}
		indexes.set(photos, index);
	}
	return personId
		? index.people.get(personId)
		: index.names.get(name.trim().toLowerCase());
};
