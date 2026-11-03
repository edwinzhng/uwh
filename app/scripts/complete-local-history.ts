import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Doc, Id } from "../convex/_generated/dataModel";
import {
	createMigrationClient,
	type ImportEntry,
	localOperation,
	type MigrationStatus,
	migrationActorKey,
	readMigrationPeople,
} from "./migration-client";
import { buildMigrationCommunication } from "./migration-communication";
import {
	fingerprint,
	migrationRoot,
	readBaseTables,
	sourceArray,
} from "./migration-source";

const client = await createMigrationClient();
const tables = await readBaseTables();
const people = await readMigrationPeople(tables);
const person = (sourceId: string): string => {
	const match = people.find((entry) =>
		entry.base.some((row) => row.id === sourceId),
	);
	if (!match)
		throw new Error("Source person unavailable in the approved identity map.");
	return match.id;
};
const actors = new Map<string, string>();
const collectActor = (name: string, identity: string): Id<"users"> => {
	const key = migrationActorKey(people, name, identity);
	actors.set(key, name || "Historical participant");
	return client.has("actors", key)
		? client.id<"users">("actors", key)
		: (key as Id<"users">);
};
type MondayInput = {
	dryRun: boolean;
	source: {
		sourceId: string;
		fingerprint: string;
		value: { id: string; date: string };
	};
	target: { sourceId: string; fingerprint: string; value: { id: string } };
	responses: object[];
};
const mondayInputs: MondayInput[] = await Bun.file(
	resolve(migrationRoot, "monday-reconciliation-plan.json"),
).json();
for (const input of mondayInputs) {
	const source = (tables.Event ?? []).find(
		(row) => `base44:Event:${row.id}` === input.source.value.id,
	);
	if (!source) throw new Error("Reviewed Monday source event unavailable.");
}
const { buildMigrationSchedule } = await import("./migration-schedule");
const { migrationCalendar, readLegacy } = await import("./migration-source");
const columns: { columns: { index: number; eventId: string }[] } =
	await Bun.file(
		resolve(migrationRoot, "sporteasy/attendance-event-columns.json"),
	).json();
const presence = await Bun.file(
	resolve(migrationRoot, "sporteasy/bilan_presence_calgary-crocs.json"),
).json();
const schedule = buildMigrationSchedule({
	tables,
	calendar: await migrationCalendar(tables.Program ?? []),
	legacyPractices: await readLegacy("practices"),
	legacyAttendance: await readLegacy("practiceAttendance"),
	presence,
	columns: columns.columns,
	person: (source, sourceId): string => {
		if (source === "base44") return person(sourceId);
		const match =
			source === "legacy"
				? people.find((entry) =>
						entry.legacy.some((row) => row._id === sourceId),
					)
				: people.find((entry) =>
						entry.roster.some(
							(row) =>
								`${row.B} ${row.A}`.trim().toLowerCase() ===
								sourceId.trim().toLowerCase(),
						),
					);
		if (!match) throw new Error("Schedule source person unavailable.");
		return match.id;
	},
});
const options = {
	tables,
	person,
	program: (id: string): string => (id ? `base44:${id}` : "club"),
	event: (key: string): Doc<"events">["value"] | undefined =>
		schedule.sourceEvents.get(key),
	currentOwnerId: client.status.ownerId,
};
const draft = buildMigrationCommunication({ ...options, author: collectActor });
await client.write(
	[...actors]
		.filter(([key]) => !client.has("actors", key))
		.map(
			([key, name]): ImportEntry => ({
				sourceId: key,
				record: { kind: "actors", value: { personId: key, name } },
			}),
		),
);
const author = (name: string, identity: string): Id<"users"> =>
	client.id<"users">("actors", migrationActorKey(people, name, identity));

for (const row of (tables.Player ?? []).filter((entry) => entry.avatar_url)) {
	const key = `base44:Player:${row.id}:photo`;
	if (!client.has("memberProfilePhotos", key)) {
		const media = await client.capture(row.avatar_url ?? "");
		const storageId = await client.upload(media.file, media.mime);
		await client.write([
			{
				sourceId: key,
				record: {
					kind: "memberProfilePhotos",
					value: {
						personId: person(row.id ?? ""),
						ownerId: client.status.ownerId,
						key,
						digest: media.digest,
						storageId,
						mime: media.mime,
						size: media.file.size,
						attached: true,
					},
				},
			},
		]);
	}
	await localOperation("local_migration:attachProfilePhoto", {
		personId: person(row.id ?? ""),
		photoId: client.id("memberProfilePhotos", key),
	});
}
console.log("Profile photos: 20 reconciled.");

