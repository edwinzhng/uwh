type LogEntry = {
	kind: string;
	identifier: string;
	timestamp: number;
	error?: string;
	executionTime?: number;
	usageStats?: { databaseWriteDocuments: number };
};
type FunctionSample = {
	calls: number;
	errors: number;
	writeDocuments: number;
	maxMilliseconds: number;
};

const seconds = Number(process.argv.at(2) ?? "10");
if (!Number.isFinite(seconds) || seconds < 1 || seconds > 30)
	throw new Error("Choose a sample window between 1 and 30 seconds.");
const config: { ports: { cloud: number }; adminKey: string } = await Bun.file(
	".convex/local/default/config.json",
).json();
if (config.ports.cloud !== 3210 || !config.adminKey)
	throw new Error("Local Convex configuration unavailable.");
const child = Bun.spawn(
	[
		process.execPath,
		"node_modules/convex/bin/main.js",
		"logs",
		"--url",
		"http://127.0.0.1:3210",
		"--admin-key",
		config.adminKey,
		"--history",
		"0",
		"--success",
		"--jsonl",
	],
	{ stdout: "pipe", stderr: "pipe" },
);
const timeout = setTimeout((): void => {
	child.kill("SIGTERM");
}, seconds * 1000);
const [stdout, stderr, exitCode] = await Promise.all([
	new Response(child.stdout).text(),
	new Response(child.stderr).text(),
	child.exited,
]);
clearTimeout(timeout);
if (exitCode !== 0 && exitCode !== 143 && child.signalCode !== "SIGTERM")
	throw new Error(`Local log sampling failed (${exitCode}).`);
const entries: LogEntry[] = stdout
	.split("\n")
	.filter((line) => line.startsWith("{"))
	.map((line): LogEntry => JSON.parse(line))
	.filter((entry) => entry.kind === "Completion");
const functions = entries.reduce<Record<string, FunctionSample>>(
	(result, entry) => {
		const previous = result[entry.identifier] ?? {
			calls: 0,
			errors: 0,
			writeDocuments: 0,
			maxMilliseconds: 0,
		};
		result[entry.identifier] = {
			calls: previous.calls + 1,
			errors: previous.errors + Number(Boolean(entry.error)),
			writeDocuments:
				previous.writeDocuments +
				(entry.usageStats?.databaseWriteDocuments ?? 0),
			maxMilliseconds: Math.max(
				previous.maxMilliseconds,
				Math.round((entry.executionTime ?? 0) * 1000),
			),
		};
		return result;
	},
	{},
);
console.log(
	JSON.stringify(
		{
			seconds,
			completedCalls: entries.length,
			watcherStarted: stderr.includes("Watching logs"),
			functions,
		},
		undefined,
		2,
	),
);

export {};
