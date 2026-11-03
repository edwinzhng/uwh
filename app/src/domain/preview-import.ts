import type { ImportInput, ImportPlan } from "../../convex/import_plan";
import { reduceApp } from "./app-reducer";
import type { Account, AppData } from "./app-types";
import { type ImportKind, importRecord } from "./import-data";
import {
	defaultPreviewSeasonRecord,
	seasonRecordKey,
} from "./preview-season-ledger";
import { applyLedgerChange, type SeasonRecord } from "./season-ledger";

type Reference = { targetId: string; fingerprint: string };
export type PreviewImportState = {
	data: AppData;
	records: Record<string, SeasonRecord>;
	references: Record<string, Reference>;
};
export const importReferenceKey = (
	input: ImportInput,
	kind: ImportKind,
	sourceId: string,
): string =>
	JSON.stringify([
		input.source,
		kind,
		kind === "registration" ? input.seasonId : "",
		sourceId,
	]);

const personFor = (
	state: PreviewImportState,
	input: ImportInput,
	id: string,
): string => {
	const target =
		state.references[importReferenceKey(input, "members", id)]?.targetId ?? id;
	if (!state.data.members.some((member) => member.id === target))
		throw new Error(
			`Member ${id} not found. Import members first or use their app ID.`,
		);
	return target;
};

export const previewImportPlans = (
	state: PreviewImportState,
	input: ImportInput,
): ImportPlan[] => {
	if (!/^[a-zA-Z0-9_-]{1,60}$/.test(input.source))
		throw new Error(
			"Use a source name with letters, numbers, hyphens or underscores.",
		);
	if (!input.rows.length || input.rows.length > 25)
		throw new Error("Import up to 25 rows per batch.");
	if (!state.data.seasons.some((season) => season.id === input.seasonId))
		throw new Error("Choose a season.");
	const plans = input.rows.map((row, index): ImportPlan => {
		const base = {
			row: index + 1,
			label: row.name || row.title || row.source_id || `Row ${index + 1}`,
		};
		try {
			const record = importRecord(input.kind, row, input.seasonId);
			if (
				input.rows.filter(
					(other) => other.source_id?.trim() === record.sourceId,
				).length > 1
			)
				throw new Error("Duplicate source ID in this file.");
			const previous =
				state.references[
					importReferenceKey(input, record.kind, record.sourceId)
				];
			if (previous) {
				if (previous.fingerprint !== JSON.stringify(record))
					throw new Error(
						"This source ID was already imported with different values. Edit its record in the app.",
					);
				return { ...base, status: "skip", record, targetId: previous.targetId };
			}
			const generated = `import:${input.source}:${encodeURIComponent(record.sourceId)}`;
			if (record.kind === "members") {
				if (record.memberId)
					return {
						...base,
						status: "link",
						record,
						targetId: personFor(state, input, record.memberId),
					};
				const match = state.data.members.find(
					(member) =>
						member.id === generated ||
						member.name.trim().toLowerCase() === record.name.toLowerCase(),
				);
				if (match)
					throw new Error(
						`Member already exists. Set existing member ID to ${match.id}.`,
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
			if (record.kind === "events") {
				if (state.data.events.some((event) => event.id === `${generated}-0`))
					throw new Error("That event ID already exists.");
				return {
					...base,
					status: "create",
					record,
					targetId: `${generated}-0`,
				};
			}
			const personId = personFor(state, input, record.person);
			if (record.kind === "attendance") {
				const eventId =
					state.references[importReferenceKey(input, "events", record.event)]
						?.targetId ?? record.event;
				const event = state.data.events.find((entry) => entry.id === eventId);
				if (!event)
					throw new Error(
						"Event not found. Import events first or use their app ID.",
					);
				if (
					event.eligiblePersonIds &&
					!event.eligiblePersonIds.includes(personId)
				)
					throw new Error("This member is not eligible for the event.");
				const existing = state.data.responses.find(
					(entry) => entry.eventId === eventId && entry.personId === personId,
				);
				if (
					existing &&
					(existing.response !== record.response ||
						existing.attendance !== record.attendance)
				)
					throw new Error(
						"Attendance already exists. Edit it on the event to avoid overwriting it.",
					);
				return {
					...base,
					status: existing ? "link" : "create",
					record,
					personId,
					eventId,
					targetId: `${eventId}:${personId}`,
					current: JSON.stringify(existing),
				};
			}
			const current =
				state.records[seasonRecordKey(personId, input.seasonId)] ??
				defaultPreviewSeasonRecord(state.data, personId, input.seasonId);
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
					targetId: seasonRecordKey(personId, input.seasonId),
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
				current: JSON.stringify(current),
			};
		} catch (error) {
			return {
				...base,
				status: "error",
				error: error instanceof Error ? error.message : "Invalid row.",
			};
		}
	});
	return plans.map(
		(plan): ImportPlan =>
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
				? {
						...plan,
						status: "error",
						error:
							"Repeated member/event or season record. Keep one row per record.",
					}
				: plan,
	);
};

export const commitPreviewImport = (
	state: PreviewImportState,
	account: Account,
	input: ImportInput,
	expected: string,
): PreviewImportState => {
	if (!account.admin) throw new Error("Administrator access required.");
	const plans = previewImportPlans(state, input);
	if (JSON.stringify(plans) !== expected)
		throw new Error(
			"Records changed after preview. Preview again before importing.",
		);
	if (plans.some((plan) => plan.status === "error"))
		throw new Error("Fix the highlighted rows first.");
	return plans.reduce((current, plan): PreviewImportState => {
		const record = plan.record;
		if (!record || !plan.targetId || plan.status === "skip") return current;
		const references = {
			...current.references,
			[importReferenceKey(input, record.kind, record.sourceId)]: {
				targetId: plan.targetId,
				fingerprint: JSON.stringify(record),
			},
		};
		if (plan.status === "link")
			return { data: current.data, records: current.records, references };
		if (record.kind === "members")
			return {
				records: current.records,
				references,
				data: reduceApp(current.data, account, {
					type: "add-member",
					charge: 0,
					member: {
						id: plan.targetId,
						name: record.name,
						programs: ["club"],
						position: "",
						rating: 3,
						registration: "missing",
						goal: "",
						steps: 0,
					},
				}),
			};
		if (record.kind === "events")
			return {
				records: current.records,
				references,
				data: reduceApp(current.data, account, {
					type: "create-event",
					id: `import:${input.source}:${encodeURIComponent(record.sourceId)}`,
					draft: record.draft,
				}),
			};
		if (record.kind === "attendance" && plan.personId && plan.eventId)
			return {
				records: current.records,
				references,
				data: {
					...current.data,
					responses: [
						...current.data.responses,
						{
							personId: plan.personId,
							eventId: plan.eventId,
							response: record.response,
							attendance: record.attendance,
						},
					],
				},
			};
		if (
			(record.kind === "registration" || record.kind === "payments") &&
			plan.personId
		) {
			const key = seasonRecordKey(plan.personId, input.seasonId);
			const previous =
				current.records[key] ??
				defaultPreviewSeasonRecord(current.data, plan.personId, input.seasonId);
			const next =
				record.kind === "registration"
					? {
							...previous,
							registration: record.status,
							cuga: record.cuga,
							due: record.dues,
							revision: previous.revision + 1,
						}
					: applyLedgerChange(previous, {
							kind: "payment",
							amount: record.amount,
							note: record.note,
							date: record.date,
						});
			return {
				data: current.data,
				references,
				records: { ...current.records, [key]: next },
			};
		}
		return { data: current.data, records: current.records, references };
	}, state);
};
