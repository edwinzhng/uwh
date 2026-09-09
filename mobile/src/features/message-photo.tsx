import { type ReactElement, useEffect, useState } from "react";
import { MessagePhotoView } from "../design-system";
import type { MessageImage } from "../domain/messaging";
import { createPhotoUri, releasePhotoUri } from "./photo-uri";
import { useImageService } from "./use-image-service";

export const MessagePhoto = ({
	image,
	onRemove,
	disabled = false,
}: {
	image: MessageImage;
	onRemove?: () => void;
	disabled?: boolean;
}): ReactElement => {
	const service = useImageService();
	const [photo, setPhoto] = useState<{
		id: string;
		attempt: number;
		uri?: string;
		failed?: boolean;
	}>();
	const [retry, setRetry] = useState(0);
	useEffect(() => {
		const request = { active: true, uri: "" };
		const controller = new AbortController();
		setPhoto(undefined);
		const load = async (): Promise<void> => {
			try {
				if (!service) throw new Error("Photo unavailable.");
				const uri = await createPhotoUri(
					await service.load(image.id, controller.signal),
				);
				request.uri = uri;
				if (request.active) setPhoto({ id: image.id, uri, attempt: retry });
				else releasePhotoUri(uri);
			} catch {
				if (request.active)
					setPhoto({ id: image.id, failed: true, attempt: retry });
			}
		};
		void load();
		return (): void => {
			request.active = false;
			controller.abort();
			if (request.uri) releasePhotoUri(request.uri);
		};
	}, [image.id, service, retry]);
	return (
		<MessagePhotoView
			name={image.name}
			uri={photo?.id === image.id ? photo.uri : undefined}
			failed={photo?.id === image.id && photo.failed}
			onRetry={(): void => setRetry((value) => value + 1)}
			onRemove={onRemove}
			disabled={disabled}
		/>
	);
};
