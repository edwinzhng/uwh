import { type ReactElement, useState } from "react";
import { useThreadTools } from "../backend/thread-tools-context";
import { useApp } from "../demo/app-state";
import {
	ActionMenu,
	Button,
	Checkbox,
	List,
	Progress,
	Row,
	Stack,
	Text,
} from "../design-system";
import { type ChatPoll, validateVote } from "../domain/chat-polls";
import { displayDateTime } from "../domain/date-display";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useFormTask } from "./use-form-task";

export const ChatPollCard = ({
	poll,
	inline = false,
}: {
	poll: ChatPoll;
	inline?: boolean;
}): ReactElement => {
	const tools = useThreadTools();
	const [closing, setClosing] = useState(false);
	const { data } = useApp();
	const [draftChoices, setChoices] = useState<number[]>();
	const choices = poll.closed ? poll.selected : (draftChoices ?? poll.selected);
	const task = useFormTask();
	const unavailable = !tools || tools.loading || tools.readOnly;
	const validationError = validateVote(
		{ ...poll, closedAt: poll.closed ? Date.now() : undefined },
		choices,
	);
	return (
		<Stack gap="xs">
			<Stack gap="xxs">
				<Row justify="between" align="start">
					<Stack grow gap="none">
						<Text variant="h4">{poll.question}</Text>
					</Stack>
					{poll.canClose ? (
						<ActionMenu
							label="Poll options"
							icon="more"
							isDisabled={task.busy || unavailable}
							groups={[
								{
									id: "poll",
									items: [
										{
											id: "close",
											label: "Close poll",
											tone: "danger",
											onSelect: (): void => setClosing(true),
										},
									],
								},
							]}
						/>
					) : undefined}
				</Row>
				<Text variant="caption" tone="secondary">
					{inline ? "" : `${poll.author} · `}
					{poll.closed
						? "Closed"
						: poll.multiple
							? "Choose one or more"
							: "Choose one"}
					{poll.closesAt
						? ` · ${displayDateTime(poll.closesAt, data.timeZone)}`
						: ""}
				</Text>
			</Stack>
			<List gap="none">
				{poll.options.map((option, index) => (
					<Stack key={option} gap="xxs">
						<Row gap="xs">
							<Stack grow gap="none">
								{poll.closed ? (
									<Text variant="small">
										{poll.selected.includes(index) ? "✓ " : ""}
										{option}
									</Text>
								) : (
									<Checkbox
										compact
										label={option}
										checked={choices.includes(index)}
										isDisabled={task.busy || unavailable}
										onChange={(checked): void =>
											setChoices((draft) => {
												const current = draft ?? poll.selected;
												return checked
													? poll.multiple
														? [...current, index]
														: [index]
													: current.filter((choice) => choice !== index);
											})
										}
									/>
								)}
							</Stack>
							{poll.counts ? (
								<Text variant="caption" tone="secondary">
									{poll.counts.at(index) ?? 0}
								</Text>
							) : undefined}
						</Row>
						{poll.counts ? (
							<Progress
								label={`${option}: ${poll.counts.at(index) ?? 0} ${poll.counts.at(index) === 1 ? "vote" : "votes"}`}
								value={poll.counts.at(index) ?? 0}
								max={poll.voters ?? 0}
							/>
						) : undefined}
					</Stack>
				))}
			</List>
			<Stack gap="xs">
				<Row justify="between" gap="sm" wrap>
					{poll.voters === undefined ? (
						<Text variant="caption" tone="secondary">
							Vote to see results.
						</Text>
					) : (
						<Text variant="caption" tone="secondary">
							{poll.voters} voted
						</Text>
					)}
					{!poll.closed ? (
						<Button
							label={poll.selected.length ? "Update vote" : "Vote"}
							isDisabled={unavailable}
							validationError={validationError}
							isLoading={task.busy}
							onPress={(): void => {
								void task.submit(
									() => validationError,
									async (): Promise<void> => {
										if (!tools) throw new Error("Poll unavailable");
										await tools.vote(poll.id, choices);
										setChoices(undefined);
									},
								);
							}}
						/>
					) : undefined}
				</Row>
			</Stack>
			{closing ? (
				<ConfirmationDialog
					title="Close poll?"
					description="Voting will end. This cannot be undone."
					confirmLabel="Close poll"
					danger
					onClose={(): void => setClosing(false)}
					onConfirm={async (): Promise<void> => {
						if (!tools) throw new Error("Poll unavailable");
						await tools.close(poll.id);
					}}
				/>
			) : undefined}
			{!tools ? (
				<Text variant="small" tone="danger">
					Poll unavailable
				</Text>
			) : tools.readOnly ? (
				<Text variant="small" tone="secondary">
					Voting unavailable
				</Text>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
