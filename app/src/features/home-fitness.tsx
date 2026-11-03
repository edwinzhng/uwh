import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { HomeFitnessData } from "../backend/home-fitness-data";
import { useActivePerson } from "../demo/app-state";
import {
	featureIdentity,
	Row,
	Stack,
	SummaryCard,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import { formatFitnessValue } from "../domain/fitness";
import { FitnessChangeIndicator } from "./fitness-change-indicator";
import { useClubToday } from "./use-club-today";
import { useSeason } from "./use-season";

export const HomeFitness = (): ReactElement => {
	const person = useActivePerson();
	const [, selectSeason] = useSeason();
	const today = useClubToday();
	const router = useRouter();
	return (
		<HomeFitnessData key={person.id} person={person} today={today}>
			{({ result, loading }) => {
				const row = result?.row;
				const latest = row?.history.at(0);
				return (
					<SummaryCard
						title="Fitness tests"
						variant="metric"
						icon={featureIdentity.fitness.icon}
						category={featureIdentity.fitness.category}
						metadata={
							latest ? `${person.name} · ${formatDate(latest.date)}` : undefined
						}
						onPress={(): void => {
							if (result) selectSeason(result.seasonId);
							router.push({
								pathname: "/account",
								params: { tab: "fitness" },
							});
						}}
						accessibilityLabel={`Fitness tests for ${person.name}. ${row && latest ? `${row.test.name}. ${formatFitnessValue(row.test.unit, latest.value)}${row.test.unit === "distance" ? " metres" : ""}. ${formatDate(latest.date)}.` : "No swim results yet."} Open swim test results`}
					>
						{row && latest ? (
							<Stack gap="xs">
								<Row gap="sm" wrap>
									<Text variant="number">
										{formatFitnessValue(row.test.unit, latest.value)}
										{row.test.unit === "distance" ? " m" : ""}
									</Text>
									<FitnessChangeIndicator row={row} />
								</Row>
								<Text variant="overline" weight="medium">
									{row.test.name}
								</Text>
							</Stack>
						) : (
							<Text tone="secondary">
								{loading ? "Loading swim results…" : "No swim results yet."}
							</Text>
						)}
					</SummaryCard>
				);
			}}
		</HomeFitnessData>
	);
};
