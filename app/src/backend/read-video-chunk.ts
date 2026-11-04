import { Platform } from "react-native";

export const readVideoChunk = async (
	blob: Pick<Blob, "size" | "type" | "slice">,
	start: number,
	end: number,
	mime: string,
): Promise<Blob> => {
	if (Platform.OS === "web") return blob.slice(start, end, mime);
	const { File } = await import("expo-file-system");
	if (!(blob instanceof File)) return blob.slice(start, end, mime);
	const handle = blob.open();
	try {
		handle.offset = start;
		return new Blob([handle.readBytes(end - start)], { type: mime });
	} finally {
		handle.close();
	}
};
