export const readMediaFile = async (
	uri: string,
	mime?: string,
): Promise<Blob> => {
	const response = await fetch(uri);
	if (!response.ok) throw new Error("Could not read the selected media file.");
	const blob = await response.blob();
	return mime && !blob.type ? blob.slice(0, blob.size, mime) : blob;
};
