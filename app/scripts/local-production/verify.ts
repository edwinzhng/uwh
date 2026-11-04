import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { localCommand, localFunction } from "./backend";
import { copyRoot, run } from "./config";
import { localBackendOrigin } from "./policy";

const canonical = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	if (typeof value === "object" && value !== null)
		return `{${Object.entries(value)
			.sort(([first], [second]) => first.localeCompare(second))
			.map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`)
			.join(",")}}`;
	return JSON.stringify(value) ?? "undefined";
};
const documents = async (snapshot: string, table: string): Promise<unknown[]> =>
	(await run(["unzip", "-p", snapshot, `${table}/documents.jsonl`]))
		.split("\n")
		.filter(Boolean)
		.map((line): unknown => JSON.parse(line));

export const verifySnapshot = async (source: string): Promise<void> => {
	const output = resolve(copyRoot, `audit-${Date.now()}.zip`);
	await localCommand(["export", "--path", output]);
	const entries = (await run(["unzip", "-Z1", source]))
		.split("\n")
		.filter((entry) => entry.endsWith("/documents.jsonl"));
	const tables = entries
		.map((entry) => entry.split("/").at(0) ?? "")
		.filter((table) => table && !table.startsWith("_"));
	const comparison = await Promise.all(
		tables.map(async (table): Promise<{ table: string; matches: boolean }> => {
			const [before, after] = await Promise.all([
				documents(source, table),
				documents(output, table),
			]);
			return {
				table,
				matches:
					canonical(before.map(canonical).sort()) ===
					canonical(after.map(canonical).sort()),
			};
		}),
	);
	const storage: unknown = JSON.parse(
		await localCommand([
			"data",
			"_storage",
			"--format",
			"json",
			"--limit",
			"10000",
		]),
	);
	if (!Array.isArray(storage))
		throw new Error("Local storage metadata is unavailable.");
	const expectedStorage = await documents(source, "_storage");
	const storageMatches =
		canonical(storage.map(canonical).sort()) ===
		canonical(
			expectedStorage
				.map((row) =>
					typeof row === "object" && row !== null
						? Object.fromEntries(
								Object.entries(row).filter(([key]) => key !== "internalId"),
							)
						: row,
				)
				.map(canonical)
				.sort(),
		);
	const storedFiles = await localFunction(
		"local_production_checks:storedFiles",
		{},
	);
	if (!Array.isArray(storedFiles))
		throw new Error("Local file verification is unavailable.");
	for (const file of storedFiles) {
		if (
			typeof file !== "object" ||
			file === null ||
			typeof file.url !== "string" ||
			new URL(file.url).origin !== localBackendOrigin ||
			typeof file.sha256 !== "string" ||
			typeof file.size !== "number"
		)
			throw new Error("Local storage file is unavailable.");
		const response = await fetch(file.url);
		if (!response.ok || !response.body)
			throw new Error("A copied file could not be read.");
		const hash = createHash("sha256");
		const content = { size: 0 };
		const reader = response.body.getReader();
		const consume = async (): Promise<void> => {
			const { done, value } = await reader.read();
			if (done) return;
			hash.update(value);
			content.size += value.byteLength;
			return consume();
		};
		await consume();
		if (content.size !== file.size || hash.digest("base64") !== file.sha256)
			throw new Error(
				"Copied file bytes do not match the production checksum.",
			);
	}
	const failed = comparison
		.filter((entry) => !entry.matches)
		.map((entry) => entry.table);
	await Bun.write(
		resolve(copyRoot, "verification.json"),
		JSON.stringify(
			{
				verifiedAt: new Date().toISOString(),
				tablesCompared: tables.length,
				mismatches: failed,
				idsAndFieldsMatch: failed.length === 0,
				storageMatches,
				verifiedFileContents: storedFiles.length,
			},
			undefined,
			2,
		),
	);
	if (failed.length || !storageMatches)
		throw new Error(
			"Local snapshot verification failed. Inspect the private verification report before using this copy.",
		);
	console.log(
		`Verified every ID and field in ${tables.length} application tables, plus ${storedFiles.length} complete media files and their metadata.`,
	);
};
