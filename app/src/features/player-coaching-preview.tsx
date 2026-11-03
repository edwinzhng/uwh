import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { previewDataAtom } from "../demo/app-state";
import { lineupIncludesPerson } from "../domain/lineup";
import {
	balancingProfileChanged,
	defaultPlayerCoaching,
	validatePlayerCoaching,
} from "../domain/player-coaching";
import { PlayerCoachingDetails } from "./player-coaching-details";
export const PlayerCoachingPreview = ({
	personId,
}: {
	personId: string;
}): ReactElement => {
	const [data, setData] = useAtom(previewDataAtom);
	const member = data.members.find((entry) => entry.id === personId);
	const profile =
		data.playerCoaching?.find((entry) => entry.personId === personId) ??
		(member ? defaultPlayerCoaching(member) : undefined);
	return (
		<PlayerCoachingDetails
			profile={profile}
			busy={false}
			save={async (value): Promise<boolean> => {
				validatePlayerCoaching(value);
				setData((current) => ({
					...current,
					teams: current.teams.map((plan) =>
						profile &&
						balancingProfileChanged(profile, value) &&
						lineupIncludesPerson(plan, personId)
							? { ...plan, published: false, coachingStale: true }
							: plan,
					),
					playerCoaching: [
						...(current.playerCoaching ?? []).filter(
							(entry) => entry.personId !== personId,
						),
						{ ...value, revision: value.revision + 1 },
					],
				}));
				return true;
			}}
		/>
	);
};
