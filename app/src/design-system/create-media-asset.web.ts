import type { MediaAsset } from "./media-types";

export const createMediaAsset = async (
	bytes: ArrayBuffer,
	_name: string,
	mime: string,
): Promise<MediaAsset> => {
	const uri = URL.createObjectURL(new Blob([bytes], { type: mime }));
	return { uri, dispose: (): void => URL.revokeObjectURL(uri) };
};
