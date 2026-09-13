export type JsonBody =
	| { value: unknown; error?: never }
	| { error: Response; value?: never };
export const readJsonBody = async (
	request: Request,
	limit: number,
): Promise<JsonBody> => {
	const tooLarge = (): JsonBody => ({
		error: Response.json({ error: "Request is too large." }, { status: 413 }),
	});
	if (Number(request.headers.get("content-length")) > limit) return tooLarge();
	const reader = request.body?.getReader();
	if (!reader)
		return {
			error: Response.json({ error: "Invalid request." }, { status: 400 }),
		};
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	const size = { bytes: 0 };
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size.bytes += value.byteLength;
			if (size.bytes > limit) {
				await reader.cancel();
				return tooLarge();
			}
			chunks.push(value);
		}
		return { value: JSON.parse(await new Blob(chunks).text()) };
	} catch {
		return {
			error: Response.json({ error: "Invalid request." }, { status: 400 }),
		};
	} finally {
		reader.releaseLock();
	}
};
