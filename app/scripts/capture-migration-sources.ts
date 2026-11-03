import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import Papa from "papaparse";

const root = resolve(import.meta.dir, "../../data/migration-2026-11-01");
const tables = [
	"players",
	"practices",
	"practiceAttendance",
	"practiceCoaches",
	"practicePlayerStatuses",
	"coaches",
	"fitnessTests",
	"fitnessTestSessions",
	"fitnessTestResults",
] as const;

await mkdir(resolve(root, "legacy"), { recursive: true, mode: 0o700 });
for (const table of process.argv.includes("--registration-only")
	? []
	: tables) {
	const child = Bun.spawn(
		[
			"bunx",
			"convex",
			"data",
			table,
			"--deployment",
			"calgary-underwater-hockey-club:uwh:prod",
			"--format",
			"json",
			"--limit",
			"10000",
		],
		{ cwd: resolve(import.meta.dir, ".."), stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	if ((await child.exited) !== 0)
		throw new Error(`Legacy ${table} export failed.`);
	const body = stdout.trim() || stderr.trim();
	const rows: Record<string, string | number | boolean>[] =
		body && body !== "There are no documents in this table."
			? JSON.parse(body)
			: [];
	if (!Array.isArray(rows) || rows.length >= 10000)
		throw new Error(`Legacy ${table} export requires pagination review.`);
	await Bun.write(
		resolve(root, "legacy", `${table}.json`),
		JSON.stringify(rows),
	);
	console.log(`${table}: ${rows.length}`);
}

const registrationSource = process.argv.at(2);
if (registrationSource) {
	const parsed = Papa.parse<Record<string, string>>(
		await Bun.file(registrationSource).text(),
		{ header: true, skipEmptyLines: true },
	);
	if (parsed.errors.length)
		throw new Error("Registration CSV has parse errors.");
	const rows = parsed.data.map((row) => ({
		submittedAt: row.Timestamp,
		firstName: row["First Name"],
		lastName: row["Last Name"],
		email: row.Email,
		phone: row["Phone Number"],
		feePaidAnswer:
			row["Registration Fee Paid? (E-transfer to treasurer@calgaryuwh.com)"],
	}));
	await mkdir(resolve(root, "registration"), { recursive: true, mode: 0o700 });
	await Bun.write(
		resolve(root, "registration", "responses-minimized.json"),
		JSON.stringify(rows),
	);
	console.log(
		`Registration: ${rows.length}; medical and health-card fields excluded.`,
	);
}
