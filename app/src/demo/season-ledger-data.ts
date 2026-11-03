import { atom } from "jotai";
import type { SeasonHistoryEntry } from "../domain/season-history";
import type { SeasonRecord } from "../domain/season-ledger";

export type { SeasonHistoryEntry } from "../domain/season-history";
export type PreviewLedger = {
	records: Record<string, SeasonRecord>;
	history: SeasonHistoryEntry[];
};
export const previewSeasonLedgerAtom = atom<PreviewLedger>({
	records: {},
	history: [],
});
