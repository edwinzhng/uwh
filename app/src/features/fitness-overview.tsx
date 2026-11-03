import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import { FitnessOverviewData } from "../backend/fitness-overview-data";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Combobox,
	EmptyState,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Row,
	Stack,
	Surface,
} from "../design-system";
import { formatFitnessValue } from "../domain/fitness";
import { SeasonSelect } from "./season-select";
import { useSeason } from "./use-season";

export const FitnessOverview = ({
	onSelect,
}: {
	onSelect: (testId: string) => void;
}): ReactElement => {
	const { data } = useApp();
	const [seasonId] = useSeason();
	const params = useLocalSearchParams<{ players?: string }>();
	const [personId, setPersonId] = useState<string | undefined>(
		params.players?.split(",").at(0),
	);
	const people = data.members
		.filter((member) => !member.archived && !member.mergedInto)
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name));
	return (
		<Stack>
			<SeasonSelect />
			<Row wrap align="end">
				<Combobox
					label="Player"
					value={personId}
					options={people.map((person) => ({
						value: person.id,
						label: person.name,
						person: { id: person.id, name: person.name },
					}))}
					onValueChange={setPersonId}
				/>
				{personId ? (
					<Button
						label="Team only"
						variant="ghost"
						onPress={(): void => setPersonId(undefined)}
					/>
				) : undefined}
			</Row>
			<FitnessOverviewData seasonId={seasonId} personId={personId}>
				{(overview) => (
					<Stack>
						<Surface>
							<List>
								{overview.rows.map((row) => (
									<ListItem
										key={row.test._id}
										title={row.test.name}
										description={[
											personId && row.test.unit !== "pass_fail"
												? `Personal best ${formatFitnessValue(row.test.unit, row.personal?.best)}`
												: undefined,
											personId
												? row.latest
													? `Latest ${formatFitnessValue(row.test.unit, row.latest.value)} · ${row.latest.date}`
													: "No personal result this season"
												: undefined,
											row.teamBest
												? row.test.unit === "pass_fail"
													? "Pass/fail"
													: `Team best ${formatFitnessValue(row.test.unit, row.teamBest.value)} · ${row.teamBest.name}`
												: "No results this season",
										]
											.filter(Boolean)
											.join("\n")}
										onPress={(): void => onSelect(row.test._id)}
										trailing={
											row.test.unit !== "pass_fail" &&
											personId &&
											row.personal &&
											row.personal.best === row.teamBest?.value ? (
												<Badge label="Team best" kind="success" />
											) : undefined
										}
									/>
								))}
								{overview.loading ? (
									<LoadingContent />
								) : !overview.rows.length ? (
									<EmptyState
										title="No active tests"
										description="Create a test to compare results."
									/>
								) : undefined}
							</List>
						</Surface>
						{overview.more || overview.loadingMore ? (
							<InfiniteScroll
								loadMore={overview.loadMore}
								loading={overview.loadingMore}
								revision={overview.rows.length}
								disabled={false}
							/>
						) : undefined}
					</Stack>
				)}
			</FitnessOverviewData>
		</Stack>
	);
};
