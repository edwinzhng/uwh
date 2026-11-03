import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import { migrationName } from "./migration-identities";
import {
	fingerprint,
	type LegacyPlayer,
	type MigrationPerson,
	type MigrationRecord,
	migrationPeople,
	migrationRoot,
	type RegistrationRow,
	readLegacy,
	type SourceRow,
} from "./migration-source";

type Outcome = { sourceId: string; kind: string; targetId: string };
export type MigrationStatus = {
	clubId: Id<"clubs">;
	ownerId: Id<"users">;
	references: Outcome[];
	counts: Record<string, number>;
	deliveryDisabled: boolean;
	archived: number;
};
export type ImportEntry = { sourceId: string; record: MigrationRecord };

export const localOperation = async <Result>(
	name: string,
	args: object,
): Promise<Result> => {
	const child = Bun.spawn(
		[
			process.execPath,
			"scripts/local-convex.ts",
			"run",
			name,
			JSON.stringify(args),
		],
		{ stdout: "pipe", stderr: "pipe" },
	);
	const [stdout, stderr] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
	]);
	if ((await child.exited) !== 0) {
		const directory = resolve(migrationRoot, "private-errors");
		await mkdir(directory, { recursive: true, mode: 0o700 });
		const file = `${fingerprint({ name, stderr }).slice(0, 20)}.log`;
		await writeFile(resolve(directory, file), stderr, { mode: 0o600 });
		throw new Error(
			`Local operation ${name} failed; details saved privately in private-errors/${file}.`,
		);
	}
	return JSON.parse(stdout.trim() || "null");
};

