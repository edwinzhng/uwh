import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { normalizeReviewAssets } from "./normalize-review-assets";

test("review exports normalize hosted dependencies without altering frozen entries", async (): Promise<void> => {
	const directory = await mkdtemp(join(tmpdir(), "uwh-review-assets-"));
	try {
		const original = 'const font = "/app/assets/node_modules/fonts/inter.ttf";';
		const entry = "_expo/static/js/web/entry-original.js";
		const html = `<style>@font-face{src:url('/app/assets/node_modules/fonts/inter.ttf')}</style><script src="/app/${entry}"></script>`;
		const bytes = new Uint8Array([0, 1, 2, 3]);
		await Bun.write(resolve(directory, entry), original);
		await Bun.write(resolve(directory, "index.html"), html);
		await Bun.write(resolve(directory, "resources.html"), html);
		await Bun.write(
			resolve(directory, "assets/node_modules/fonts/inter.ttf"),
			bytes,
		);
		await normalizeReviewAssets(directory);
		const nextHtml = await Bun.file(resolve(directory, "index.html")).text();
		const nextEntry = nextHtml.match(/src="\/app\/([^"]+)"/u)?.at(1);
		if (!nextEntry) throw new Error("Normalized export has no entry.");
		expect(nextEntry).not.toBe(entry);
		expect(nextHtml).toContain("/app/assets/vendor/fonts/inter.ttf");
		expect(nextHtml).not.toContain("/app/assets/node_modules/");
		expect(await Bun.file(resolve(directory, entry)).text()).toBe(original);
		expect(await Bun.file(resolve(directory, nextEntry)).text()).toBe(
			'const font = "/app/assets/vendor/fonts/inter.ttf";',
		);
		expect(await Bun.file(resolve(directory, "resources.html")).text()).toBe(
			nextHtml,
		);
		expect(
			new Uint8Array(
				await Bun.file(
					resolve(directory, "assets/vendor/fonts/inter.ttf"),
				).arrayBuffer(),
			),
		).toEqual(bytes);
		await Bun.write(
			resolve(directory, "index.html"),
			nextHtml.replaceAll("/app/assets/vendor/", "/app/assets/node_modules/"),
		);
		await normalizeReviewAssets(directory);
		expect(await Bun.file(resolve(directory, "index.html")).text()).toBe(
			nextHtml,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("review scaffolding can be generated before an app export exists", async (): Promise<void> => {
	const directory = await mkdtemp(join(tmpdir(), "uwh-review-assets-"));
	try {
		await normalizeReviewAssets(directory);
		expect(await Bun.file(resolve(directory, "index.html")).exists()).toBe(
			false,
		);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
