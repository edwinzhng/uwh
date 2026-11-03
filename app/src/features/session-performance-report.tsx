import { type ReactElement, useState } from "react";
import type { SessionPerformanceService } from "../backend/use-session-performance";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import type { SessionPerformanceEntry } from "../domain/session-performance";
import { useFormTask } from "./use-form-task";
import { useReviewFlow } from "./use-review-flow";

export const SessionPerformanceReport = ({
	entry,
	report,
}: {
	entry: SessionPerformanceEntry;
	report: SessionPerformanceService["report"];
}): ReactElement => {
	const [open, setOpen] = useState(useReviewFlow() === "report-session-note");
	const [reason, setReason] = useState("");
	const task = useFormTask();
	return (
		<>
			<Button
				label="Report feedback"
				prefix="shield"
				variant="secondary"
				onPress={(): void => {
					task.clear();
					setOpen(true);
				}}
			/>
			<Dialog
				title="Report session feedback"
				isOpen={open}
				onOpenChange={(next): void => {
					if (!task.busy) setOpen(next);
				}}
				footer={
					<Button
						label="Send report"
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									!reason.trim()
										? "Add a reason"
										: reason.length > 1000
											? "Keep the reason to 1,000 characters"
											: undefined,
								async (): Promise<void> => {
									await report(entry.id, entry.revision, reason);
									setOpen(false);
									setReason("");
								},
							);
						}}
					/>
				}
			>
				<Stack>
					<Text>
						This sends a private snapshot of {entry.authorName}’s feedback and
						your reason to club administrators for review.
					</Text>
					<Field
						label="Reason"
						value={reason}
						onValueChange={setReason}
						multiline
						maxLength={1000}
						isDisabled={task.busy}
					/>
					{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
