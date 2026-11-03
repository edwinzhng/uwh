import { useAtomValue, useSetAtom } from "jotai";
import type { SeasonRecordController } from "../backend/use-season-record";
import { canManagePerson } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import {
	defaultPreviewSeasonRecord,
	nextPreviewSeasonRecord,
	seasonRecordKey,
} from "../domain/preview-season-ledger";
import { defaultSeasonId } from "../domain/seasons";
import { useTask } from "../features/use-task";
import { newId, previewDataAtom, useApp } from "./app-state";
import { previewSeasonLedgerAtom } from "./season-ledger-data";

export {
	previewSeasonLedgerAtom,
	type SeasonHistoryEntry,
} from "./season-ledger-data";

export const usePreviewSeasonRecord = (
	personId: string,
	seasonId: string,
): SeasonRecordController => {
	const { data, account } = useApp();
	const ledger = useAtomValue(previewSeasonLedgerAtom);
	const setLedger = useSetAtom(previewSeasonLedgerAtom);
	const setData = useSetAtom(previewDataAtom);
	const task = useTask();
	const key = seasonRecordKey(personId, seasonId);
	const record =
		ledger.records[key] ?? defaultPreviewSeasonRecord(data, personId, seasonId);
	const readable = account.admin || canManagePerson(account, personId);
	return {
		record: readable ? record : undefined,
		busy: task.busy,
		error: task.error,
		save: async (change, revision): Promise<boolean> =>
			task.run(async (): Promise<void> => {
				if (!account.admin) throw new Error("Administrator access required.");
				if (
					!data.members.some((member) => member.id === personId) ||
					!data.seasons.some((season) => season.id === seasonId)
				)
					throw new Error("Choose a member and season.");
				const id = newId();
				const expectedRevision = revision ?? record.revision;
				const next = nextPreviewSeasonRecord(record, change, expectedRevision);
				setLedger((current) => {
					const latest = current.records[key] ?? record;
					const updated = nextPreviewSeasonRecord(
						latest,
						change,
						expectedRevision,
					);
					return {
						records: { ...current.records, [key]: updated },
						history: [
							{
								id,
								personId,
								seasonId,
								kind: change.kind,
								amount: change.kind === "registration" ? 0 : change.amount,
								note:
									change.kind === "registration"
										? `Registration: ${change.status} · CUGA: ${change.cuga ? "Yes" : "No"}`
										: change.note.trim(),
								date:
									change.kind === "registration"
										? clubDate(undefined, data.timeZone)
										: change.date,
								actor: account.name,
								before: JSON.stringify(latest),
								after: JSON.stringify(updated),
							},
							...current.history,
						],
					};
				});
				if (seasonId === defaultSeasonId)
					setData((current) => ({
						...current,
						members: current.members.map((member) =>
							member.id === personId
								? { ...member, registration: next.registration }
								: member,
						),
						charges: [
							...current.charges.filter((entry) => entry.personId !== personId),
							{ personId, amount: next.due },
						],
						paymentTotals: { ...current.paymentTotals, [personId]: next.paid },
						payments:
							change.kind === "payment" || change.kind === "refund"
								? [
										...current.payments,
										{
											id,
											personId,
											amount:
												change.amount * (change.kind === "refund" ? -1 : 1),
											note: change.note.trim(),
										},
									]
								: current.payments,
						trackerValues: {
							...current.trackerValues,
							[`membership:${personId}`]: next.cuga ? "yes" : "no",
						},
					}));
			}),
	};
};
