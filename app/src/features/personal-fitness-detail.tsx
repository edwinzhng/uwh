import type { ReactElement } from "react";
import { List, ListItem, Row, Stack, Text, TrendChart } from "../design-system";
import { formatDate } from "../domain/app-rules";
import {
	fitnessLowerIsBetter,
	fitnessUnitLabel,
	formatFitnessValue,
} from "../domain/fitness";
import type { PersonalFitnessRow } from "../domain/personal-fitness";
import { FitnessChangeIndicator } from "./fitness-change-indicator";

export const PersonalFitnessDetail = ({
	row,
}: {
	row: PersonalFitnessRow;
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
				</Stack>
				<Stack gap="xs">
					<Text variant="caption" tone="secondary">
						Personal best
					</Text>
					<Text variant="number">{format(row.stats?.best)}</Text>
				</Stack>
			</Row>
			<Text variant="small" tone="secondary">
				{fitnessUnitLabel(row.test.unit, fitnessLowerIsBetter(row.test))}
			</Text>
			<FitnessChangeIndicator row={row} />
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
			<Stack gap="sm">
				<Text variant="h4">
					History · {row.stats?.count ?? row.history.length} results
				</Text>
				<List>
					{row.history.map((entry) => (
						<ListItem
							key={entry.sessionId}
							title={formatDate(entry.date)}
							description={entry.notes || undefined}
							trailing={<Text variant="label">{format(entry.value)}</Text>}
						/>
					))}
				</List>
				{row.limited ? (
					<Text variant="caption" tone="secondary">
						Showing the latest 100 results; personal best covers the full
						season.
					</Text>
				) : undefined}
			</Stack>
		</Stack>
	);
};
