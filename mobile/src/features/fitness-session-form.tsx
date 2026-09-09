import { useMutation } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	Stack,
	Text,
} from "../design-system";
import { clubDate } from "../domain/event-time";
import { useFitnessTask } from "./use-fitness-task";
export const FitnessSessionForm = ({
	testId,
	seasonId,
	session,
	onClose,
	onSaved,
}: {
	testId: Id<"fitnessTests">;
	seasonId: string;
	session?: Doc<"fitnessSessions">;
	onClose: () => void;
	onSaved: (id: Id<"fitnessSessions">) => void;
}): ReactElement => {
	const { data } = useApp();
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const today = clubDate();
	const [date, setDate] = useState(
		session?.date ??
			(season && today < season.start
				? season.start
				: season && today > season.end
					? season.end
					: today),
	);
	const [notes, setNotes] = useState(session?.notes ?? "");
	const save = useMutation(api.fitness.saveSession);
	const task = useFitnessTask();
	return (
		<Dialog
			title={session ? "Edit session" : "New session"}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save"
					isLoading={task.busy}
					onPress={(): void => {
						void task.run(async () => {
							const id = await save({
								testId,
								seasonId,
								sessionId: session?._id,
								revision: session?.revision,
								date,
								notes,
							});
							onSaved(id);
							onClose();
						});
					}}
				/>
			}
		>
			<Stack>
				<DatePicker
					label="Date"
					value={date}
					min={season?.start}
					max={season?.end}
					onValueChange={(value): void => setDate(value ?? "")}
					isDisabled={task.busy}
				/>
				<Field
					label="Session notes"
					value={notes}
					onValueChange={setNotes}
					multiline
					maxLength={2000}
					isDisabled={task.busy}
				/>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
