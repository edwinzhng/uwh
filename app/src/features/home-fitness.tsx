import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { useActivePerson, useApp } from "../demo/app-state";
import { Button, featureIdentity, SummaryCard, Text } from "../design-system";
import { FitnessCompetition } from "./fitness-competition";
import { useClubToday } from "./use-club-today";

export const HomeFitness = (_props: {
	chart?: "line" | "dots" | "tall" | "wide";
}): ReactElement => {
	const person = useActivePerson();
	const { data } = useApp();
	const today = useClubToday();
	const season = data.seasons.find(
		(entry) => entry.start <= today && entry.end >= today,
	);
	const router = useRouter();
	return (
		<SummaryCard
			title="Fitness tests"
			variant="metric"
			compact
			icon={featureIdentity.fitness.icon}
			category={featureIdentity.fitness.category}
			action={
				<Button
					label="My results"
					variant="ghost"
					compact
					onPress={(): void =>
						router.push({ pathname: "/account", params: { tab: "fitness" } })
					}
				/>
			}
		>
			{season ? (
				<FitnessCompetition personId={person.id} seasonId={season.id} />
			) : (
				<Text tone="secondary">No current season.</Text>
			)}
		</SummaryCard>
	);
};
