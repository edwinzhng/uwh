export const boundedBlob = async (
	request: Request,
	limit: number,
): Promise<Blob | undefined> => {
	if (Number(request.headers.get("Content-Length")) > limit) return undefined;
	const reader = request.body?.getReader();
	if (!reader) return undefined;
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	const size = { bytes: 0 };
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size.bytes += value.byteLength;
			if (size.bytes > limit) {
				await reader.cancel();
				return undefined;
			}
			chunks.push(value);
		}
		return new Blob(chunks, {
			type: request.headers.get("Content-Type") ?? "",
		});
	} finally {
		reader.releaseLock();
	}
};
