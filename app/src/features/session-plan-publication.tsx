import { type ReactElement, useState } from "react";
import type { SessionPlanService } from "../backend/use-session-plan";
import { Button, Dialog, Stack, Text } from "../design-system";
import {
	type SessionPlan,
	sessionPlanPublicationPayload,
} from "../domain/session-plan";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";
import { useReviewFlow } from "./use-review-flow";

export const SessionPlanPublication = ({
	eventId,
	partId,
	plan,
	publish,
	disabled,
}: {
	eventId: string;
	partId?: string;
	plan: SessionPlan;
	publish: SessionPlanService["publish"];
	disabled: boolean;
}): ReactElement => {
	const [open, setOpen] = useState(useReviewFlow() === "publish-session-plan");
	const task = useFormTask();
	const operationKey = useOperationKey();
	const action = plan.published ? "Unpublish" : "Publish";
	return (
		<>
			<Button
				label={action}
				variant={plan.published ? "secondary" : "solid"}
				isDisabled={disabled}
				onPress={(): void => {
					task.clear();
					setOpen(true);
				}}
			/>
			<Dialog
				intent="confirmation"
				isDismissDisabled={task.busy}
				title={`${action} session plan`}
				isOpen={open}
				onOpenChange={(next): void => {
					if (!task.busy) setOpen(next);
				}}
				footer={
					<Button
						label={`${action} plan`}
						isLoading={task.busy}
						onPress={(): void => {
							void task.submit(
								() =>
									!plan.published &&
									!plan.body &&
									!plan.goals &&
									!plan.objective &&
									!plan.drills.length
										? "Add a plan or goals before publishing."
										: undefined,
								async (): Promise<void> => {
									const draft = {
										eventId,
										partId,
										revision: plan.revision,
										published: !plan.published,
										requestId: "",
									};
									await publish({
										...draft,
										requestId: operationKey(
											sessionPlanPublicationPayload(draft),
										),
									});
									setOpen(false);
								},
							);
						}}
					/>
				}
			>
				<Stack>
					<Text>
						{plan.published
							? "Remove this plan from the player and guardian view. Coaches will keep the saved plan and private notes."
							: "Share this version’s plan, goals and available media with eligible players and their linked guardians. Coaching notes stay private."}
					</Text>
					{!plan.published ? (
						<Text variant="small" tone="secondary">
							Saving edits unpublishes the plan until a coach publishes the new
							version.
						</Text>
					) : undefined}
					{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
				</Stack>
			</Dialog>
		</>
	);
};
