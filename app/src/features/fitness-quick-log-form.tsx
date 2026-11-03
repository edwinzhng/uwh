import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import { FitnessData } from "../backend/fitness-data";
import type { FitnessLogContext } from "../backend/fitness-log-data";
import {
	Button,
	Dialog,
	InfiniteScroll,
	Select,
	Stack,
	Text,
} from "../design-system";
import { canRegister } from "../domain/event-eligibility";
import { practiceEvent } from "../domain/event-types";
import { fitnessEntriesError } from "../domain/fitness-model";
import {
	fitnessQuickLogSaveLabel,
	nextFitnessLogPerson,
} from "../domain/fitness-quick-log";
import { FitnessResultRow } from "./fitness-result-row";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const FitnessQuickLogForm = ({
	eventId,
	onClose,
	context,
}: {
	eventId?: string;
	onClose: () => void;
	context: FitnessLogContext;
}): ReactElement => {
	const today = useClubToday();
	const practices = context.practices
		.filter((entry) => practiceEvent(entry) && !entry.cancelled)
		.slice()
		.sort((a, b) => b.date.localeCompare(a.date));
	const [practiceId, setPracticeId] = useState(
		eventId ??
			practices.find((entry) => entry.date <= today)?.id ??
			practices.at(-1)?.id ??
			"",
	);
	const [testId, setTestId] = useState("");
	const [personId, setPersonId] = useState("");
	const [value, setValue] = useState("");
	const [notes, setNotes] = useState("");
	const [saved, setSaved] = useState<string>();
	const [completed, setCompleted] = useState(false);
	const event = practices.find((entry) => entry.id === practiceId);
	const people = context.members
		.filter((person) => event && canRegister(person, event))
		.slice()
		.sort((a, b) => a.name.localeCompare(b.name));
	const selected =
		people.find((entry) => entry.id === personId) ?? people.at(0);
	const nextPersonId = selected
		? nextFitnessLogPerson(people, selected.id)
		: undefined;
	const task = useFormTask();
	const operationKey = useOperationKey();
	const actions = useFitnessActions();
	return (
		<FitnessData request={{ type: "tests", archived: false }}>
			{({ tests }) => {
				const test =
					tests.results.find((entry) => entry._id === testId) ??
					tests.results.at(0);
				return (
					<Dialog
						intent="form"
						isDismissDisabled={task.busy}
						title={completed ? "Result saved" : "Log swim results"}
						focusKey={completed ? "complete" : "entry"}
						isOpen
						onOpenChange={(open): void => {
							if (!open && !task.busy) onClose();
						}}
						footer={
							completed ? (
								<Button label="Close" onPress={onClose} />
							) : (
								<Button
									label={fitnessQuickLogSaveLabel(nextPersonId)}
									isLoading={task.busy}
									isDisabled={!test || !selected}
									onPress={(): void => {
										void task.submit(
											() =>
												!test || !selected || !event
													? "Choose a practice, test and player."
													: !value.trim()
														? "Add a result."
														: fitnessEntriesError(test.unit, [
																{ personId: selected.id, value, notes },
															]),
											async (): Promise<void> => {
												if (!test || !selected || !event) return;
												const payload = {
													testId: test._id,
													eventId: event.id,
													personId: selected.id,
													value,
													notes,
												};
												await actions.logResult({
													...payload,
													operationKey: operationKey(JSON.stringify(payload)),
												});
												setSaved(`Saved for ${selected.name}`);
												if (nextPersonId) setPersonId(nextPersonId);
												else setCompleted(true);
												setValue("");
												setNotes("");
											},
										);
									}}
								/>
							)
						}
					>
						<Stack>
							{completed ? (
								<>
									<Text tone="success">{saved}</Text>
									<Button
										label="Log another result"
										variant="secondary"
										onPress={(): void => {
											setCompleted(false);
											setSaved(undefined);
											task.clear();
										}}
									/>
								</>
							) : (
								<>
									{context.limited ? (
										<Text tone="secondary">
											Quick logging shows the first 500 players. Use the test
											roster to find additional players.
										</Text>
									) : undefined}
									<Select
										label="Practice"
										value={practiceId}
										isDisabled={task.busy || Boolean(eventId)}
										options={practices.map((entry) => ({
											value: entry.id,
											label: `${entry.date} · ${entry.title}`,
										}))}
										onValueChange={(id): void => {
											setPracticeId(id ?? "");
											setPersonId("");
											setSaved(undefined);
											task.clear();
										}}
									/>
									<Select
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
										label="Swim test"
										value={test?._id ?? ""}
										isDisabled={task.busy}
										options={tests.results.map((entry) => ({
											value: entry._id,
											label: entry.name,
										}))}
										onValueChange={(id): void => {
											setTestId(id ?? "");
											setValue("");
											setNotes("");
											setSaved(undefined);
											task.clear();
										}}
									/>

									<Select
										label="Player"
										value={selected?.id ?? ""}
										isDisabled={task.busy}
										options={people.map((entry) => ({
											value: entry.id,
											label: entry.name,
											person: { id: entry.id, name: entry.name },
										}))}
										onValueChange={(id): void => {
											setPersonId(id ?? "");
											setValue("");
											setNotes("");
											setSaved(undefined);
											task.clear();
										}}
									/>
									{selected && test ? (
										<FitnessResultRow
											compact
											name={selected.name}
											unit={test.unit}
											entry={{ personId: selected.id, value, notes }}
											disabled={task.busy}
											onChange={(entry): void => {
												setValue(entry.value);
												setNotes(entry.notes);
											}}
										/>
									) : (
										<Text>
											Add an active swim test and an eligible practice roster
											first.
										</Text>
									)}
									{saved ? <Text tone="success">{saved}</Text> : undefined}
									{task.error ? (
										<Text tone="danger">{task.error}</Text>
									) : undefined}
								</>
							)}
						</Stack>
					</Dialog>
				);
			}}
		</FitnessData>
	);
};
