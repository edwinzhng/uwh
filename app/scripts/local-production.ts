import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { localCommand } from "./local-production/backend";
import { appRoot, copyRoot, run } from "./local-production/config";
import { startLocalServers } from "./local-production/server";
import {
	buildLocalWeb,
	createRuntime,
	deployRuntime,
	importSnapshot,
	startBackend,
} from "./local-production/setup";

const args = process.argv.slice(2);
const flags = args.filter((argument) => argument.startsWith("--"));
if (
	flags.some((flag) => !["--refresh", "--rebuild", "--prepare"].includes(flag))
)
	throw new Error("Use --refresh, --rebuild or --prepare.");
const sources = args.filter((argument) => !argument.startsWith("--"));
if (sources.length > 1 || (sources.length && flags.includes("--refresh")))
	throw new Error("Choose a snapshot path or --refresh.");
await mkdir(resolve(copyRoot, "cache"), { recursive: true, mode: 0o700 });
await startBackend();
const ready = await Bun.file(resolve(copyRoot, "ready.json")).exists();
const snapshot = flags.includes("--refresh")
	? await (async (): Promise<string> => {
			if (ready) {
				const backup = resolve(copyRoot, `before-refresh-${Date.now()}.zip`);
				await localCommand([
					"export",
					"--include-file-storage",
					"--path",
					backup,
				]);
				console.log(`Local edits backed up to ${backup}`);
			}
			const destination = resolve(copyRoot, `production-${Date.now()}.zip`);
			await run([
				process.execPath,
				resolve(appRoot, "node_modules/convex/bin/main.js"),
				"export",
				"--deployment",
				"brainy-albatross-874",
				"--include-file-storage",
				"--path",
				destination,
			]);
			return destination;
		})()
	: sources.at(0);
if (snapshot) {
	if (ready && !flags.includes("--refresh"))
		throw new Error(
			"A local copy already exists. Use --refresh to back it up before replacement.",
		);
	await createRuntime();
	await importSnapshot(resolve(snapshot));
	await buildLocalWeb();
	await Bun.write(
		resolve(copyRoot, "ready.json"),
		JSON.stringify({ readyAt: new Date().toISOString() }),
	);
} else if (flags.includes("--rebuild")) {
	if (!ready) throw new Error("Create a production snapshot copy first.");
	await createRuntime();
	await deployRuntime();
	await buildLocalWeb();
}
if (!flags.includes("--prepare")) await startLocalServers();
else console.log("The isolated local copy is ready.");
