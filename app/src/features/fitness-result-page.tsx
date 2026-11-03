import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import {
	Button,
	Divider,
	EmptyState,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { formatFitnessValue } from "../domain/fitness";
import type {
	FitnessRosterRow,
	FitnessSession,
	FitnessTest,
} from "../domain/fitness-model";
import { fitnessEntriesError } from "../domain/fitness-model";
import { type FitnessEntry, FitnessResultRow } from "./fitness-result-row";
import { useFormTask } from "./use-form-task";

export const FitnessResultPage = ({
	test,
	session,
	rows,
	onDirty,
	onSaved,
	disabled = false,
}: {
	test: FitnessTest;
	session: FitnessSession;
	rows: FitnessRosterRow[];
	onDirty: (value: boolean) => void;
	onSaved: () => void;
	disabled?: boolean;
}): ReactElement => {
	const [revision] = useState(session.revision);
	const [initial] = useState<FitnessEntry[]>(() =>
		rows.map((row) => ({
			personId: row.personId,
			value: row.result
				? test.unit === "pass_fail"
					? row.result.value === 1
						? "pass"
						: "fail"
					: formatFitnessValue(test.unit, row.result.value)
				: "",
			notes: row.result?.notes ?? "",
		})),
	);
	const [entries, setEntries] = useState(initial);
	const task = useFormTask();
	const save = useFitnessActions().saveResults;
	const dirty = JSON.stringify(entries) !== JSON.stringify(initial);
	const submit = (): void => {
		void task.submit(
			() => fitnessEntriesError(test.unit, entries),
			async (): Promise<void> => {
				await save({ sessionId: session._id, revision, entries });
				onSaved();
			},
		);
	};
	return (
		<Stack>
			<Row justify="between" wrap>
				<Text variant="small" tone="secondary">
					{dirty ? "Unsaved results" : `${session.resultCount} results`}
				</Text>
				{!test.archived ? (
					<Row>
						<Button
							label="Discard changes"
							variant="ghost"
							isDisabled={!dirty || task.busy}
							onPress={(): void => {
								onSaved();
							}}
						/>
						<Button
							label="Save results"
							isDisabled={!dirty || session.revision !== revision}
							isLoading={task.busy}
							onPress={submit}
						/>
					</Row>
				) : undefined}
			</Row>
			{dirty && session.revision !== revision ? (
				<Text tone="warning">
					This session changed. Discard your changes to load the latest results.
				</Text>
			) : undefined}
			{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			<Surface>
				<Stack>
					{rows.map((row) => {
						const entry = entries.find(
							(entry) => entry.personId === row.personId,
						);
						return entry ? (
							<Stack key={row.personId}>
								<FitnessResultRow
									name={row.name}
									unit={test.unit}
									stats={row.stats ?? undefined}
									entry={entry}
									disabled={disabled || test.archived || task.busy}
									onChange={(changed): void => {
										const next = entries.map((value) =>
											value.personId === changed.personId ? changed : value,
										);
										setEntries(next);
										onDirty(JSON.stringify(next) !== JSON.stringify(initial));
									}}
								/>
								<Divider />
							</Stack>
						) : undefined;
					})}
					{!rows.length ? (
						<EmptyState
							title="No players found"
							description="Choose a different group to record results."
						/>
					) : undefined}
				</Stack>
			</Surface>
			{dirty ? (
				<Row justify="end">
					<Button
						label="Save results"
						isDisabled={session.revision !== revision}
						isLoading={task.busy}
						onPress={submit}
					/>
				</Row>
			) : undefined}
		</Stack>
	);
};
