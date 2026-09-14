import type {
	ImportKind,
	ImportRecord,
	ImportRow,
} from "../src/domain/import-data";
import { importRecord } from "../src/domain/import-data";
import { applyLedgerChange } from "../src/domain/season-ledger";
import { initialSeasons } from "../src/domain/seasons";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { readSeasonRecord } from "./season_records";
export type ImportPlan = {
	row: number;
	status: "create" | "link" | "skip" | "error";
	label: string;
	error?: string;
	record?: ImportRecord;
	targetId?: string;
	personId?: string;
	eventId?: string;
	current?: string;
};
export type ImportInput = {
	source: string;
	kind: ImportKind;
	seasonId: string;
	rows: ImportRow[];
};
const reference = (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	source: string,
	kind: ImportKind,
	id: string,
	seasonId?: string,
): Promise<Doc<"importReferences"> | null> =>
	ctx.db
		.query("importReferences")
		.withIndex("by_source", (q) =>
			q
				.eq("clubId", clubId)
				.eq("source", source)
				.eq("kind", kind)
				.eq("sourceId", id)
				.eq("seasonId", seasonId),
		)
		.unique();
const resolvePerson = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	source: string,
	id: string,
): Promise<string> => {
	const mapping = await reference(ctx, clubId, source, "members", id);
	const target = mapping?.targetId ?? id;
	const person = await ctx.db
		.query("members")
		.withIndex("by_club_and_key", (q) =>
			q.eq("clubId", clubId).eq("value.id", target),
		)
		.unique();
	if (!person)
		throw new Error(
			`Member ${id} not found. Import members first or use their app ID.`,
		);
	return target;
};
export const planImport = async (
	ctx: QueryCtx,
	clubId: Id<"clubs">,
	input: ImportInput,
): Promise<ImportPlan[]> => {
	if (!/^[a-zA-Z0-9_-]{1,60}$/.test(input.source))
		throw new Error(
			"Use a source name with letters, numbers, hyphens or underscores.",
		);
	if (
		!input.rows.length ||
		input.rows.length > 25 ||
		JSON.stringify(input.rows).length > 100_000
	)
		throw new Error("Import up to 25 rows per batch.");
	const club = await ctx.db.get(clubId);
	if (
		!(club?.seasons ?? initialSeasons).some(
			(season) => season.id === input.seasonId,
		)
	)
		throw new Error("Choose a season.");
	const ids = input.rows.map((row) => row.source_id?.trim());
	const plans = await Promise.all(
		input.rows.map(async (row, index): Promise<ImportPlan> => {
			const base = {
				row: index + 1,
				label: row.name || row.title || row.source_id || `Row ${index + 1}`,
			};
			try {
				const record = importRecord(input.kind, row, input.seasonId);
				if (ids.filter((id) => id === record.sourceId).length > 1)
					throw new Error("Duplicate source ID in this file.");
				const previous = await reference(
					ctx,
					clubId,
					input.source,
					input.kind,
					record.sourceId,
					input.kind === "registration" ? input.seasonId : undefined,
				);
				if (previous) {
					if (previous.fingerprint !== JSON.stringify(record))
						throw new Error(
							"This source ID was already imported with different values. Edit its record in the app.",
						);
					return {
						...base,
						status: "skip",
						record,
						targetId: previous.targetId,
					};
				}
				const generated = `import:${input.source}:${encodeURIComponent(record.sourceId)}`;
				if (record.kind === "members" || record.kind === "events") {
					const existing = await ctx.db
						.query(record.kind)
						.withIndex("by_club_and_key", (q) =>
							q
								.eq("clubId", clubId)
								.eq(
									"value.id",
									record.kind === "events" ? `${generated}-0` : generated,
								),
						)
						.unique();
					if (existing)
						throw new Error(
							"That app ID already exists. Choose another source ID or link the member explicitly.",
						);
				}
				if (record.kind === "members") {
					if (record.memberId) {
						const targetId = await resolvePerson(
							ctx,
							clubId,
							input.source,
							record.memberId,
						);
						const member = await ctx.db
							.query("members")
							.withIndex("by_club_and_key", (q) =>
								q.eq("clubId", clubId).eq("value.id", targetId),
							)
							.unique();
						return {
							...base,
							status: "link",
							label: `${record.name} → ${member?.value.name}`,
							record,
							targetId,
							current: JSON.stringify(member?.value),
						};
					}
					const matches = await ctx.db
						.query("members")
						.withSearchIndex("search_name", (q) =>
							q.search("value.name", record.name).eq("clubId", clubId),
						)
						.take(50);
					const match = matches.find(
						(member) =>
							member.value.name.trim().toLowerCase() ===
							record.name.toLowerCase(),
					);
					if (match)
						throw new Error(
							`Member already exists. Set existing member ID to ${match.value.id}.`,
						);
					if (
						input.rows.some(
							(other, otherIndex) =>
								otherIndex !== index &&
								other.name?.trim().toLowerCase() === record.name.toLowerCase(),
						)
					)
						throw new Error(
							"Repeated name in this file. Import and link these rows separately.",
						);
					return { ...base, status: "create", record, targetId: generated };
				}
				if (record.kind === "events")
					return {
						...base,
						status: "create",
						record,
						targetId: `${generated}-0`,
					};
				const personId = await resolvePerson(
					ctx,
					clubId,
					input.source,
					record.person,
				);
				if (record.kind === "attendance") {
					const mapping = await reference(
						ctx,
						clubId,
						input.source,
						"events",
						record.event,
					);
					const eventId = mapping?.targetId ?? record.event;
					const event = await ctx.db
						.query("events")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", clubId).eq("value.id", eventId),
						)
						.unique();
					if (!event)
						throw new Error(
							"Event not found. Import events first or use their app ID.",
						);
					if (
						event.value.eligiblePersonIds &&
						!event.value.eligiblePersonIds.includes(personId)
					)
						throw new Error("This member is not eligible for the event.");
					const existing = await ctx.db
						.query("responses")
						.withIndex("by_club_and_key", (q) =>
							q.eq("clubId", clubId).eq("value.id", `${eventId}:${personId}`),
						)
						.unique();
					if (
						existing &&
						(existing.value.response !== record.response ||
							existing.value.attendance !== record.attendance)
					)
						throw new Error(
							"Attendance already exists. Edit it on the event to avoid overwriting it.",
						);
					return {
						...base,
						status: existing ? "link" : "create",
						record,
						targetId: `${eventId}:${personId}`,
						personId,
						eventId,
						current: JSON.stringify({
							event: event.value,
							response: existing?.value,
						}),
					};
				}
				const current = await readSeasonRecord(
					ctx,
					clubId,
					input.seasonId,
					personId,
				);
				if (record.kind === "registration") {
					const same =
						current.registration === record.status &&
						current.cuga === record.cuga &&
						current.due === record.dues;
					if (
						!same &&
						(current.revision > 0 ||
							current.registration !== "missing" ||
							current.cuga ||
							current.due > 0 ||
							current.paid > 0)
					)
						throw new Error(
							"This season already has a record. Edit it on the member profile.",
						);
					return {
						...base,
						status: same ? "link" : "create",
						record,
						personId,
						targetId: `${input.seasonId}:${personId}`,
						current: JSON.stringify(current),
					};
				}
				applyLedgerChange(current, {
					kind: "payment",
					amount: record.amount,
					note: record.note,
					date: record.date,
				});
				return {
					...base,
					status: "create",
					record,
					personId,
					targetId: generated,
					current: JSON.stringify({
						personId,
						seasonId: input.seasonId,
						due: current.due,
					}),
				};
			} catch (error) {
				return {
					...base,
					status: "error",
					error: error instanceof Error ? error.message : "Invalid row.",
				};
			}
		}),
	);
	return plans.map((plan): ImportPlan => {
		if (
			(plan.record?.kind === "registration" ||
				plan.record?.kind === "attendance") &&
			plan.status !== "error" &&
			plan.status !== "skip" &&
			plans.some(
				(other) =>
					other !== plan &&
					other.targetId === plan.targetId &&
					other.status !== "skip",
			)
		)
			return {
				...plan,
				status: "error",
				error:
					"Repeated member/event or season record. Keep one row per record.",
			};
		return plan;
	});
};
export const importSignature = (plans: ImportPlan[]): string =>
	JSON.stringify(plans);
