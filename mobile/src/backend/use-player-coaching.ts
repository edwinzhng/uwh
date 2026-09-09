import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { PlayerCoaching } from "../domain/player-coaching";
import { friendlyError } from "./errors";

export type PlayerCoachingState = {
	profile?: PlayerCoaching;
	busy: boolean;
	error?: string;
	save: (value: PlayerCoaching) => Promise<boolean>;
};
export const usePlayerCoaching = (personId: string): PlayerCoachingState => {
	const profile = useQuery(api.player_coaching.profile, { personId });
	const update = useMutation(api.player_coaching.save);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const save = async (value: PlayerCoaching): Promise<boolean> => {
		if (busy) return false;
		setBusy(true);
		setError(undefined);
		try {
			await update(value);
			return true;
		} catch (failure) {
			setError(friendlyError(failure));
			return false;
		} finally {
			setBusy(false);
		}
	};
	return { profile, busy, error, save };
};
