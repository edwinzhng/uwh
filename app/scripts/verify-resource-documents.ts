import assert from "node:assert/strict";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { ResourceFile } from "../src/domain/resources";
import {
	verificationDocuments,
	verificationZip,
} from "./verification-documents";
import { createVerificationRun } from "./verification-fixtures";

const run = createVerificationRun("resources-documents");
const site = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
if (site !== "http://127.0.0.1:3211") throw new Error("Local backend only.");
try {
	const owner = await run.fixture("Document format coach");
	await owner.client.mutation(api.club.create, {
		name: "Fictional document formats",
		samples: false,
	});
	const upload = (
		name: string,
		mime: string,
		bytes: Uint8Array,
	): Promise<Response> =>
		fetch(
			`${site}/resources/file?${new URLSearchParams({ name, purpose: "document" })}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${owner.token}`,
					"Content-Type": mime,
				},
				body: Uint8Array.from(bytes).buffer,
			},
		);
	for (const file of verificationDocuments) {
		const uploaded = await upload(file.name, file.mime, file.bytes);
		assert.equal(uploaded.status, 200, await uploaded.clone().text());
		const registered: ResourceFile = await uploaded.json();
		const id = await owner.client.mutation(api.resources.save, {
			key: crypto.randomUUID(),
			revision: 0,
			title: file.name,
			description: "Synthetic format verification",
			kind: "document",
			audience: "club",
			personIds: [],
			fileId: registered.id as Id<"resourceFiles">,
		});
		const downloaded: Response = await fetch(
			`${site}/resources/file?id=${id}`,
			{
				headers: { Authorization: `Bearer ${owner.token}` },
			},
		);
		assert.equal(downloaded.status, 200);
		assert.equal(downloaded.headers.get("content-type"), file.mime);
		assert.match(
			downloaded.headers.get("content-disposition") ?? "",
			/^attachment;/,
		);
		assert.equal(downloaded.headers.get("x-content-type-options"), "nosniff");
		assert.deepEqual(
			new Uint8Array(await downloaded.arrayBuffer()),
			file.bytes,
		);
	}
	for (const [name, mime, bytes, status] of [
		[
			"malicious.html",
			"text/html",
			new TextEncoder().encode("<html></html>"),
			415,
		],
		[
			"malicious.exe",
			"text/plain",
			new TextEncoder().encode("Fictional executable"),
			415,
		],
		[
			"masked.txt",
			"text/plain",
			new TextEncoder().encode("<html>active content</html>"),
			415,
		],
		[
			"malformed.docx",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			verificationZip([{ name: "unrelated", text: "not office" }]),
			409,
		],
	] as const)
		assert.equal((await upload(name, mime, bytes)).status, status);
	console.log(
		"Protected document formats verified: DOCX/XLSX/PPTX, ODT/ODS/ODP, CSV and UTF-8 text round-trip identical bytes with attachment/nosniff; HTML/executables, disguised active text and invalid Office packages rejected. Synthetic records erased in final cleanup.",
	);
} finally {
	await run.close();
}