export const readMigrationPeople = async (
	tables: Record<string, SourceRow[]>,
): Promise<MigrationPerson[]> => {
	const registrations: RegistrationRow[] = await Bun.file(
		resolve(migrationRoot, "registration/responses-minimized.json"),
	).json();
	const roster: SourceRow[] = await Bun.file(
		resolve(migrationRoot, "sporteasy/SportEasy_calgary-crocs.json"),
	).json();
	const live: { name: string; url: string }[] = await Bun.file(
		resolve(migrationRoot, "sporteasy/roster-identities-rendered.json"),
	).json();
	const approvals: { approvedDuplicateSourceIds: string[][] } = await Bun.file(
		resolve(migrationRoot, "approvals.json"),
	).json();
	const verified = roster.slice(1).map((row): SourceRow => {
		const name = migrationName(`${row.B ?? ""} ${row.A ?? ""}`);
		const ids = [
			...new Set(
				live
					.filter(
						(entry) => migrationName(entry.name.replace(/^\d+/, "")) === name,
					)
					.flatMap(
						(entry) => entry.url.match(/\/members\/(\d+)\//)?.at(1) ?? [],
					),
			),
		];
		if (ids.length !== 1)
			throw new Error("Roster live identity requires review.");
		return { ...row, _sporteasyId: ids.at(0) ?? "" };
	});
	return migrationPeople(
		tables.Player ?? [],
		await readLegacy<LegacyPlayer>("players"),
		verified,
		registrations,
		approvals.approvedDuplicateSourceIds,
	);
};

export const migrationActorKey = (
	people: readonly MigrationPerson[],
	name: string,
	identity: string,
): string => {
	const email = identity.trim().toLowerCase();
	const matches = people.filter(
		(person) =>
			person.base.some((row) => row.email?.trim().toLowerCase() === email) ||
			person.legacy.some((row) => row.email?.trim().toLowerCase() === email),
	);
	const namedPeople = people.filter(
		(person) => migrationName(person.name) === migrationName(name),
	);
	if (
		matches.length === 1 &&
		namedPeople.length === 1 &&
		matches.at(0)?.id !== namedPeople.at(0)?.id
	)
		throw new Error("Historical author name and verified email disagree.");
	const named = matches.filter(
		(person) => migrationName(person.name) === migrationName(name),
	);
	const verified =
		matches.length === 1
			? matches.at(0)
			: named.length === 1
				? named.at(0)
				: undefined;
	return (
		verified?.id ?? `historical-identity:${fingerprint(email).slice(0, 24)}`
	);
};

type MigrationClient = {
	status: MigrationStatus;
	has: (kind: string, sourceId: string) => boolean;
	id: <Table extends TableNames>(
		kind: Table | "actors",
		sourceId: string,
	) => Id<Table>;
	write: (entries: readonly ImportEntry[]) => Promise<void>;
	capture: (value: string) => Promise<{
		file: ReturnType<typeof Bun.file>;
		mime: string;
		digest: string;
	}>;
	upload: (
		file: ReturnType<typeof Bun.file>,
		mime: string,
	) => Promise<Id<"_storage">>;
};

export const createMigrationClient = async (): Promise<MigrationClient> => {
	const status = await localOperation<MigrationStatus>(
		"local_migration:status",
		{},
	);
	if (!status.deliveryDisabled || status.counts.members !== 74)
		throw new Error(
			"The approved core import must be present with delivery disabled.",
		);
	const references = new Map(
		status.references.map((row) => [
			`${row.kind}:${row.sourceId}`,
			row.targetId,
		]),
	);
	const has = (kind: string, sourceId: string): boolean =>
		references.has(`${kind}:${sourceId}`);
	const id = <Table extends TableNames>(
		kind: Table | "actors",
		sourceId: string,
	): Id<Table> => {
		const value = references.get(`${kind}:${sourceId}`);
		if (!value) throw new Error(`Imported dependency unavailable: ${kind}`);
		return value as Id<Table>;
	};
	const write = async (entries: readonly ImportEntry[]): Promise<void> => {
		for (const offset of Array.from(
			{ length: Math.ceil(entries.length / 50) },
			(_, index) => index * 50,
		)) {
			const batch = entries
				.slice(offset, offset + 50)
				.map((entry) => ({ ...entry, fingerprint: fingerprint(entry.record) }));
			await localOperation("local_migration:apply", {
				dryRun: true,
				entries: batch,
			});
			for (const row of await localOperation<Outcome[]>(
				"local_migration:apply",
				{ dryRun: false, entries: batch },
			))
				references.set(`${row.kind}:${row.sourceId}`, row.targetId);
		}
	};
	const capture = async (
		value: string,
	): Promise<{
		file: ReturnType<typeof Bun.file>;
		mime: string;
		digest: string;
	}> => {
		const url = new URL(value);
		const hosts = new Set(["base44.app", "media.base44.com"]);
		if (url.protocol !== "https:" || !hosts.has(url.hostname))
			throw new Error("Source image host requires review.");
		const directory = resolve(migrationRoot, "downloaded-assets");
		await mkdir(directory, { recursive: true, mode: 0o700 });
		const path = resolve(directory, fingerprint(value));
		if (!(await Bun.file(path).exists())) {
			const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
			if (!response.ok || !hosts.has(new URL(response.url).hostname))
				throw new Error("Source image unavailable.");
			const mime = response.headers.get("content-type")?.split(";").at(0) ?? "";
			if (!mime.startsWith("image/"))
				throw new Error("Source image has an unexpected format.");
			await Bun.write(path, response);
			await Bun.write(`${path}.mime`, mime);
		}
		const file = Bun.file(path);
		const mime = (await Bun.file(`${path}.mime`).text()).trim();
		if (!mime.startsWith("image/"))
			throw new Error("Cached source image format requires review.");
		if (file.size > 20000000)
			throw new Error("Source image exceeds the import safety limit.");
		return {
			file,
			mime,
			digest: createHash("sha256")
				.update(new Uint8Array(await file.arrayBuffer()))
				.digest("hex"),
		};
	};
	const upload = async (
		file: ReturnType<typeof Bun.file>,
		mime: string,
	): Promise<Id<"_storage">> => {
		const url = await localOperation<string>("local_migration:mediaUpload", {});
		if (new URL(url).hostname !== "127.0.0.1")
			throw new Error("Local upload destination requires review.");
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": mime },
			body: file,
		});
		if (!response.ok)
			throw new Error(`Local image upload failed: HTTP ${response.status}`);
		const payload: { storageId: Id<"_storage"> } = await response.json();
		return payload.storageId;
	};
	return { status, has, id, write, capture, upload };
};
