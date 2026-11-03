import {
	type ResourceFilePurpose,
	resourceFileLimit,
	resourceMediaMime,
} from "../src/domain/resources";

export const resourceUploadStream = async (
	request: Request,
	purpose: ResourceFilePurpose,
): Promise<
	| { ok: false; status: number; error: string }
	| {
			ok: true;
			body: ReadableStream<Uint8Array>;
			mime: string;
			state: { bytes: number; exceeded: boolean };
	  }
> => {
	const limit = resourceFileLimit(purpose);
	const state = { bytes: 0, exceeded: false };
	if (Number(request.headers.get("Content-Length")) > limit)
		return { ok: false, status: 413, error: "This media file is too large." };
	const reader = request.body?.getReader();
	if (!reader) return { ok: false, status: 413, error: "Choose a media file." };
	const prefix: Uint8Array[] = [];
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		state.bytes += value.byteLength;
		if (state.bytes > limit) {
			await reader.cancel();
			return { ok: false, status: 413, error: "This media file is too large." };
		}
		prefix.push(value);
		if (state.bytes >= 64) break;
	}
	const signature = new Uint8Array(Math.min(64, state.bytes));
	const cursor = { offset: 0 };
	for (const chunk of prefix) {
		const part = chunk.subarray(0, signature.length - cursor.offset);
		signature.set(part, cursor.offset);
		cursor.offset += part.byteLength;
		if (cursor.offset === signature.length) break;
	}
	const mime = resourceMediaMime(
		signature,
		purpose,
		request.headers.get("Content-Type") ?? "",
		new URL(request.url).searchParams.get("name") ?? "",
	);
	if (!mime) {
		await reader.cancel();
		return {
			ok: false,
			status: 415,
			error: "This is not a supported media file.",
		};
	}
	const body = new ReadableStream<Uint8Array>({
		pull: async (controller): Promise<void> => {
			const buffered = prefix.shift();
			if (buffered) {
				controller.enqueue(buffered);
				return;
			}
			const { value, done } = await reader.read();
			if (done) {
				reader.releaseLock();
				controller.close();
				return;
			}
			state.bytes += value.byteLength;
			if (state.bytes > limit) {
				state.exceeded = true;
				await reader.cancel();
				controller.error(new Error("Media size limit exceeded."));
				return;
			}
			controller.enqueue(value);
		},
		cancel: async (): Promise<void> => {
			await reader.cancel();
		},
	});
	return { ok: true, body, mime, state };
};
