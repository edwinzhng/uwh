import { useMutation, useQuery } from "convex/react";
import { type ReactElement, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useChatSafety } from "../backend/chat-safety";
import { Button, Dialog, Field, Stack, Text, Toggle } from "../design-system";
import type { ContentReference } from "../domain/content-report";
import { useFormTask } from "./use-form-task";

const LiveContentReport = ({
	source,
	label,
}: {
	source: ContentReference;
	label: string;
}): ReactElement => {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [blockAuthor, setBlockAuthor] = useState(false);
	const [sent, setSent] = useState(false);
	const task = useFormTask();
	const target = useQuery(
		api.content_reports.target,
		open ? { source } : "skip",
	);
	const report = useMutation(api.content_reports.report);
	return (
		<>
			<Button
				label={sent ? "Report sent" : label}
				prefix="shield"
				variant="ghost"
				compact
				onPress={(): void => {
					task.clear();
					setSent(false);
					setOpen(true);
				}}
			/>
			<Dialog
				title={label}
				intent="form"
				isOpen={open}
				isDismissDisabled={task.busy}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Button
						label="Send report"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									target?.available === false
										? "Content changed or is unavailable. Reopen it before reporting."
										: !reason.trim()
											? "Add a reason"
											: reason.length > 1000
												? "Use 1,000 characters or fewer"
												: undefined,
								async (): Promise<void> => {
									await report({
										source,
										reason,
										blockAuthor: blockAuthor && target?.canBlock === true,
									});
									setOpen(false);
									setSent(true);
									setReason("");
									setBlockAuthor(false);
								},
							);
						}}
					/>
				}
			>
				<Stack>
					<Text variant="small">
						This shares the displayed content and your reason with club
						administrators for review.
					</Text>
					<Field
						label="Reason"
						value={reason}
						onValueChange={setReason}
						multiline
						maxLength={1000}
						isDisabled={task.busy}
					/>
					{target?.canBlock ? (
						<Toggle
							label="Also block this account"
							value={blockAuthor}
							onValueChange={setBlockAuthor}
							isDisabled={task.busy}
						/>
					) : undefined}
					{task.error ? (
						<Text variant="small" tone="danger">
							{task.error}
						</Text>
					) : undefined}
				</Stack>
			</Dialog>
		</>
	);
};

export const ContentReport = ({
	source,
	label = "Report content",
}: {
	source: ContentReference;
	label?: string;
}): ReactElement | undefined =>
	useChatSafety().available ? (
		<LiveContentReport
			key={`${source.kind}:${source.id}`}
			source={source}
			label={label}
		/>
	) : undefined;
