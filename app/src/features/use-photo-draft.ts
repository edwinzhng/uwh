import * as ImagePicker from "expo-image-picker";
import { atom, useAtom } from "jotai";
import { useRef, useState } from "react";
import { friendlyError } from "../backend/errors";
import { prepareImage } from "../backend/image-service";
import { useApp } from "../demo/app-state";
import { imageLimits, type MessageImage } from "../domain/messaging";
import { useImageService } from "./use-image-service";

const draftsAtom = atom<Record<string, MessageImage[]>>({});
type PhotoDraft = {
	photos: MessageImage[];
	pending: boolean;
	error?: string;
	pick: () => Promise<void>;
	remove: (id: string) => Promise<void>;
	clear: () => void;
};
export const usePhotoDraft = (threadId: string): PhotoDraft => {
	const { account, source } = useApp();
	const service = useImageService();
	const key = `${source}:${account.id}:${threadId}`;
	const [drafts, setDrafts] = useAtom(draftsAtom);
	const photos = drafts[key] ?? [];
	const [pending, setPending] = useState(false);
	const working = useRef(false);
	const [error, setError] = useState<string>();
	const pick = async (): Promise<void> => {
		if (!service || working.current || photos.length >= imageLimits.perMessage)
			return;
		working.current = true;
		setPending(true);
		setError(undefined);
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsMultipleSelection: true,
				selectionLimit: imageLimits.perMessage - photos.length,
				quality: 0.85,
				exif: false,
			});
			if (!result.canceled) {
				for (const asset of result.assets.slice(
					0,
					imageLimits.perMessage - photos.length,
				)) {
					const blob = await prepareImage(
						asset.file ?? (await (await fetch(asset.uri)).blob()),
					);
					const image = await service.upload(
						threadId,
						blob,
						asset.fileName ?? "Photo",
					);
					setDrafts((current) => ({
						...current,
						[key]: [...(current[key] ?? []), image],
					}));
				}
			}
		} catch (error) {
			setError(friendlyError(error));
		} finally {
			working.current = false;
			setPending(false);
		}
	};
	const remove = async (id: string): Promise<void> => {
		if (!service || working.current) return;
		working.current = true;
		setPending(true);
		setError(undefined);
		try {
			await service.remove(id);
			setDrafts((current) => ({
				...current,
				[key]: (current[key] ?? []).filter((photo) => photo.id !== id),
			}));
		} catch (error) {
			setError(friendlyError(error));
		} finally {
			working.current = false;
			setPending(false);
		}
	};
	return {
		photos,
		pending,
		error,
		pick,
		remove,
		clear: (): void => setDrafts((current) => ({ ...current, [key]: [] })),
	};
};
