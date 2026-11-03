import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const normalizeReviewAssets = async (
	directory: string,
): Promise<void> => {
	const input = resolve(directory, "assets/node_modules");
	if (!existsSync(input)) return;
	for await (const path of new Bun.Glob("**/*").scan({
		cwd: input,
		onlyFiles: true,
	}))
		await Bun.write(
			resolve(directory, "assets/vendor", path),
			Bun.file(resolve(input, path)),
		);
	const index = Bun.file(resolve(directory, "index.html"));
	if (!(await index.exists())) return;
	const entry = (await index.text())
		.match(/src="(\/app\/_expo\/static\/js\/web\/entry-[^"]+\.js)"/u)
		?.at(1);
	if (!entry) return;
	const entryFile = resolve(directory, entry.replace(/^\/app\//u, ""));
	const original = await Bun.file(entryFile).text();
	const normalized = original.replaceAll(
		"/app/assets/node_modules/",
		"/app/assets/vendor/",
	);
	const hash = new Bun.CryptoHasher("sha256")
		.update(normalized)
		.digest("hex")
		.slice(0, 32);
	const name = `entry-${hash}.js`;
	if (normalized !== original)
		await Bun.write(resolve(dirname(entryFile), name), normalized);
	const nextEntry =
		normalized === original
			? entry
			: `${entry.slice(0, entry.lastIndexOf("/") + 1)}${name}`;
	for await (const path of new Bun.Glob("**/*.html").scan({
		cwd: directory,
		onlyFiles: true,
	})) {
		const file = Bun.file(resolve(directory, path));
		const html = await file.text();
		const nextHtml = html
			.replaceAll(entry, nextEntry)
			.replaceAll("/app/assets/node_modules/", "/app/assets/vendor/");
		if (nextHtml !== html) await Bun.write(file, nextHtml);
	}
};
