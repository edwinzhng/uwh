import { chmod, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { copyRoot, run } from "./config";
import { localAccounts, snapshotEntryAllowed } from "./policy";

export const prepareSnapshot = async (
	snapshot: string,
): Promise<{
	snapshot: string;
	accounts: string[];
	counts: Record<string, number>;
}> => {
	const entries = (await run(["unzip", "-Z1", snapshot]))
		.split("\n")
		.filter(Boolean);
	const destination = resolve(copyRoot, `filtered-${Date.now()}`);
	await mkdir(destination, { recursive: true, mode: 0o700 });
	const accepted = entries.filter(snapshotEntryAllowed);
	const files = accepted.filter((entry) => !entry.endsWith("/"));
	await run(["unzip", "-q", snapshot, ...files, "-d", destination]);
	const counts = Object.fromEntries(
		await Promise.all(
			files
				.filter((entry) => entry.endsWith("/documents.jsonl"))
				.map(
					async (entry): Promise<[string, number]> => [
						entry.split("/").at(0) ?? "",
						(await Bun.file(resolve(destination, entry)).text())
							.split("\n")
							.filter(Boolean).length,
					],
				),
		),
	);
	const users = (
		await Bun.file(resolve(destination, "users/documents.jsonl")).text()
	)
		.split("\n")
		.filter(Boolean)
		.map((line): unknown => JSON.parse(line));
	const loginAccounts = localAccounts(users);
	const accounts = loginAccounts.map((account) => account.email);
	const output = resolve(copyRoot, `local-snapshot-${Date.now()}.zip`);
	await run(["zip", "-0", "-q", "-r", output, "."], destination);
	await chmod(output, 0o600);
	await Bun.write(
		resolve(copyRoot, "snapshot-manifest.json"),
		JSON.stringify(
			{
				capturedAt: new Date().toISOString(),
				source: "brainy-albatross-874",
				snapshot,
				filtered: output,
				counts,
				loginAccounts: accounts.length,
				loginAccountIds: loginAccounts.map((account) => account.id),
				excludedTables: entries
					.filter(
						(entry) =>
							entry.endsWith("/documents.jsonl") &&
							!snapshotEntryAllowed(entry),
					)
					.map((entry) => entry.split("/").at(0)),
			},
			undefined,
			2,
		),
	);
	return { snapshot: output, accounts, counts };
};