const images = new Map<string, { id: string; name: string }>();
for (const row of [
	...(tables.ChatMessage ?? []),
	...(tables.DirectMessage ?? []),
]) {
	for (const url of [
		...sourceArray<string>(row.image_urls),
		...(row.file_url ? [row.file_url] : []),
	]) {
		const key = `base44:message-image:${row.id}:${fingerprint(url)}`;
		const message = draft.messages.find(
			(entry) => entry.value.id === `base44:message:${row.id}`,
		);
		if (!message) throw new Error("Source image has no source message.");
		if (!client.has("images", key)) {
			const media = await client.capture(url);
			const storageId = await client.upload(media.file, media.mime);
			await client.write([
				{
					sourceId: key,
					record: {
						kind: "images",
						value: {
							threadId: message.value.threadId,
							ownerId: author(row.sender_name ?? "", row.sender_email ?? ""),
							storageId,
							name: "Club photo",
							mime: media.mime,
							size: media.file.size,
							messageId: message.value.id,
						},
					},
				},
			]);
		}
		images.set(`${row.id}:${url}`, {
			id: client.id("images", key),
			name: "Club photo",
		});
	}
}
const communication = buildMigrationCommunication({
	...options,
	author,
	image: (id, url) => images.get(`${id}:${url}`),
});
await client.write(
	communication.conversations.map(
		(entry): ImportEntry => ({
			sourceId: entry.sourceId,
			record: { kind: "conversations", value: entry.value },
		}),
	),
);
await client.write(
	communication.messages.map(
		(entry): ImportEntry => ({
			sourceId: entry.sourceId,
			record: { kind: "messages", value: entry.value },
		}),
	),
);
await client.write(
	communication.notices.map(
		(entry): ImportEntry => ({
			sourceId: entry.sourceId,
			record: { kind: "notices", value: entry.value },
		}),
	),
);
await client.write(
	communication.teams.map(
		(entry): ImportEntry => ({
			sourceId: entry.sourceId,
			record: { kind: "teams", value: entry.value },
		}),
	),
);
const directory = resolve(migrationRoot, "lineup-references");
await mkdir(directory, { recursive: true, mode: 0o700 });
for (const entry of communication.resources) {
	const key = `${entry.sourceId}:reference-file`;
	if (!client.has("resourceFiles", key)) {
		const path = resolve(directory, `${fingerprint(entry.sourceId)}.txt`);
		await writeFile(
			path,
			`${entry.value.title}\n\n${entry.value.description}`,
			{ mode: 0o600 },
		);
		const file = Bun.file(path);
		const storageId = await client.upload(file, "text/plain");
		await client.write([
			{
				sourceId: key,
				record: {
					kind: "resourceFiles",
					value: {
						ownerId: client.status.ownerId,
						storageId,
						name: `${entry.value.title}.txt`,
						mime: "text/plain",
						size: file.size,
						purpose: "document",
					},
				},
			},
		]);
	}
	await client.write([
		{
			sourceId: entry.sourceId,
			record: {
				kind: "resources",
				value: { ...entry.value, fileId: client.id("resourceFiles", key) },
			},
		},
	]);
}
console.log(JSON.stringify({ communication: communication.summary }));

const dryRuns = [];
for (const input of mondayInputs)
	dryRuns.push(
		await localOperation("local_migration_monday:reconcile", {
			...input,
			dryRun: true,
		}),
	);
await writeFile(
	resolve(migrationRoot, "monday-reconciliation-dry-run.json"),
	JSON.stringify(dryRuns, undefined, 2),
	{ mode: 0o600 },
);
const reconciled = [];
for (const input of mondayInputs)
	reconciled.push(
		await localOperation("local_migration_monday:reconcile", {
			...input,
			dryRun: false,
		}),
	);
const status = await localOperation<MigrationStatus>(
	"local_migration:status",
	{},
);
const report = {
	completedAt: new Date().toISOString(),
	counts: status.counts,
	archived: status.archived,
	communication: communication.summary,
	exceptions: communication.unlinked,
	mondayReconciliation: reconciled,
	deliveryDisabled: status.deliveryDisabled,
};
await writeFile(
	resolve(migrationRoot, "import-completion.json"),
	JSON.stringify(report, undefined, 2),
	{ mode: 0o600 },
);
console.log(
	JSON.stringify({
		complete: true,
		counts: status.counts,
		mondayPairs: reconciled.length,
		deliveryDisabled: status.deliveryDisabled,
	}),
);
