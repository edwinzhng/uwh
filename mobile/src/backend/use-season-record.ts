import { useMutation, useQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { newId } from "../demo/app-state";
import type { SeasonRecord } from "../domain/season-ledger";
import { friendlyError } from "./errors";

type Change = FunctionArgs<typeof api.season_records.change>["change"];
export const useSeasonRecord = (
	personId: string,
	seasonId: string,
): {
	record?: SeasonRecord;
	busy: boolean;
	error?: string;
	save: (change: Change, revision?: number) => Promise<boolean>;
} => {
	const record = useQuery(api.season_records.record, { personId, seasonId });
	const update = useMutation(api.season_records.change);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const save = async (change: Change, revision?: number): Promise<boolean> => {
		if (!record || busy) return false;
		setBusy(true);
		setError(undefined);
		try {
			await update({
				personId,
				seasonId,
				change,
				key: newId(),
				revision: revision ?? record.revision,
			});
			return true;
		} catch (error) {
			setError(friendlyError(error));
			return false;
		} finally {
			setBusy(false);
		}
	};
	return { record, busy, error, save };
};
