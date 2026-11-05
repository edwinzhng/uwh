import { mkdir } from "node:fs/promises";
import type { Doc } from "../convex/_generated/dataModel";
import {
	migratedGoalEventId,
	migratedGoalReflection,
} from "../src/domain/goal-reflection-migration";

const directory = process.argv.at(2);
if (!directory || !directory.startsWith("/private/tmp/"))
	throw new Error("Choose a private temporary migration directory.");
await mkdir(directory, { recursive: true, mode: 0o700 });
const sources: Doc<"goalReflections">[] = await Bun.file(
	"/private/tmp/uwh-prod-goal-reflections.json",
).json();
const existing: Doc<"sessionPerformance">[] = await Bun.file(
	"/private/tmp/uwh-prod-sessionPerformance.json",
).json();
const clubs: Doc<"clubs">[] = await Bun.file(
	"/private/tmp/uwh-prod-clubs.json",
).json();
if (sources.length >= 10000 || existing.length >= 10000)
	throw new Error("Migration export limit reached; use a complete snapshot.");
const missing = sources.filter(
	(source) =>
		!existing.some(
			(entry) =>
				entry.clubId === source.clubId &&
				entry.personId === source.personId &&
				entry.eventId === migratedGoalEventId(source._id) &&
				entry.kind === "self" &&
				entry.authorKey === "self",
		),
);
const batch = missing.map((source) => {
	if (
		!Number.isFinite(source.createdAt) ||
		source.selfRating < 1 ||
		source.selfRating > 5
	)
		throw new Error("Invalid source reflection.");
	const club = clubs.find((entry) => entry._id === source.clubId);
	if (!club) throw new Error("Source club unavailable.");
	const author =
		existing.find(
			(entry) =>
				entry.clubId === source.clubId && entry.authorId === source.authorId,
		)?.authorName ?? "Player";
	return migratedGoalReflection(
		{ ...source, id: source._id },
		club.timeZone ?? "America/Edmonton",
		author,
	);
});
await Bun.write(
	`${directory}/sessionPerformance.jsonl`,
	batch.map((entry) => JSON.stringify(entry)).join("\n") +
		(batch.length ? "\n" : ""),
);
console.log(
	JSON.stringify({
		sourceRecords: sources.length,
		alreadyMigrated: sources.length - missing.length,
		pending: batch.length,
		output: `${directory}/sessionPerformance.jsonl`,
	}),
);
