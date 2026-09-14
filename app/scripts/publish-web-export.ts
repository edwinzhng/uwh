import {
	copyFile,
	mkdir,
	mkdtemp,
	readdir,
	rename,
	rm,
} from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const exportFiles = async (directory: string): Promise<string[]> => {
	const entries = await readdir(directory, { withFileTypes: true });
	return (
		await Promise.all(
			entries.map(
				async (entry): Promise<string[]> =>
					entry.isDirectory()
						? exportFiles(join(directory, entry.name))
						: entry.isFile()
							? [join(directory, entry.name)]
							: [],
			),
		)
	).flat();
};
const publishFile = async (
	source: string,
	destination: string,
): Promise<void> => {
	await mkdir(dirname(destination), { recursive: true });
	const temporary = `${destination}.publish-${crypto.randomUUID()}`;
	try {
		await copyFile(source, temporary);
		await rename(temporary, destination);
	} finally {
		await rm(temporary, { force: true });
	}
};
export const publishWebExport = async (
	staging: string,
	destination: string,
): Promise<void> => {
	const entry = join(staging, "index.html");
	if (!(await Bun.file(entry).exists()))
		throw new Error(
			"Web export did not produce index.html. Existing build kept.",
		);
	const files = await exportFiles(staging);
	const pages = files.filter((file) => file.endsWith(".html"));
	for (const page of pages) {
		const html = await Bun.file(page).text();
		const assets = [
			...html.matchAll(
				/(?:src|href)=["']\/?((?:_expo|assets)\/[^"'?#]+)(?:[?#][^"']*)?["']/g,
			),
		].flatMap((match) => (match.at(1) ? [match.at(1)] : []));
		for (const asset of assets) {
			if (!asset) continue;
			const path = resolve(staging, asset);
			if (
				!path.startsWith(`${resolve(staging)}/`) ||
				!(await Bun.file(path).exists())
			)
				throw new Error(
					"Web export references a missing asset. Existing build kept.",
				);
		}
	}
	for (const file of [
		...files.filter((file) => !file.endsWith(".html")),
		...pages,
	])
		await publishFile(file, join(destination, relative(staging, file)));
};
export const buildWebExport = async (
	root: string,
	exportSite: (staging: string) => Promise<number>,
): Promise<void> => {
	const stagingRoot = join(root, ".expo");
	await mkdir(stagingRoot, { recursive: true });
	const staging = await mkdtemp(join(stagingRoot, "web-export-"));
	try {
		const status = await exportSite(staging);
		if (status !== 0)
			throw new Error(`Web export failed (${status}). Existing build kept.`);
		await publishWebExport(staging, join(root, "dist"));
	} finally {
		await rm(staging, { recursive: true, force: true });
	}
};
