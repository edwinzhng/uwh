import { type ReactElement, useState } from "react";
import { newId, useApp } from "../demo/app-state";
import {
	Button,
	DatePicker,
	Field,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { addDays, validDate } from "../domain/app-rules";
import { defaultNoticeExpiry } from "../domain/notices";
import { useClubToday } from "./use-club-today";
import { useFormTask } from "./use-form-task";

export const NoticeComposer = ({
	onPublished,
}: {
	onPublished?: () => void;
}): ReactElement | undefined => {
	const { account, dispatch } = useApp();
	const today = useClubToday();
	const task = useFormTask();
	const [body, setBody] = useState("");
	const [expiresAt, setExpiresAt] = useState(defaultNoticeExpiry(today));
	const program = account.admin ? "all" : account.coachPrograms.at(0);
	if (!program) return undefined;
	const save = async (): Promise<void> => {
		await task.submit(
			() =>
				!body.trim()
					? "Write an announcement."
					: !validDate(expiresAt) || expiresAt <= today
						? "Choose an end date after today."
						: undefined,
			async (): Promise<void> => {
				const saved = await dispatch({
					type: "create-notice",
					notice: {
						id: newId(),
						title: "Announcement",
						body: body.trim(),
						program,
						date: today,
						expiresAt,
						acknowledgedBy: [],
					},
				});
				if (!saved)
					throw new Error("Could not publish this announcement. Try again.");
				setBody("");
				setExpiresAt(defaultNoticeExpiry(today));
				onPublished?.();
			},
		);
	};
	return (
		<Surface header={<Text variant="h4">New announcement</Text>}>
			<Stack>
				<Field
					label="Message"
					placeholder="What does the club need to know?"
					value={body}
					onValueChange={setBody}
					multiline
					rows={4}
					maxLength={500}
					isDisabled={task.busy}
				/>
				<DatePicker
					label="End date"
					value={expiresAt}
					min={addDays(today, 1)}
					isDisabled={task.busy}
					onValueChange={(value): void =>
						setExpiresAt(value ?? defaultNoticeExpiry(today))
					}
				/>
				<Text variant="caption" tone="secondary">
					Announcements stay live for two weeks by default.
				</Text>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				<Row>
					<Button
						label="Publish announcement"
						staffRole={account.admin ? "admin" : "coach"}
						isLoading={task.busy}
						onPress={(): void => {
							void save();
						}}
					/>
				</Row>
			</Stack>
		</Surface>
	);
};
