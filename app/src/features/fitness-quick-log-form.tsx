import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import { FitnessData, type FitnessSnapshot } from "../backend/fitness-data";
import type { FitnessLogContext } from "../backend/fitness-log-data";
import { FitnessQuickRosterData } from "../backend/fitness-quick-roster-data";
import {
	Avatar,
	Button,
	Dialog,
	EmptyState,
	InfiniteScroll,
	LoadingContent,
	Progress,
	Row,
	Select,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canRegister } from "../domain/event-eligibility";
import { practiceEvent } from "../domain/event-types";
import { fitnessEntriesError } from "../domain/fitness-model";
import { FitnessResultRow } from "./fitness-result-row";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

type Props = {
	eventId?: string;
	onClose: () => void;
	context: FitnessLogContext;
};

const QuickLog = ({
	eventId,
	onClose,
	context,
	tests,
}: Props & { tests: FitnessSnapshot["tests"] }): ReactElement => {
	const today = useClubToday();
	const practices = context.practices
		.filter((event) => practiceEvent(event) && !event.cancelled)
		.sort((a, b) => b.date.localeCompare(a.date));
	const [practiceId, setPracticeId] = useState(
		eventId ??
			practices.find((event) => event.date <= today)?.id ??
			practices.at(-1)?.id ??
			"",
	);
	const [testId, setTestId] = useState("");
	const [skipped, setSkipped] = useState<string[]>([]);
	const [saved, setSaved] = useState<string[]>([]);
	const [draft, setDraft] = useState<{
		personId: string;
		value: string;
		notes: string;
	}>();
	const task = useFormTask();
	const operationKey = useOperationKey();
	const actions = useFitnessActions();
	const event = practices.find((practice) => practice.id === practiceId);
	const test =
		tests.results.find((entry) => entry._id === testId) ?? tests.results.at(0);
	return (
		<FitnessQuickRosterData event={event} testId={test?._id}>
			{(roster) => {
				const present = new Set(roster?.presentIds);
				const recorded = new Set([...(roster?.recordedIds ?? []), ...saved]);
				const people = context.members
					.filter(
						(person) =>
							event && present.has(person.id) && canRegister(person, event),
					)
					.sort(
						(a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
					);
				const remaining = people.filter(
					(person) => !recorded.has(person.id) && !skipped.includes(person.id),
				);
				const selected = remaining.at(0);
				const completed = people.filter((person) =>
					recorded.has(person.id),
				).length;
				const entry =
					selected && draft?.personId === selected.id
						? draft
						: { personId: selected?.id ?? "", value: "", notes: "" };

				const reset = (): void => {
					setSkipped([]);
					setSaved([]);
					setDraft(undefined);
					task.clear();
				};

				return (
					<Dialog
						intent="form"
						title="Log swim results"
						isOpen
						isDismissDisabled={task.busy}
						onOpenChange={(open): void => {
							if (!open && !task.busy) onClose();
						}}
						footer={
							selected ? (
								<Row justify="between" wrap>
									<Button
										label="Skip"
										variant="ghost"
										isDisabled={task.busy}
										onPress={(): void => {
											setSkipped((ids) => [...ids, selected.id]);
											setDraft(undefined);
											task.clear();
										}}
									/>
									<Button
										label={remaining.length > 1 ? "Save & next" : "Save result"}
										isLoading={task.busy}
										onPress={(): void => {
											if (!test || !event) return;
											void task.submit(
												() =>
													!entry.value.trim()
														? "Add a result."
														: fitnessEntriesError(test.unit, [entry]),
												async (): Promise<void> => {
													const payload = {
														...entry,
														testId: test._id,
														eventId: event.id,
													};
													await actions.logResult({
														...payload,
														operationKey: operationKey(JSON.stringify(payload)),
													});
													setSaved((ids) => [...ids, selected.id]);
													setDraft(undefined);
												},
											);
										}}
									/>
								</Row>
							) : (
								<Button label="Done" isDisabled={task.busy} onPress={onClose} />
							)
						}
					>
						<Stack>
							<Select
								label="Practice"
								value={practiceId}
								isDisabled={task.busy || Boolean(eventId)}
								options={practices.map((practice) => ({
									value: practice.id,
									label: `${practice.date} · ${practice.title}`,
								}))}
								onValueChange={(id): void => {
									setPracticeId(id ?? "");
									reset();
								}}
							/>
							<Select
								label="Swim test"
								value={test?._id ?? ""}
								isDisabled={task.busy}
								options={tests.results.map((entry) => ({
									value: entry._id,
									label: entry.name,
								}))}
								listFooter={
									<InfiniteScroll
										loadMore={
											tests.status === "CanLoadMore"
												? (): void => tests.loadMore(30)
												: undefined
										}
										loading={tests.status === "LoadingMore"}
										revision={tests.results.length}
										disabled={task.busy}
									/>
								}
								onValueChange={(id): void => {
									setTestId(id ?? "");
									reset();
								}}
							/>
							{context.limited ? (
								<Text tone="secondary">
									Quick logging checks the first 500 players.
								</Text>
							) : undefined}
							{tests.status === "LoadingFirstPage" ||
							(event && test && !roster) ? (
								<LoadingContent />
							) : !event || !test ? (
								<EmptyState title="Choose a practice and swim test" />
							) : !people.length ? (
								<EmptyState
									title="No players marked Here"
									description="Mark attendance for this practice to build the logging queue."
								/>
							) : (
								<>
									<Stack gap="xs">
										<Text variant="caption" tone="secondary">
											{completed} of {people.length} results recorded
										</Text>
										<Progress
											label="Swim results recorded"
											value={completed}
											max={people.length}
										/>
									</Stack>
									{selected ? (
										<Surface key={selected.id}>
											<Stack gap="md">
												<Row justify="center">
													<Avatar
														large
														name={selected.name}
														personId={selected.id}
													/>
												</Row>
												<Text variant="h4" align="center">
													{selected.name}
												</Text>
												<FitnessResultRow
													compact
													name={selected.name}
													unit={test.unit}
													entry={entry}
													disabled={task.busy}
													onChange={(next): void => {
														setDraft(next);
														task.clear();
													}}
												/>
											</Stack>
										</Surface>
									) : (
										<EmptyState
											title={
												completed === people.length
													? "Results complete"
													: "Reached the end of the roster"
											}
										/>
									)}
									{skipped.length && !selected && completed < people.length ? (
										<Button
											label="Return to skipped players"
											variant="secondary"
											onPress={(): void => setSkipped([])}
										/>
									) : undefined}
								</>
							)}
							{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
						</Stack>
					</Dialog>
				);
			}}
		</FitnessQuickRosterData>
	);
};

export const FitnessQuickLogForm = ({
	eventId,
	onClose,
	context,
}: Props): ReactElement => (
	<FitnessData request={{ type: "tests", archived: false }}>
		{({ tests }) => (
			<QuickLog
				eventId={eventId}
				onClose={onClose}
				context={context}
				tests={tests}
			/>
		)}
	</FitnessData>
);
