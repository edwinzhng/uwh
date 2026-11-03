import type { ReactElement } from "react";
import { MessagePhotoView } from "../design-system";
import type { MessageImage } from "../domain/messaging";
import { MessageFile } from "./message-file";
import { useImageService } from "./use-image-service";
import { usePhotoUri } from "./use-photo-uri";

type Props = { image: MessageImage; onRemove?: () => void; disabled?: boolean };
export const MessagePhoto = ({
	image,
	onRemove,
	disabled,
}: Props): ReactElement =>
	image.mime && !image.mime.startsWith("image/") ? (
		<MessageFile image={image} onRemove={onRemove} disabled={disabled} />
	) : (
		<Photo image={image} onRemove={onRemove} disabled={disabled} />
	);
const Photo = ({
	image,
	onRemove,
	disabled = false,
}: {
	image: MessageImage;
	onRemove?: () => void;
	disabled?: boolean;
}): ReactElement => {
	const service = useImageService();
	const photo = usePhotoUri(image.id, service);
	return (
		<MessagePhotoView
			name={image.name}
			uri={photo.uri}
			failed={photo.failed}
			onRetry={photo.retry}
			onRemove={onRemove}
			disabled={disabled}
		/>
	);
};
