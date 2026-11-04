import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import { FitnessData } from "../backend/fitness-data";
import {
	Badge,
	Button,
	EmptyState,
	Field,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	SectionHeading,
	Stack,
	Surface,
	Text,
	TrendChart,
} from "../design-system";
import { fitnessAverage, formatFitnessValue } from "../domain/fitness";
import type { FitnessTest } from "../domain/fitness-model";
export const FitnessProgress = ({
	test,
	seasonId,
}: {
	test: FitnessTest;
	seasonId: string;
}): ReactElement => {
	const params = useLocalSearchParams<{ players?: string }>();
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<string[]>(
		params.players?.split(",").slice(0, 4) ?? [],
	);
	return (
		<FitnessData
			request={{
				type: "progress",
				testId: test._id,
				seasonId,
				search,
				personIds: selected,
			}}
		>
			{({ roster: page, trends }) => (
				<Stack>
					{selected.length && test.unit !== "pass_fail" ? (
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
									) : trends ? (
										<EmptyState
											title="No results for these players"
											description="Record results for the selected players to compare their progress."
										/>
									) : (
										<LoadingContent />
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
						}}
					/>
					<Surface>
						<List>
							{page?.page.map((row) => (
								<ListItem
									key={row.personId}
									title={row.name}
									description={
										row.stats
											? `${test.unit === "pass_fail" ? fitnessAverage(test.unit, row.stats) : `Best ${formatFitnessValue(test.unit, row.stats.best)} · ${fitnessAverage(test.unit, row.stats)} average`} · ${row.stats.count} results`
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
								page ? (
									<EmptyState
										title="No players found"
										description="Try a different name or clear the search to see more players."
									/>
								) : (
									<LoadingContent />
								)
							) : undefined}
						</List>
					</Surface>
					<InfiniteScroll
						loadMore={
							page && !page.isDone && !page.loadingMore
								? (): void => page.loadMore(25)
								: undefined
						}
						loading={page?.loadingMore}
						revision={page?.page.length}
					/>
				</Stack>
			)}
		</FitnessData>
	);
};
