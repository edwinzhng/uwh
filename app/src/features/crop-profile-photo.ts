import { prepareImage } from "../backend/image-service";
import {
	type PhotoCrop,
	type PhotoSource,
	photoCropRectangle,
} from "../domain/photo-crop";
import { requireNativeFeature } from "../platform/native-feature";

export const cropProfilePhoto = async (
	source: PhotoSource,
	crop: PhotoCrop,
): Promise<Blob> => {
	requireNativeFeature("ExpoImageManipulator", "photo cropping");
	const { ImageManipulator, SaveFormat } = await import(
		"expo-image-manipulator"
	);
	const context = ImageManipulator.manipulate(source.uri);
	try {
		const rectangle = photoCropRectangle(source, crop);
		context.crop(rectangle).resize({ width: 512, height: 512 });
		const image = await context.renderAsync();
		try {
			const result = await image.saveAsync({
				format: SaveFormat.JPEG,
				compress: 0.9,
			});
			return await prepareImage(await (await fetch(result.uri)).blob());
		} finally {
			image.release();
		}
	} finally {
		context.release();
	}
};
