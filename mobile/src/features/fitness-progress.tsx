import { useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
	Badge,
	Button,
	Field,
	List,
	ListItem,
	Row,
	SectionHeading,
	Stack,
	Surface,
	Text,
	TrendChart,
} from "../design-system";
import { fitnessAverage, formatFitnessValue } from "../domain/fitness";
export const FitnessProgress = ({
	test,
	seasonId,
}: {
	test: Doc<"fitnessTests">;
	seasonId: string;
}): ReactElement => {
	const [search, setSearch] = useState("");
	const [cursors, setCursors] = useState<string[]>([]);
	const [selected, setSelected] = useState<string[]>([]);
	const page = useQuery(api.fitness.roster, {
		testId: test._id,
		seasonId,
		search,
		paginationOpts: { cursor: cursors.at(-1) ?? null, numItems: 25 },
	});
	const trends = useQuery(api.fitness.trends, {
		testId: test._id,
		seasonId,
		personIds: selected,
	});
	return (
		<Stack>
			{selected.length ? (
				<Stack gap="sm">
					<SectionHeading
						action={
							<Button
								label="Clear"
								variant="ghost"
								onPress={(): void => setSelected([])}
							/>
						}
					>
						Trends
					</SectionHeading>
					<Surface>
						<Stack>
							{trends?.some((series) => series.points.length) ? (
								<TrendChart
									series={trends}
									formatValue={(value): string =>
										test.unit === "pass_fail" && value !== 0 && value !== 1
											? ""
											: formatFitnessValue(test.unit, value)
									}
								/>
							) : (
								<Text tone="secondary">
									{trends ? "No results for these players." : "Loading…"}
								</Text>
							)}
							{trends?.some((series) => series.limited) ? (
								<Text variant="caption" tone="secondary">
									Latest 100 results per player.
								</Text>
							) : undefined}
							{trends?.map((series) => (
								<Button
									key={series.id}
									label={`Remove ${series.label}`}
									variant="ghost"
									onPress={(): void =>
										setSelected((values) =>
											values.filter((value) => value !== series.id),
										)
									}
								/>
							))}
						</Stack>
					</Surface>
				</Stack>
			) : undefined}
			<Text variant="small" tone="secondary">
				Select up to 4 players to compare.
			</Text>
			<Field
				label="Find player"
				value={search}
				inputMode="search"
				onValueChange={(value): void => {
					setSearch(value);
					setCursors([]);
				}}
			/>
			<Surface padding="xs">
				<List>
					{page?.page.map((row) => (
						<ListItem
							key={row.personId}
							title={row.name}
							description={
								row.stats
									? `Best ${formatFitnessValue(test.unit, row.stats.best)} · ${fitnessAverage(test.unit, row.stats)}${test.unit !== "pass_fail" ? " average" : ""} · ${row.stats.count} results`
									: "No results this season"
							}
							trailing={
								selected.includes(row.personId) ? (
									<Badge label="Selected" kind="coach" />
								) : undefined
							}
							onPress={(): void =>
								setSelected((values) =>
									values.includes(row.personId)
										? values.filter((value) => value !== row.personId)
										: values.length < 4
											? [...values, row.personId]
											: values,
								)
							}
						/>
					))}
					{!page?.page.length ? (
						<Text tone="secondary">
							{page ? "No players found." : "Loading…"}
						</Text>
					) : undefined}
				</List>
			</Surface>
			<Row justify="between">
				<Button
					label="Previous"
					variant="secondary"
					isDisabled={!cursors.length}
					onPress={(): void => setCursors((values) => values.slice(0, -1))}
				/>
				<Button
					label="Next"
					variant="secondary"
					isDisabled={!page || page.isDone}
					onPress={(): void => {
						if (page) setCursors((values) => [...values, page.continueCursor]);
					}}
				/>
			</Row>
		</Stack>
	);
};
