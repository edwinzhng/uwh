import type { ReactElement } from "react";
import { Icon, Row, Stack, Text, TrendChart } from "../design-system";
import { formatDate } from "../domain/app-rules";
import {
	fitnessLowerIsBetter,
	fitnessUnitLabel,
	formatFitnessValue,
} from "../domain/fitness";
import type { PersonalFitnessRow } from "../domain/personal-fitness";
import { latestIsPersonalBest } from "../domain/personal-fitness";
import { FitnessChangeIndicator } from "./fitness-change-indicator";
import { PersonalFitnessHistory } from "./personal-fitness-history";

export const PersonalFitnessDetail = ({
	row,
	personId,
}: {
	row: PersonalFitnessRow;
	personId: string;
}): ReactElement => {
	const format = (value: number | undefined): string =>
		`${formatFitnessValue(row.test.unit, value)}${row.test.unit === "distance" && value !== undefined ? " m" : ""}`;
	const latest = row.history.at(0);
	return (
		<Stack gap="lg">
			<Row justify="between" wrap>
				<Stack gap="xs">
					<Text variant="caption" tone="secondary">
						Latest{latest ? ` · ${formatDate(latest.date)}` : ""}
					</Text>
					<Text variant="number">{format(latest?.value)}</Text>
					{latestIsPersonalBest(row) ? (
						<Row gap="xxs">
							<Icon name="star" tone="success" />
							<Text variant="caption" tone="success">
								Personal best
							</Text>
						</Row>
					) : undefined}
				</Stack>
				{row.test.unit !== "pass_fail" && !latestIsPersonalBest(row) ? (
					<Stack gap="xs">
						<Text variant="caption" tone="secondary">
							Personal best
						</Text>
						<Text variant="number">{format(row.stats?.best)}</Text>
					</Stack>
				) : undefined}
			</Row>
			<Text variant="small" tone="secondary">
				{fitnessUnitLabel(row.test.unit, fitnessLowerIsBetter(row.test))}
			</Text>
			<FitnessChangeIndicator row={row} />
			{row.test.unit !== "pass_fail" ? (
				<TrendChart
					series={[
						{
							id: row.test._id,
							label: row.test.name,
							points: row.history
								.slice()
								.reverse()
								.map(({ date, value }) => ({ date, value })),
						},
					]}
					formatValue={format}
				/>
			) : undefined}
			{row.limited && row.test.unit !== "pass_fail" ? (
				<Text variant="caption" tone="secondary">
					Chart shows the latest 100 results.
				</Text>
			) : undefined}
			<PersonalFitnessHistory row={row} personId={personId} />
		</Stack>
	);
};
