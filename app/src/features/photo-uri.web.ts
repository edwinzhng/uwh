export const createPhotoUri = async (blob: Blob): Promise<string> =>
	URL.createObjectURL(blob);
export const releasePhotoUri = (uri: string): void => URL.revokeObjectURL(uri);
