import { useBackend } from "../backend/context";
import {
	type ImageService,
	previewImageService,
} from "../backend/image-service";
import { useApp } from "../demo/app-state";

export const useImageService = (): ImageService | undefined => {
	const { source } = useApp();
	const { images } = useBackend();
	return source === "preview" ? previewImageService : images;
};
