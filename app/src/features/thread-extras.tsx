import { type ReactElement, useState } from "react";
import { useThreadTools } from "../backend/thread-tools-context";
import { useApp } from "../demo/app-state";
import {
	Button,
	Dialog,
	FormattedText,
	formattedTextPreview,
	PinnedMessageStrip,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { messageTimeLabel } from "../domain/message-presentation";
import { messagePreview } from "../domain/messaging";
import { ChatPollCard } from "./chat-poll-card";
import { useFormTask } from "./use-form-task";
import { useReviewFlow } from "./use-review-flow";

export const ThreadExtras = (): ReactElement | undefined => {
	const tools = useThreadTools();
	const { data } = useApp();
	const reviewFlow = useReviewFlow();
	const [showPins, setShowPins] = useState(reviewFlow === "pins");
	const [showPolls, setShowPolls] = useState(reviewFlow === "poll-vote");
	const task = useFormTask();
	if (!tools) return undefined;
	const latestPin = tools.pins.at(-1);
	const archivedPolls = tools.polls.filter((poll) => !poll.messageId);
	return (
		<>
			<Stack gap="none">
				{latestPin ? (
					<PinnedMessageStrip
						preview={formattedTextPreview(messagePreview(latestPin))}
						count={tools.pins.length}
						isDisabled={task.busy || tools.loading}
						onPress={(): void => {
							task.clear();
							setShowPins(true);
						}}
					/>
				) : undefined}
				{archivedPolls.length ? (
					<Row justify="end">
						<Button
							label={`Older polls (${archivedPolls.length})`}
							prefix="barChart"
							variant="ghost"
							isDisabled={task.busy || tools.loading}
							onPress={(): void => setShowPolls(true)}
						/>
					</Row>
				) : undefined}
			</Stack>
			<Dialog
				intent="detail"
				isDismissDisabled={task.busy}
				title="Pinned messages"
				footer={false}
				isOpen={showPins}
				onOpenChange={(open): void => {
					if (!task.busy) setShowPins(open);
				}}
			>
				<Stack>
					{tools.pins.map((message) => (
						<Surface key={message.id} padding="sm">
							<Stack gap="xs">
								<Row justify="between" wrap>
									<Text variant="caption" tone="secondary">
										{message.author}
										{message.time
											? ` · ${messageTimeLabel(message, data.timeZone)}`
											: ""}
									</Text>
									{tools.canPin ? (
										<Button
											label="Unpin"
											variant="ghost"
											compact
											isDisabled={task.busy}
											onPress={(): void => {
												void task.run(() => tools.pin(message.id, false));
											}}
										/>
									) : undefined}
								</Row>
								<FormattedText>{message.body || "Photo"}</FormattedText>
							</Stack>
						</Surface>
					))}
					{!tools.pins.length ? (
						<Text tone="secondary">No pinned messages.</Text>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
			<Dialog
				intent="detail"
				title="Older polls"
				isOpen={showPolls && archivedPolls.length > 0}
				onOpenChange={setShowPolls}
			>
				<Stack>
					{!tools.polls.length ? (
						<Text tone="secondary">No polls yet.</Text>
					) : undefined}
					{archivedPolls.map((poll) => (
						<Surface key={poll.id}>
							<ChatPollCard poll={poll} />
						</Surface>
					))}
				</Stack>
			</Dialog>
		</>
	);
};
