import type { SeasonRecordChange } from "../backend/use-season-record";
import { validDate } from "./app-rules";
import type { AppData } from "./app-types";
import { applyLedgerChange, type SeasonRecord } from "./season-ledger";
import { defaultSeasonId } from "./seasons";

export const seasonRecordKey = (personId: string, seasonId: string): string =>
	`${seasonId}:${personId}`;

export const defaultPreviewSeasonRecord = (
	data: AppData,
	personId: string,
	seasonId: string,
): SeasonRecord => ({
	personId,
	seasonId,
	registration:
		seasonId === defaultSeasonId
			? (data.members.find((person) => person.id === personId)?.registration ??
				"missing")
			: "missing",
	cuga:
		seasonId === defaultSeasonId &&
		["yes", "Active"].includes(
			data.trackerValues[`membership:${personId}`] ?? "",
		),
	due:
		seasonId === defaultSeasonId
			? data.charges
					.filter((entry) => entry.personId === personId)
					.reduce((sum, entry) => sum + entry.amount, 0)
			: 0,
	paid:
		seasonId === defaultSeasonId
			? (data.paymentTotals?.[personId] ??
				data.payments
					.filter((entry) => entry.personId === personId)
					.reduce((sum, entry) => sum + entry.amount, 0))
			: 0,
	revision: 0,
});

export const nextPreviewSeasonRecord = (
	record: SeasonRecord,
	change: SeasonRecordChange,
	revision: number,
): SeasonRecord => {
	if (record.revision !== revision)
		throw new Error("This record changed. Review it and try again.");
	if (change.kind === "registration")
		return {
			...record,
			registration: change.status,
			cuga: change.cuga,
			revision: record.revision + 1,
		};
	if (!validDate(change.date)) throw new Error("Choose a date.");
	return applyLedgerChange(record, change);
};
