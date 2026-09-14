import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { canCoach } from "../domain/app-rules";
import { PlayerCoachingLive } from "./player-coaching-live";
import { PlayerCoachingPreview } from "./player-coaching-preview";
export const PlayerCoachingPanel = ({
	personId,
}: {
	personId: string;
}): ReactElement | undefined => {
	const { source, account } = useApp();
	if (!canCoach(account)) return undefined;
	return source === "convex" ? (
		<PlayerCoachingLive personId={personId} />
	) : (
		<PlayerCoachingPreview personId={personId} />
	);
};
