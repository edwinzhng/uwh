import { type ReactElement, useState } from "react";
import { useThreadTools } from "../backend/thread-tools-context";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Dialog,
	Field,
	Grid,
	Row,
	Stack,
	Text,
	TimeSelector,
	Toggle,
} from "../design-system";
import { normalizePollDraft, validatePoll } from "../domain/chat-polls";
import { clubTimestamp } from "../domain/event-time";
import { defaultClubTimeZone } from "../domain/time-zones";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

const initialAnswers = (): { id: string; value: string }[] => [
	{ id: newId(), value: "" },
	{ id: newId(), value: "" },
];

export const ChatPollComposer = ({
	open,
	onOpenChange: setOpen,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}): ReactElement => {
	const tools = useThreadTools();
	const { data } = useApp();
	const task = useFormTask();
	const [question, setQuestion] = useState("");
	const [compositionId, setCompositionId] = useState(newId);
	const [options, setOptions] = useState(initialAnswers);
	const [multiple, setMultiple] = useState(false);
	const [date, setDate] = useState<string>();
	const [time, setTime] = useState<string>("23:59");
	const operationKey = useOperationKey();
	const draft = (): {
		question: string;
		options: string[];
		multiple: boolean;
		closesAt?: number;
	} => ({
		question,
		options: options.map((option) => option.value),
		multiple,
		closesAt: date
			? clubTimestamp(date, time ?? "23:59", data.timeZone)
			: undefined,
	});
	return (
		<Dialog
			intent="form"
			isDismissDisabled={task.busy}
			title="Create poll"
			isOpen={open}
			onOpenChange={(value): void => {
				if (!task.busy) {
					setOpen(value);
					task.clear();
				}
			}}
			footer={
				<Button
					label="Post poll"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() => {
								try {
									return validatePoll(draft());
								} catch {
									return "Choose a closing date and time";
								}
							},
							async (): Promise<void> => {
								const value = normalizePollDraft(draft());
								if (!tools) throw new Error("Reopen the conversation");
								await tools.create(
									operationKey(`${compositionId}:${JSON.stringify(value)}`),
									value,
								);
								setOpen(false);
								setCompositionId(newId());
								setQuestion("");
								setOptions(initialAnswers());
								setDate(undefined);
								setMultiple(false);
							},
						);
					}}
				/>
			}
		>
			<Stack>
				<Field
					label="Question"
					value={question}
					onValueChange={setQuestion}
					maxLength={300}
					isDisabled={task.busy}
				/>
				{options.map((option, index) => (
					<Row key={option.id} align="end">
						<Stack grow>
							<Field
								label={`Answer ${index + 1}`}
								value={option.value}
								onValueChange={(value): void =>
									setOptions((current) =>
										current.map((answer) =>
											answer.id === option.id ? { ...answer, value } : answer,
										),
									)
								}
								maxLength={120}
								isDisabled={task.busy}
							/>
						</Stack>
						{options.length > 2 ? (
							<Button
								label={`Remove answer ${index + 1}`}
								icon="close"
								variant="ghost"
								isDisabled={task.busy}
								onPress={(): void =>
									setOptions((current) =>
										current.filter((answer) => answer.id !== option.id),
									)
								}
							/>
						) : undefined}
					</Row>
				))}
				{options.length < 6 ? (
					<Button
						label="Add answer"
						variant="ghost"
						isDisabled={task.busy}
						onPress={(): void =>
							setOptions((current) => [...current, { id: newId(), value: "" }])
						}
					/>
				) : undefined}
				<Toggle
					label="Allow multiple answers"
					value={multiple}
					onValueChange={setMultiple}
					isDisabled={task.busy}
				/>
				<Grid>
					<DatePicker
						label="Closing date (optional)"
						value={date}
						onValueChange={setDate}
						isDisabled={task.busy}
					/>
					<TimeSelector
						label={`Closing time · ${data.timeZone ?? defaultClubTimeZone}`}
						value={time}
						onValueChange={(value): void => setTime(value ?? "23:59")}
						isDisabled={task.busy || !date}
					/>
				</Grid>
				<Text variant="caption" tone="secondary">
					Results appear after voting or when the poll closes. Votes can be
					changed until closing.
				</Text>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
