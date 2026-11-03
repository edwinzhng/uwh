import { cp, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const syncPdfAssets = async (): Promise<void> => {
	const root = resolve(import.meta.dir, "..");
	const source = resolve(root, "node_modules/pdfjs-dist");
	const metadata: { version: string } = JSON.parse(
		await readFile(resolve(source, "package.json"), "utf8"),
	);
	const target = resolve(root, "public/pdfjs", metadata.version);
	await mkdir(target, { recursive: true });
	await Promise.all([
		cp(
			resolve(source, "build/pdf.worker.min.mjs"),
			resolve(target, "pdf.worker.min.mjs"),
		),
		cp(resolve(source, "standard_fonts"), resolve(target, "standard_fonts"), {
			recursive: true,
		}),
		cp(resolve(source, "wasm"), resolve(target, "wasm"), { recursive: true }),
		cp(resolve(source, "LICENSE"), resolve(target, "LICENSE")),
	]);
};

if (import.meta.main) await syncPdfAssets();
