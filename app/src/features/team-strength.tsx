import { useQuery } from "convex/react";
import type { ReactElement } from "react";
import { api } from "../../convex/_generated/api";
import { useApp } from "../demo/app-state";
import { Text } from "../design-system";
import { defaultPlayerCoaching } from "../domain/player-coaching";
import { type PlayerStrength, teamStrength } from "../domain/team-strength";

const StrengthLabel = ({
	people,
	profiles,
}: {
	people: string[];
	profiles?: PlayerStrength[];
}): ReactElement => {
	const summary = profiles ? teamStrength(people, profiles) : undefined;
	return (
		<Text variant="caption">
			{summary
				? `Score · ${summary.scored ? summary.total : "—"}${summary.scored < summary.count ? ` · ${summary.scored}/${summary.count} rated` : ""}`
				: "Score · —"}
		</Text>
	);
};
const LiveStrength = ({ people }: { people: string[] }): ReactElement => (
	<StrengthLabel
		people={people}
		profiles={useQuery(api.player_coaching.teamStrength, {
			personIds: [...new Set(people)].sort(),
		})}
	/>
);
const PreviewStrength = ({ people }: { people: string[] }): ReactElement => {
	const { data } = useApp();
	return (
		<StrengthLabel
			people={people}
			profiles={people.flatMap((id) => {
				const member = data.members.find((entry) => entry.id === id);
				return member
					? [
							data.playerCoaching?.find((entry) => entry.personId === id) ??
								defaultPlayerCoaching(member),
						]
					: [];
			})}
		/>
	);
};
export const TeamStrength = ({
	people,
}: {
	people: string[];
}): ReactElement | undefined => {
	const { source, account } = useApp();
	if (!account.coachPrograms.length) return undefined;
	return source === "convex" ? (
		<LiveStrength people={people} />
	) : (
		<PreviewStrength people={people} />
	);
};
