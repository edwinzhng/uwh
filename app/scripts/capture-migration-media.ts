import { createHash } from "node:crypto";
import { mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import Papa from "papaparse";

const root = resolve(import.meta.dir, "../../data/migration-2026-11-01");
const parsed = Papa.parse<Record<string, string>>(
	await Bun.file(resolve(root, "base44/VideoClip_export.csv")).text(),
	{ header: true, skipEmptyLines: true },
);
if (parsed.errors.length) throw new Error("Video CSV has parse errors.");
const directory = resolve(root, "base44-media");
await mkdir(directory, { recursive: true, mode: 0o700 });
const outcomes: {
	id: string;
	status: string;
	bytes?: number;
	sha256?: string;
}[] = [];
const fetchVideo = async (url: URL, redirects = 0): Promise<Response> => {
	if (
		redirects > 3 ||
		url.protocol !== "https:" ||
		!["base44.app", "media.base44.com"].includes(url.hostname)
	)
		throw new Error("Video redirect requires review.");
	const response = await fetch(url, {
		redirect: "manual",
		signal: AbortSignal.timeout(30000),
	});
	const location = response.headers.get("location");
	if (response.status >= 300 && response.status < 400 && location) {
		await response.body?.cancel();
		return fetchVideo(new URL(location, url), redirects + 1);
	}
	return response;
};
for (const row of parsed.data) {
	const url = new URL(row.video_url ?? "");
	if (url.protocol !== "https:" || url.hostname !== "base44.app") {
		outcomes.push({ id: row.id ?? "", status: "external-link-preserved" });
		continue;
	}
	if (!row.id || !/^[a-zA-Z0-9_-]+$/.test(row.id))
		throw new Error("Invalid source video ID.");
	const file = resolve(directory, `${row.id}.video`);
	if (await Bun.file(file).exists()) {
		const bytes = await Bun.file(file).arrayBuffer();
		outcomes.push({
			id: row.id,
			status: "saved",
			bytes: bytes.byteLength,
			sha256: createHash("sha256").update(Buffer.from(bytes)).digest("hex"),
		});
		continue;
	}
	const outcome = await (async (): Promise<(typeof outcomes)[number]> => {
		try {
			const response = await fetchVideo(url);
			if (!response.ok)
				return { id: row.id ?? "", status: `http-${response.status}` };
			if (!response.body) return { id: row.id ?? "", status: "missing-body" };
			const mime = response.headers.get("content-type") ?? "";
			if (
				!mime.startsWith("video/") &&
				!mime.startsWith("application/octet-stream")
			) {
				await response.body.cancel();
				return { id: row.id ?? "", status: "unexpected-content-type" };
			}
			const state = { bytes: 0 };
			const hash = createHash("sha256");
			const bounded = response.body.pipeThrough(
				new TransformStream<Uint8Array, Uint8Array>({
					transform: (chunk, controller): void => {
						state.bytes += chunk.byteLength;
						if (state.bytes > 250 * 1024 * 1024)
							throw new Error("Video exceeds the local capture size limit.");
						hash.update(chunk);
						controller.enqueue(chunk);
					},
				}),
			);
			await Bun.write(`${file}.part`, new Response(bounded));
			await rename(`${file}.part`, file);
			return {
				id: row.id ?? "",
				status: "saved",
				bytes: state.bytes,
				sha256: hash.digest("hex"),
			};
		} catch {
			return { id: row.id ?? "", status: "download-incomplete-retry-required" };
		}
	})();
	outcomes.push(outcome);
	await Bun.write(
		resolve(directory, "manifest.json"),
		JSON.stringify(outcomes),
	);
	console.log(`${outcomes.length}/${parsed.data.length}: ${outcome.status}`);
}
await Bun.write(resolve(directory, "manifest.json"), JSON.stringify(outcomes));
console.log({
	saved: outcomes.filter((outcome) => outcome.status === "saved").length,
	externalLinks: outcomes.filter(
		(outcome) => outcome.status === "external-link-preserved",
	).length,
	remaining: outcomes.filter(
		(outcome) => !["saved", "external-link-preserved"].includes(outcome.status),
	).length,
});
