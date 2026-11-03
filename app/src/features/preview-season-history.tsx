import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { previewSeasonLedgerAtom } from "../demo/season-ledger-state";
import { SeasonHistory } from "./season-history";

export const PreviewSeasonHistory = ({
	personId,
	seasonId,
}: {
	personId: string;
	seasonId: string;
}): ReactElement => {
	const ledger = useAtomValue(previewSeasonLedgerAtom);
	return (
		<SeasonHistory
			entries={ledger.history.filter(
				(entry) => entry.personId === personId && entry.seasonId === seasonId,
			)}
		/>
	);
};
