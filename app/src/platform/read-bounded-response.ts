export const readBoundedResponse = async (
	response: Response,
	limit: number,
): Promise<Uint8Array> => {
	if (
		!response.ok ||
		!response.body ||
		Number(response.headers.get("content-length")) > limit
	) {
		await response.body?.cancel();
		throw new Error("Document unavailable.");
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	const state = { bytes: 0 };
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			state.bytes += chunk.value.byteLength;
			if (state.bytes > limit) {
				await reader.cancel();
				throw new Error("Document exceeds the size limit.");
			}
			chunks.push(chunk.value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(state.bytes);
	const cursor = { offset: 0 };
	for (const chunk of chunks) {
		bytes.set(chunk, cursor.offset);
		cursor.offset += chunk.byteLength;
	}
	return bytes;
};
