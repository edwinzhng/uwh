import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	ActionMenu,
	Badge,
	Button,
	Dialog,
	LoadingContent,
	Row,
	Stack,
	TabContent,
	Tabs,
	Text,
} from "../design-system";
import { fitnessUnitLabel } from "../domain/fitness";
import { FitnessProgress } from "./fitness-progress";
import { FitnessResults } from "./fitness-results";
import { FitnessSessions } from "./fitness-sessions";
import { FitnessTestForm } from "./fitness-test-form";
import { SeasonSelect } from "./season-select";
import { useFitnessTask } from "./use-fitness-task";
import { useSeason } from "./use-season";
export const FitnessWorkspace = ({
	testId,
	onBack,
}: {
	testId: Id<"fitnessTests">;
	onBack: () => void;
}): ReactElement => {
	const test = useQuery(api.fitness.test, { testId });
	const [seasonId] = useSeason();
	const [tab, setTab] = useState("sessions");
	const [editing, setEditing] = useState(false);
	const [confirm, setConfirm] = useState(false);
	const [sessionId, setSessionId] = useState<Id<"fitnessSessions">>();
	const archive = useMutation(api.fitness.archiveTest);
	const task = useFitnessTask();
	if (!test) return <LoadingContent />;
	if (sessionId)
		return (
			<FitnessResults
				key={sessionId}
				test={test}
				sessionId={sessionId}
				onBack={(): void => setSessionId(undefined)}
			/>
		);
	return (
		<Stack>
			<Row justify="between" wrap>
				<Button
					label="Tests"
					icon="arrowLeft"
					variant="ghost"
					onPress={onBack}
				/>
				<ActionMenu
					label="Test options"
					groups={[
						{
							id: "test",
							items: [
								{
									id: "edit",
									label: "Edit test",
									onSelect: (): void => setEditing(true),
								},
								{
									id: "archive",
									label: test.archived ? "Restore test" : "Archive test",
									onSelect: (): void => setConfirm(true),
								},
							],
						},
					]}
				/>
			</Row>
			<Stack gap="xs">
				<Row>
					<Text variant="h4">{test.name}</Text>
					{test.archived ? <Badge label="Archived" /> : undefined}
				</Row>
				<Text variant="small" tone="secondary">
					{fitnessUnitLabel(test.unit)}
				</Text>
			</Stack>
			<SeasonSelect />
			<Tabs
				label="Fitness view"
				value={tab}
				onValueChange={setTab}
				options={[
					{ value: "sessions", label: "Sessions" },
					{ value: "progress", label: "Progress" },
				]}
			/>
			<TabContent value={tab}>
				{tab === "sessions" ? (
					<FitnessSessions
						key={`${testId}:${seasonId}`}
						test={test}
						seasonId={seasonId}
						onSelect={setSessionId}
					/>
				) : (
					<FitnessProgress
						key={`${testId}:${seasonId}`}
						test={test}
						seasonId={seasonId}
					/>
				)}
			</TabContent>
			{editing ? (
				<FitnessTestForm
					test={test}
					onClose={(): void => setEditing(false)}
					onSaved={(): void => {}}
				/>
			) : undefined}
			<Dialog
				title={test.archived ? "Restore test?" : "Archive test?"}
				isOpen={confirm}
				onOpenChange={(open): void => {
					if (!task.busy) setConfirm(open);
				}}
				footer={
					<Button
						label={test.archived ? "Restore" : "Archive"}
						isLoading={task.busy}
						onPress={(): void => {
							void task.run(async () => {
								await archive({
									testId,
									revision: test.revision,
									archived: !test.archived,
								});
								setConfirm(false);
							});
						}}
					/>
				}
			>
				<Text>
					{test.archived
						? "Sessions can be edited again."
						: "Results remain available in Archived."}
				</Text>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Dialog>
		</Stack>
	);
};
