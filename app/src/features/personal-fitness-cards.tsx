import { type ReactElement, useState } from "react";
import {
	Disclosure,
	Grid,
	List,
	ListItem,
	Row,
	SectionHeading,
	Stack,
	SummaryCard,
	Surface,
	Text,
	TrendChart,
} from "../design-system";
import { formatDate } from "../domain/app-rules";
import {
	fitnessLowerIsBetter,
	fitnessUnitLabel,
	formatFitnessValue,
} from "../domain/fitness";
import type { PersonalFitnessRow } from "../domain/personal-fitness";
import { FitnessChangeIndicator } from "./fitness-change-indicator";

export const PersonalFitnessCards = ({
	rows,
}: {
	rows: PersonalFitnessRow[];
}): ReactElement => {
	const [selectedId, setSelectedId] = useState<string>();
	const selected =
		rows.find((row) => row.test._id === selectedId) ?? rows.at(0);
	const formatSelected = (value: number): string =>
		selected
			? `${formatFitnessValue(selected.test.unit, value)}${selected.test.unit === "distance" ? " m" : ""}`
			: "—";
	return (
		<Stack gap="lg">
			<Grid gap="md">
				{rows.map((row) => {
					const latest = row.history.at(0);
					const format = (value: number | undefined): string =>
						`${formatFitnessValue(row.test.unit, value)}${row.test.unit === "distance" && value !== undefined ? " m" : ""}`;
					return (
						<SummaryCard
							key={row.test._id}
							title={row.test.name}
							variant="metric"
							metadata={latest ? formatDate(latest.date) : undefined}
							accessibilityLabel={`${row.test.name}. Latest ${format(latest?.value)}. ${selected?.test._id === row.test._id ? "Selected. " : ""}View progress`}
							onPress={(): void => setSelectedId(row.test._id)}
						>
							<Text variant="number">{format(latest?.value)}</Text>
							<Row justify="between" wrap>
								<Text variant="caption" tone="secondary">
									{row.test.unit === "pass_fail"
										? "Pass/fail"
										: `Best ${format(row.stats?.best)}`}
								</Text>
								<FitnessChangeIndicator row={row} />
							</Row>
							{selected?.test._id === row.test._id ? (
								<Text variant="caption" tone="brand">
									Viewing progress
								</Text>
							) : undefined}
						</SummaryCard>
					);
				})}
			</Grid>
			{selected ? (
				<Stack gap="sm">
					<SectionHeading>{selected.test.name} progress</SectionHeading>
					<Surface>
						<Stack gap="md">
							<Text variant="small" tone="secondary">
								{fitnessUnitLabel(
									selected.test.unit,
									fitnessLowerIsBetter(selected.test),
								)}
							</Text>
							<TrendChart
								series={[
									{
										id: selected.test._id,
										label: selected.test.name,
										points: selected.history
											.slice()
											.reverse()
											.map(({ date, value }) => ({ date, value })),
									},
								]}
								formatValue={(value): string =>
									selected.test.unit === "pass_fail" &&
									value !== 0 &&
									value !== 1
										? ""
										: formatSelected(value)
								}
							/>
							{selected.limited ? (
								<Text variant="caption" tone="secondary">
									Showing the latest 100 results.
								</Text>
							) : undefined}
						</Stack>
					</Surface>
					<Disclosure
						title="Result history"
						summary={`${selected.stats?.count ?? selected.history.length} results`}
					>
						<List>
							{selected.history.map((entry) => (
								<ListItem
									key={entry.sessionId}
									title={formatDate(entry.date)}
									description={entry.notes || undefined}
									trailing={
										<Text variant="label">{formatSelected(entry.value)}</Text>
									}
								/>
							))}
						</List>
					</Disclosure>
				</Stack>
			) : undefined}
		</Stack>
	);
};
