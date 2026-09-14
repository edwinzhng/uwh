import type { ReactElement } from "react";
import { usePlayerCoaching } from "../backend/use-player-coaching";
import { PlayerCoachingDetails } from "./player-coaching-details";
export const PlayerCoachingLive = ({
	personId,
}: {
	personId: string;
}): ReactElement => {
	const state = usePlayerCoaching(personId);
	return (
		<PlayerCoachingDetails
			profile={state.profile}
			busy={state.busy}
			error={state.error}
			save={state.save}
		/>
	);
};
