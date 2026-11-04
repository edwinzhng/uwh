import { useRouter } from "expo-router";
import type { ReactElement } from "react";
import { HomeFitnessData } from "../backend/home-fitness-data";
import { useActivePerson } from "../demo/app-state";
import {
	featureIdentity,
	HomeFitnessLayout,
	Row,
	Sparkline,
	Stack,
	SummaryCard,
	Text,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import { formatFitnessValue, shortFitnessTestName } from "../domain/fitness";
import { FitnessChangeIndicator } from "./fitness-change-indicator";
import { useClubToday } from "./use-club-today";
import { useSeason } from "./use-season";

export const HomeFitness = ({
	chart,
}: {
	chart?: "line" | "dots" | "tall" | "wide";
}): ReactElement => {
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
						metadata={latest ? formatDate(latest.date) : undefined}
						onPress={(): void => {
							if (result) selectSeason(result.seasonId);
							router.push({
								pathname: "/account",
								params: { tab: "fitness" },
							});
						}}
						accessibilityLabel={`Fitness tests for ${person.name}. ${row && latest ? `${shortFitnessTestName(row.test.name)}. ${formatFitnessValue(row.test.unit, latest.value)}${row.test.unit === "distance" ? " metres" : ""}. ${formatDate(latest.date)}.` : "No swim results yet."} Open swim test results`}
					>
						{row && latest ? (
							<HomeFitnessLayout wide={chart === "wide"}>
								<Stack grow gap="xs">
									<Row gap="sm" wrap>
										<Text variant="number">
											{formatFitnessValue(row.test.unit, latest.value)}
											{row.test.unit === "distance" ? " m" : ""}
										</Text>
										<FitnessChangeIndicator row={row} />
									</Row>
									<Text variant="overline" weight="medium">
										{shortFitnessTestName(row.test.name)}
									</Text>
								</Stack>
								{chart &&
								row.test.unit !== "pass_fail" &&
								row.history.length > 1 ? (
									<Sparkline
										variant={chart}
										values={row.history
											.slice(0, 12)
											.reverse()
											.map((entry) => entry.value)}
										label={`${row.test.name} progress: ${row.history
											.slice(0, 12)
											.reverse()
											.map(
												(entry) =>
													`${formatDate(entry.date)}: ${formatFitnessValue(row.test.unit, entry.value)}`,
											)
											.join(", ")}`}
									/>
								) : undefined}
							</HomeFitnessLayout>
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
