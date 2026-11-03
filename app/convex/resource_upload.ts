export const finishResourceUpload = async <T>(
	ingest: () => Promise<T>,
	discard: () => Promise<void>,
): Promise<T> => {
	try {
		return await ingest();
	} catch (error) {
		await discard();
		throw error;
	}
};
