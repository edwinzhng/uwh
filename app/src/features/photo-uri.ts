export const createPhotoUri = (blob: Blob): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void =>
			typeof reader.result === "string"
				? resolve(reader.result)
				: reject(new Error("Could not load photo."));
		reader.onerror = (): void => reject(new Error("Could not load photo."));
		reader.readAsDataURL(blob);
	});
export const releasePhotoUri = (_uri: string): void => undefined;
