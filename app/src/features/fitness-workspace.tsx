import { useLocalSearchParams } from "expo-router";
import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import { FitnessData } from "../backend/fitness-data";
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
import { fitnessLowerIsBetter, fitnessUnitLabel } from "../domain/fitness";
import { FitnessProgress } from "./fitness-progress";
import { FitnessResults } from "./fitness-results";
import { FitnessSessions } from "./fitness-sessions";
import { FitnessTestForm } from "./fitness-test-form";
import { SeasonSelect } from "./season-select";
import { useSeason } from "./use-season";
import { useTask } from "./use-task";
export const FitnessWorkspace = ({
	testId,
	onBack,
}: {
	testId: string;
	onBack: () => void;
}): ReactElement => {
	const params = useLocalSearchParams<{ view?: string; session?: string }>();
	const [seasonId] = useSeason();
	const [tab, setTab] = useState(
		params.view === "progress" ? "progress" : "sessions",
	);
	const [editing, setEditing] = useState(false);
	const [confirm, setConfirm] = useState(false);
	const [sessionId, setSessionId] = useState<string | undefined>(
		params.session,
	);
	const archive = useFitnessActions().archiveTest;
	const task = useTask();
	return (
		<FitnessData request={{ type: "test", testId }}>
			{({ test }) =>
				!test ? (
					<LoadingContent />
				) : sessionId ? (
					<FitnessResults
						key={sessionId}
						test={test}
						sessionId={sessionId}
						onBack={(): void => setSessionId(undefined)}
					/>
				) : (
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
								icon="more"
								groups={[
									{
										id: "test",
										items: [
											{
												id: "edit",
												label: "Edit",
												icon: "edit",
												onSelect: (): void => setEditing(true),
											},
											{
												id: "archive",
												label: test.archived ? "Restore" : "Archive",
												icon: test.archived ? "reply" : "archive",
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
								{fitnessUnitLabel(test.unit, fitnessLowerIsBetter(test))}
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
							intent="confirmation"
							isDismissDisabled={task.busy}
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
				)
			}
		</FitnessData>
	);
};
