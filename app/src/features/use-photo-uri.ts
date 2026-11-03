import { useEffect, useState } from "react";
import { createPhotoUri, releasePhotoUri } from "./photo-uri";

export const usePhotoUri = (
	photoId: string | undefined,
	service:
		| { load: (id: string, signal?: AbortSignal) => Promise<Blob> }
		| undefined,
): {
	uri?: string;
	failed: boolean;
	retry: () => void;
} => {
	const [photo, setPhoto] = useState<{
		id: string;
		attempt: number;
		uri?: string;
		failed?: boolean;
	}>();
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		if (!photoId || !service) return;
		const request = { active: true };
		const abort = new AbortController();
		const load = async (): Promise<void> => {
			try {
				const blob = await service.load(photoId, abort.signal);
				if (!request.active) return;
				const uri = await createPhotoUri(blob);
				if (request.active) setPhoto({ id: photoId, uri, attempt });
				else releasePhotoUri(uri);
			} catch {
				if (request.active) setPhoto({ id: photoId, failed: true, attempt });
			}
		};
		void load();
		return (): void => {
			request.active = false;
			abort.abort();
		};
	}, [photoId, service, attempt]);
	useEffect(() => {
		const uri = photo?.uri;
		return (): void => {
			if (uri) releasePhotoUri(uri);
		};
	}, [photo?.uri]);
	return {
		uri: photoId && photo?.id === photoId ? photo.uri : undefined,
		failed: Boolean(
			photoId &&
				photo?.id === photoId &&
				photo.attempt === attempt &&
				photo.failed,
		),
		retry: (): void => setAttempt((value) => value + 1),
	};
};
