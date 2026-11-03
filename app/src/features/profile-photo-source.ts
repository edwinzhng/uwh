import { photoDimensions } from "../design-system";
import { memberProfileLimits } from "../domain/member-profile";
import type { PhotoSource } from "../domain/photo-crop";
import { createPhotoUri, releasePhotoUri } from "./photo-uri";

export const profilePhotoSource = async (blob: Blob): Promise<PhotoSource> => {
	if (!blob.size || blob.size > memberProfileLimits.photoBytes)
		throw new Error("Choose a photo under 5 MB.");
	const uri = await createPhotoUri(blob);
	try {
		const size = await photoDimensions(uri);
		return { uri, ...size };
	} catch {
		releasePhotoUri(uri);
		throw new Error("This photo could not be opened. Choose another photo.");
	}
};
