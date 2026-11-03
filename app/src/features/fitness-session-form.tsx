import { type ReactElement, useState } from "react";
import { useFitnessActions } from "../backend/fitness-actions";
import { useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	Stack,
	Text,
} from "../design-system";
import { validDate } from "../domain/app-rules";
import { clubDate } from "../domain/event-time";
import type { FitnessSession } from "../domain/fitness-model";
import { useFormTask } from "./use-form-task";
export const FitnessSessionForm = ({
	testId,
	seasonId,
	session,
	onClose,
	onSaved,
}: {
	testId: string;
	seasonId: string;
	session?: FitnessSession;
	onClose: () => void;
	onSaved: (id: string) => void;
}): ReactElement => {
	const { data } = useApp();
	const season = data.seasons.find((entry) => entry.id === seasonId);
	const today = clubDate(undefined, data.timeZone);
	const [date, setDate] = useState(
		session?.date ??
			(season && today < season.start
				? season.start
				: season && today > season.end
					? season.end
					: today),
	);
	const [notes, setNotes] = useState(session?.notes ?? "");
	const save = useFitnessActions().saveSession;
	const task = useFormTask();
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
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
						void task.submit(
							() =>
								!validDate(date) ||
								!season ||
								date < season.start ||
								date > season.end
									? "Choose a date within the season."
									: notes.length > 2000
										? "Keep notes to 2,000 characters"
										: undefined,
							async () => {
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
							},
						);
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
					isDisabled={task.busy || Boolean(session?.eventId)}
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
