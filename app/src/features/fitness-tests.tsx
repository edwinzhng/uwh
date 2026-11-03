import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import { FitnessData } from "../backend/fitness-data";
import {
	Button,
	EmptyState,
	InfiniteScroll,
	List,
	ListItem,
	LoadingContent,
	Row,
	Surface,
	Tabs,
} from "../design-system";
import { fitnessLowerIsBetter, fitnessUnitLabel } from "../domain/fitness";
import { ClubShell } from "./club-shell";
import { FitnessOverview } from "./fitness-overview";
import { FitnessQuickLog } from "./fitness-quick-log";
import { FitnessTestForm } from "./fitness-test-form";
import { FitnessWorkspace } from "./fitness-workspace";
export const FitnessTests = (): ReactElement => {
	const params = useLocalSearchParams<{ test?: string; view?: string }>();
	const [view, setView] = useState(
		params.view === "overview" ? "overview" : "active",
	);
	const [testId, setTestId] = useState<string | undefined>(params.test);
	const [creating, setCreating] = useState(false);
	const [logging, setLogging] = useState(false);
	if (testId)
		return (
			<ClubShell title="Fitness tests">
				<FitnessWorkspace
					testId={testId}
					onBack={(): void => setTestId(undefined)}
				/>
			</ClubShell>
		);
	return (
		<FitnessData request={{ type: "tests", archived: view === "archived" }}>
			{({ tests }) => (
				<ClubShell
					title="Fitness tests"
					action={
						<Row wrap>
							<Button
								label="Log results"
								onPress={(): void => setLogging(true)}
							/>
							<Button
								label="New test"
								variant="secondary"
								prefix="plus"
								onPress={(): void => setCreating(true)}
							/>
						</Row>
					}
					tabs={
						<Tabs
							page
							hideLabel
							label="Tests"
							value={view}
							onValueChange={setView}
							options={[
								{ value: "overview", label: "Overview" },
								{ value: "active", label: "Active" },
								{ value: "archived", label: "Archived" },
							]}
						/>
					}
				>
					{view === "overview" ? (
						<FitnessOverview onSelect={setTestId} />
					) : (
						<>
							<Surface>
								<List>
									{tests.results.map((test) => (
										<ListItem
											key={test._id}
											title={test.name}
											description={fitnessUnitLabel(
												test.unit,
												fitnessLowerIsBetter(test),
											)}
											onPress={(): void => setTestId(test._id)}
										/>
									))}
									{!tests.results.length ? (
										tests.status === "LoadingFirstPage" ? (
											<LoadingContent />
										) : (
											<EmptyState
												title={
													view === "archived"
														? "No archived tests"
														: "No fitness tests"
												}
												description={
													view === "archived"
														? undefined
														: "Create a test to record results."
												}
											/>
										)
									) : undefined}
								</List>
							</Surface>
							{tests.status === "CanLoadMore" ||
							tests.status === "LoadingMore" ? (
								<InfiniteScroll
									loadMore={(): void => tests.loadMore(30)}
									loading={tests.status === "LoadingMore"}
									revision={tests.results.length}
									disabled={false}
								/>
							) : undefined}
						</>
					)}
					{creating ? (
						<FitnessTestForm
							onClose={(): void => setCreating(false)}
							onSaved={setTestId}
						/>
					) : undefined}
					{logging ? (
						<FitnessQuickLog onClose={(): void => setLogging(false)} />
					) : undefined}
				</ClubShell>
			)}
		</FitnessData>
	);
};
