import { useAuthToken } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useAtomValue } from "jotai";
import { type ReactElement, type ReactNode, useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { createProfilePhotoService } from "../backend/profile-photo-service";
import { useApp } from "../demo/app-state";
import {
	previewMemberProfiles,
	previewProfilePhotos,
} from "../demo/member-profile-state";
import { type AvatarPhoto, AvatarSourceContext } from "../design-system";
import { createPhotoUri, releasePhotoUri } from "./photo-uri";
import { createPhotoUriCache } from "./photo-uri-cache";

const PhotoSource = ({
	children,
	photos,
	load,
}: {
	children: ReactNode;
	photos: readonly AvatarPhoto[];
	load: (id: string, signal?: AbortSignal) => Promise<Blob>;
}): ReactElement => {
	const cache = useMemo(
		() =>
			createPhotoUriCache({
				load,
				createUri: createPhotoUri,
				releaseUri: releasePhotoUri,
			}),
		[load],
	);
	useEffect(() => (): void => cache.clear(), [cache]);
	useEffect(
		(): void =>
			cache.prune(
				new Set(
					photos.flatMap((photo) => (photo.photoId ? [photo.photoId] : [])),
				),
			),
		[cache, photos],
	);
	const value = useMemo(() => ({ photos, load: cache.load }), [photos, cache]);
	return (
		<AvatarSourceContext.Provider value={value}>
			{children}
		</AvatarSourceContext.Provider>
	);
};

const LiveAvatars = ({ children }: { children: ReactNode }): ReactElement => {
	const token = useAuthToken() ?? undefined;
	const photos = useQuery(api.member_profiles.avatars, {});
	const load = useMemo(
		() =>
			createProfilePhotoService(token, async (): Promise<void> => {
				throw new Error("Use the profile editor to remove a photo.");
			}).load,
		[token],
	);
	return (
		<PhotoSource photos={photos ?? []} load={load}>
			{children}
		</PhotoSource>
	);
};

const PreviewAvatars = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const { data } = useApp();
	const records = useAtomValue(previewMemberProfiles);
	const images = useAtomValue(previewProfilePhotos);
	const photos = useMemo(
		() =>
			data.members.map((member) => ({
				personId: member.id,
				name: member.name,
				photoId: records[member.id]?.photoId,
			})),
		[data.members, records],
	);
	const load = useMemo(
		() =>
			async (id: string): Promise<Blob> => {
				const image = images.find((entry) => entry.id === id && entry.attached);
				if (!image) throw new Error("Photo unavailable.");
				return image.blob;
			},
		[images],
	);
	return (
		<PhotoSource photos={photos} load={load}>
			{children}
		</PhotoSource>
	);
};

export const AvatarProvider = ({
	children,
}: {
	children: ReactNode;
}): ReactElement => {
	const { source, account } = useApp();
	return source === "convex" ? (
		<LiveAvatars key={account.id}>{children}</LiveAvatars>
	) : (
		<PreviewAvatars key={account.id}>{children}</PreviewAvatars>
	);
};
