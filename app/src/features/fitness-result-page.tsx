import { useMutation } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
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
import { type FitnessEntry, FitnessResultRow } from "./fitness-result-row";
import { useFitnessTask } from "./use-fitness-task";

type ResultRow = {
	personId: string;
	name: string;
	result: Doc<"fitnessResults"> | null;
	stats: Doc<"fitnessStats"> | null;
};
export const FitnessResultPage = ({
	test,
	session,
	rows,
	onDirty,
	onSaved,
}: {
	test: Doc<"fitnessTests">;
	session: Doc<"fitnessSessions">;
	rows: ResultRow[];
	onDirty: (value: boolean) => void;
	onSaved: () => void;
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
	const task = useFitnessTask();
	const save = useMutation(api.fitness.saveResults);
	const dirty = JSON.stringify(entries) !== JSON.stringify(initial);
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
							onPress={(): void => {
								void task.run(async () => {
									await save({ sessionId: session._id, revision, entries });
									onSaved();
								});
							}}
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
									disabled={test.archived || task.busy}
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
						onPress={(): void => {
							void task.run(async () => {
								await save({ sessionId: session._id, revision, entries });
								onSaved();
							});
						}}
					/>
				</Row>
			) : undefined}
		</Stack>
	);
};
