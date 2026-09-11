import { usePaginatedQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	Button,
	EmptyState,
	List,
	ListItem,
	Surface,
	Tabs,
	Text,
} from "../design-system";
import { fitnessUnitLabel } from "../domain/fitness";
import { ClubShell } from "./club-shell";
import { FitnessTestForm } from "./fitness-test-form";
import { FitnessWorkspace } from "./fitness-workspace";
export const FitnessTests = (): ReactElement => {
	const [view, setView] = useState("active");
	const [testId, setTestId] = useState<Id<"fitnessTests">>();
	const [creating, setCreating] = useState(false);
	const tests = usePaginatedQuery(
		api.fitness.list,
		{ archived: view === "archived" },
		{ initialNumItems: 30 },
	);
	if (testId)
		return (
			<ClubShell title="Fitness" staffRole="coach">
				<FitnessWorkspace
					testId={testId}
					onBack={(): void => setTestId(undefined)}
				/>
			</ClubShell>
		);
	return (
		<ClubShell
			title="Fitness"
			staffRole="coach"
			action={
				<Button
					label="New test"
					prefix="plus"
					onPress={(): void => setCreating(true)}
				/>
			}
			tabs={
				<Tabs
					page
					hideLabel
					label="Tests"
					value={view}
					onValueChange={setView}
					options={[
						{ value: "active", label: "Active" },
						{ value: "archived", label: "Archived" },
					]}
				/>
			}
		>
			<Surface padding="xs">
				<List>
					{tests.results.map((test) => (
						<ListItem
							key={test._id}
							title={test.name}
							description={fitnessUnitLabel(test.unit)}
							onPress={(): void => setTestId(test._id)}
						/>
					))}
					{!tests.results.length ? (
						tests.status === "LoadingFirstPage" ? (
							<Text tone="secondary">Loading…</Text>
						) : (
							<EmptyState
								title={
									view === "archived"
										? "No archived tests"
										: "No fitness tests yet"
								}
								description={
									view === "archived"
										? "Archived tests and their results will appear here."
										: "Create a test to start recording results and tracking progress."
								}
							/>
						)
					) : undefined}
				</List>
			</Surface>
			{tests.status === "CanLoadMore" ? (
				<Button
					label="More tests"
					variant="secondary"
					onPress={(): void => tests.loadMore(30)}
				/>
			) : undefined}
			{creating ? (
				<FitnessTestForm
					onClose={(): void => setCreating(false)}
					onSaved={setTestId}
				/>
			) : undefined}
		</ClubShell>
	);
};
