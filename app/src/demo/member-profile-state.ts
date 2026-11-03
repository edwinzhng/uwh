import { atom } from "jotai";
import type {
	MemberCapNumberSave,
	MemberProfileFields,
	MemberProfileSave,
} from "../domain/member-profile";
import {
	canEditMemberCapNumber,
	canEditMemberProfile,
	memberCapNumberError,
	memberProfileError,
	memberProfileLimits,
	normalizeMemberProfile,
} from "../domain/member-profile";
import { imageMime } from "../domain/messaging";
import { newId, previewAccountAtom, previewDataAtom } from "./app-state";

type ProfileRecord = MemberProfileFields & {
	revision: number;
	lastKey: string;
	lastActorId: string;
	lastPayload: string;
};
type PreviewProfilePhoto = {
	id: string;
	personId: string;
	ownerId: string;
	key: string;
	blob: Blob;
	digest: string;
	attached: boolean;
};
export const previewMemberProfiles = atom<Record<string, ProfileRecord>>({
	alex: {
		capNumber: 12,
		email: "alex@example.test",
		phone: "+1 403 555 0123",
		revision: 0,
		lastKey: "",
		lastActorId: "",
		lastPayload: "",
	},
	sam: {
		capNumber: 7,
		email: "family@example.test",
		phone: "",
		revision: 0,
		lastKey: "",
		lastActorId: "",
		lastPayload: "",
	},
});
export const previewProfilePhotos = atom<PreviewProfilePhoto[]>([]);
export const uploadPreviewProfilePhoto = atom(
	undefined,
	(
		get,
		set,
		input: {
			personId: string;
			actorId: string;
			key: string;
			blob: Blob;
			digest: string;
			bytes: Uint8Array;
		},
	): string => {
		const account = get(previewAccountAtom);
		const member = get(previewDataAtom).members.find(
			(entry) => entry.id === input.personId,
		);
		if (
			account.id !== input.actorId ||
			!member ||
			!canEditMemberProfile(account, member)
		)
			throw new Error("You can only edit active household profiles.");
		if (
			!input.blob.size ||
			input.blob.size > memberProfileLimits.photoBytes ||
			imageMime(input.bytes) !== input.blob.type ||
			input.key.length < 16 ||
			input.key.length > 100
		)
			throw new Error("Choose a JPG, PNG or WebP photo under 5 MB.");
		const photos = get(previewProfilePhotos);
		const existing = photos.find(
			(photo) => photo.ownerId === account.id && photo.key === input.key,
		);
		if (existing) {
			if (
				existing.personId !== input.personId ||
				existing.digest !== input.digest
			)
				throw new Error("This photo key was already used.");
			return existing.id;
		}
		if (
			photos.filter((photo) => photo.ownerId === account.id && !photo.attached)
				.length >= memberProfileLimits.pendingPhotos
		)
			throw new Error("Save or remove pending profile photos first.");
		const id = newId();
		set(previewProfilePhotos, [
			...photos,
			{
				id,
				personId: input.personId,
				ownerId: account.id,
				key: input.key,
				blob: input.blob,
				digest: input.digest,
				attached: false,
			},
		]);
		return id;
	},
);
export const savePreviewMemberProfile = atom(
	undefined,
	(get, set, input: MemberProfileSave & { actorId: string }): void => {
		const account = get(previewAccountAtom);
		const data = get(previewDataAtom);
		const person = data.members.find((member) => member.id === input.personId);
		if (
			account.id !== input.actorId ||
			!person ||
			!canEditMemberProfile(account, person)
		)
			throw new Error("You can only edit active household profiles.");
		const error = memberProfileError(input);
		if (error) throw new Error(error);
		if (input.key.length < 16 || input.key.length > 100)
			throw new Error("Reopen the profile editor and try again.");
		const fields = normalizeMemberProfile(input);
		const payload = JSON.stringify(fields);
		const previous = get(previewMemberProfiles)[person.id];
		if (previous?.lastKey === input.key) {
			if (
				previous.lastActorId !== account.id ||
				previous.lastPayload !== payload
			)
				throw new Error("This save key was already used for other details.");
			return;
		}
		if (
			(previous?.revision ?? 0) !== input.revision ||
			person.name !== input.expectedName
		)
			throw new Error(
				"Profile changed in another session. Close and reopen to review the latest details.",
			);
		if (
			fields.capNumber !== previous?.capNumber &&
			!canEditMemberCapNumber(account, person)
		)
			throw new Error("Only assigned coaches can change cap numbers.");

		const photos = get(previewProfilePhotos);
		if (fields.photoId) {
			const photo = photos.find((entry) => entry.id === fields.photoId);
			if (
				!photo ||
				(photo.personId !== person.id && photo.id !== previous?.photoId) ||
				(photo.id !== previous?.photoId &&
					(photo.ownerId !== account.id || photo.attached))
			)
				throw new Error("Photo unavailable. Choose the photo again.");
		}
		set(previewMemberProfiles, (current) => ({
			...current,
			[person.id]: {
				...fields,
				revision: (previous?.revision ?? 0) + 1,
				lastKey: input.key,
				lastActorId: account.id,
				lastPayload: payload,
			},
		}));
		set(previewDataAtom, {
			...data,
			members: data.members.map((member) =>
				member.id === person.id ? { ...member, name: fields.name } : member,
			),
		});
		set(
			previewProfilePhotos,
			photos
				.filter(
					(photo) =>
						!previous?.photoId ||
						photo.id !== previous.photoId ||
						photo.id === fields.photoId ||
						Object.entries(get(previewMemberProfiles)).some(
							([id, profile]) =>
								id !== person.id && profile.photoId === photo.id,
						),
				)
				.map((photo) =>
					photo.id === fields.photoId ? { ...photo, attached: true } : photo,
				),
		);
	},
);

export const savePreviewMemberCapNumber = atom(
	undefined,
	(get, set, input: MemberCapNumberSave & { actorId: string }): void => {
		const account = get(previewAccountAtom);
		const person = get(previewDataAtom).members.find(
			(entry) => entry.id === input.personId,
		);
		if (
			account.id !== input.actorId ||
			!person ||
			!canEditMemberCapNumber(account, person)
		)
			throw new Error("Only assigned coaches can change cap numbers.");
		const error = memberCapNumberError(input.capNumber);
		if (error) throw new Error(error);
		if (input.key.length < 16 || input.key.length > 100)
			throw new Error("Reopen the cap number editor and try again.");
		const capNumber = input.capNumber.trim()
			? Number(input.capNumber.trim())
			: undefined;
		const payload = JSON.stringify({ capNumber });
		const previous = get(previewMemberProfiles)[person.id];
		if (previous?.lastKey === input.key) {
			if (
				previous.lastActorId !== account.id ||
				previous.lastPayload !== payload
			)
				throw new Error("This save key was already used for other details.");
			return;
		}
		if ((previous?.revision ?? 0) !== input.revision)
			throw new Error(
				"Profile changed in another session. Close and reopen to review the latest details.",
			);
		set(previewMemberProfiles, (current) => ({
			...current,
			[person.id]: {
				email: previous?.email ?? "",
				phone: previous?.phone ?? "",
				photoId: previous?.photoId,
				capNumber,
				revision: (previous?.revision ?? 0) + 1,
				lastKey: input.key,
				lastActorId: account.id,
				lastPayload: payload,
			},
		}));
	},
);
