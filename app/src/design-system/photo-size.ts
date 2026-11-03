import { Image } from "react-native";

export const photoDimensions = (
	uri: string,
): Promise<{ width: number; height: number }> =>
	new Promise((resolve, reject) =>
		Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
	);
