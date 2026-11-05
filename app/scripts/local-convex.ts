import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const config: { ports: { cloud: number }; adminKey: string } = await Bun.file(
	".convex/local/default/config.json",
).json();
if (config.ports.cloud !== 3210 || !config.adminKey)
	throw new Error("Local Convex configuration unavailable.");
const command = process.argv.at(2);
if (!command) throw new Error("Choose a local Convex command.");
const environmentBefore = await Bun.file(".env.local").text();
const deploymentSelection = environmentBefore
	.match(/^CONVEX_DEPLOYMENT=.*$/m)
	?.at(0);
const temporaryDirectory =
	command === "dev"
		? await mkdtemp(join(tmpdir(), "uwh-local-convex-"))
		: undefined;
const environmentFile = temporaryDirectory
	? join(temporaryDirectory, ".env.local")
	: undefined;
if (environmentFile)
	await Bun.write(
		environmentFile,
		"EXPO_PUBLIC_CONVEX_URL=http://127.0.0.1:3210\nEXPO_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211\n",
	);
const child = Bun.spawn(
	[
		process.execPath,
		"node_modules/convex/bin/main.js",
		command,
		"--url",
		"http://127.0.0.1:3210",
		"--admin-key",
		config.adminKey,
		...(environmentFile ? ["--env-file", environmentFile] : []),
		...process.argv.slice(3),
	],
	{
		env: process.env,
		stdout: "inherit",
		stderr: "inherit",
	},
);
const exitCode = await child.exited;
const environmentAfter = await Bun.file(".env.local").text();
if (deploymentSelection && !/^CONVEX_DEPLOYMENT=/m.test(environmentAfter)) {
	const normalized = (value: string): string =>
		value
			.split(/\r?\n/)
			.filter((line) => line.trim() && !line.startsWith("CONVEX_DEPLOYMENT="))
			.join("\n");
	await Bun.write(
		".env.local",
		normalized(environmentBefore) === normalized(environmentAfter)
			? environmentBefore
			: `${deploymentSelection}\n${environmentAfter}`,
	);
}
if (temporaryDirectory)
	await rm(temporaryDirectory, { recursive: true, force: true });
process.exit(exitCode);
