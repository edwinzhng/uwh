import { usePaginatedQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	Button,
	ListItem,
	SegmentedControl,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { fitnessUnitLabel } from "../domain/fitness";
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
			<FitnessWorkspace
				testId={testId}
				onBack={(): void => setTestId(undefined)}
			/>
		);
	return (
		<Stack>
			<Stack>
				<SegmentedControl
					label="Tests"
					value={view}
					onValueChange={setView}
					options={[
						{ value: "active", label: "Active" },
						{ value: "archived", label: "Archived" },
					]}
				/>
				<Button
					label="New test"
					icon="plus"
					onPress={(): void => setCreating(true)}
				/>
			</Stack>
			<Surface padding="xs">
				<Stack gap="xs">
					{tests.results.map((test) => (
						<ListItem
							key={test._id}
							title={test.name}
							description={fitnessUnitLabel(test.unit)}
							onPress={(): void => setTestId(test._id)}
						/>
					))}
					{!tests.results.length ? (
						<Text tone="secondary">
							{tests.status === "LoadingFirstPage"
								? "Loading…"
								: "No tests yet."}
						</Text>
					) : undefined}
				</Stack>
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
		</Stack>
	);
};
