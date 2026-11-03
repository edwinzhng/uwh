import { useAuthToken } from "@convex-dev/auth/react";
import { sha256 } from "@oslojs/crypto/sha2";
import { useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { previewAccountAtom, previewDataAtom, useApp } from "../demo/app-state";
import {
	previewMemberProfiles,
	previewProfilePhotos,
	savePreviewMemberCapNumber,
	savePreviewMemberProfile,
	uploadPreviewProfilePhoto,
} from "../demo/member-profile-state";
import type { Member } from "../domain/app-types";
import {
	canEditMemberProfile,
	type MemberCapNumberSave,
	type MemberProfile,
	type MemberProfileSave,
	memberProfileProjection,
} from "../domain/member-profile";
import { readImageBytes } from "./image-bytes";
import {
	createProfilePhotoService,
	type ProfilePhotoService,
} from "./profile-photo-service";

export type MemberProfileState = {
	profile?: MemberProfile;
	loading: boolean;
	save: (input: MemberProfileSave) => Promise<void>;
	saveCapNumber: (input: MemberCapNumberSave) => Promise<void>;
	photos: ProfilePhotoService;
};
export const useLiveMemberProfile = (member: Member): MemberProfileState => {
	const profile = useQuery(api.member_profiles.read, { personId: member.id });
	const save = useMutation(api.member_profiles.save);
	const saveCapNumber = useMutation(api.member_profiles.saveCapNumber);
	const remove = useMutation(api.member_profile_photos.remove);
	const token = useAuthToken() ?? undefined;
	const photos = useMemo(
		() =>
			createProfilePhotoService(token, async (photoId): Promise<void> => {
				await remove({ photoId });
			}),
		[token, remove],
	);
	return {
		profile,
		loading: profile === undefined,
		save: async (input): Promise<void> => {
			await save(input);
		},
		saveCapNumber: async (input): Promise<void> => {
			await saveCapNumber(input);
		},
		photos,
	};
};
export const usePreviewMemberProfile = (member: Member): MemberProfileState => {
	const { account } = useApp();
	const records = useAtomValue(previewMemberProfiles);
	const save = useSetAtom(savePreviewMemberProfile);
	const saveCapNumber = useSetAtom(savePreviewMemberCapNumber);
	const upload = useSetAtom(uploadPreviewProfilePhoto);
	const store = useStore();
	const photos = useMemo(
		(): ProfilePhotoService => ({
			upload: async (personId, blob, key): Promise<string> => {
				const bytes = new Uint8Array(await readImageBytes(blob));
				return upload({
					personId,
					blob,
					key,
					actorId: account.id,
					bytes,
					digest: Array.from(sha256(bytes), (byte) =>
						byte.toString(16).padStart(2, "0"),
					).join(""),
				});
			},
			load: async (id): Promise<Blob> => {
				const photo = store
					.get(previewProfilePhotos)
					.find((entry) => entry.id === id);
				const actor = store.get(previewAccountAtom);
				const person = photo
					? store
							.get(previewDataAtom)
							.members.find((entry) => entry.id === photo.personId)
					: undefined;
				if (
					!photo ||
					!person ||
					actor.id !== account.id ||
					(!photo.attached &&
						(photo.ownerId !== account.id ||
							!canEditMemberProfile(actor, person)))
				)
					throw new Error("Photo unavailable.");
				return photo.blob;
			},
			remove: async (id): Promise<void> => {
				if (store.get(previewAccountAtom).id !== account.id)
					throw new Error("Account changed. Reopen the profile editor.");
				const current = store.get(previewProfilePhotos);
				const photo = current.find((entry) => entry.id === id);
				if (photo && (photo.attached || photo.ownerId !== account.id))
					throw new Error("Save the profile to remove its current photo.");
				store.set(
					previewProfilePhotos,
					current.filter((entry) => entry.id !== id),
				);
			},
		}),
		[account.id, store, upload],
	);
	return {
		profile: memberProfileProjection(account, member, records[member.id]),
		loading: false,
		save: async (input): Promise<void> => {
			save({ ...input, actorId: account.id });
		},
		saveCapNumber: async (input): Promise<void> => {
			saveCapNumber({ ...input, actorId: account.id });
		},
		photos,
	};
};
