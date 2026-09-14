const config: { ports: { cloud: number }; adminKey: string } = await Bun.file(
	".convex/local/default/config.json",
).json();
if (config.ports.cloud !== 3210 || !config.adminKey)
	throw new Error("Local Convex configuration unavailable.");
const command = process.argv.at(2);
if (!command) throw new Error("Choose a local Convex command.");
const child = Bun.spawn(
	[
		process.execPath,
		"node_modules/convex/bin/main.js",
		command,
		"--url",
		"http://127.0.0.1:3210",
		"--admin-key",
		config.adminKey,
		...process.argv.slice(3),
	],
	{
		env: process.env,
		stdout: "inherit",
		stderr: "inherit",
	},
);
process.exit(await child.exited);
export {};
