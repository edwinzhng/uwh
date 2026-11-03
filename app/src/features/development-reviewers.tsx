import { type ReactElement, useState } from "react";
import {
	type DevelopmentPolicyService,
	useDevelopmentPolicy,
	usePreviewDevelopmentPolicy,
} from "../backend/use-development-policy";
import { useApp } from "../demo/app-state";
import {
	Button,
	Checkbox,
	Dialog,
	List,
	Row,
	Select,
	Stack,
	Text,
} from "../design-system";
import {
	type DevelopmentPolicy,
	validateDevelopmentPolicy,
} from "../domain/development-policy";
import { useFormTask } from "./use-form-task";
import { useReviewFlow } from "./use-review-flow";

const ReviewerEditor = ({
	service,
	policy,
	onClose,
}: {
	service: DevelopmentPolicyService;
	policy: DevelopmentPolicy;
	onClose: () => void;
}): ReactElement => {
	const unavailable = policy.reviewerIds.filter(
		(id) => !service.coaches.some((coach) => coach.id === id),
	);
	const [draft, setDraft] = useState(() => ({
		...policy,
		reviewerIds: policy.reviewerIds.filter((id) => !unavailable.includes(id)),
	}));
	const task = useFormTask();
	return (
		<Dialog
			intent="picker"
			isDismissDisabled={task.busy}
			title="Required reviewers"
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Save reviewers"
					isLoading={task.busy}
					onPress={(): void => {
						void task.submit(
							() => validateDevelopmentPolicy(draft, service.coaches),
							async (): Promise<void> => {
								await service.save(draft);
								onClose();
							},
						);
					}}
				/>
			}
		>
			<Stack>
				{unavailable.length ? (
					<Text variant="small" tone="warning">
						{unavailable.length} unavailable reviewer
						{unavailable.length === 1 ? "" : "s"} will be removed when you save.
						Choose the current required coaches.
					</Text>
				) : undefined}
				<Select
					label="Review policy"
					value={draft.mode}
					options={[
						{
							value: "regular",
							label: "Regular coaches · exclude backup-only",
						},
						{ value: "selected", label: "Selected required coaches" },
					]}
					onValueChange={(mode): void => {
						if (mode)
							setDraft({
								...draft,
								mode,
								reviewerIds: mode === "regular" ? [] : draft.reviewerIds,
							});
					}}
					isDisabled={task.busy}
				/>
				{draft.mode === "selected" ? (
					<List>
						{service.coaches.map((coach) => (
							<Checkbox
								key={coach.id}
								label={coach.name}
								checked={draft.reviewerIds.includes(coach.id)}
								isDisabled={task.busy}
								onChange={(checked): void => {
									if (!task.busy)
										setDraft({
											...draft,
											reviewerIds: checked
												? [...draft.reviewerIds, coach.id]
												: draft.reviewerIds.filter((id) => id !== coach.id),
										});
								}}
							/>
						))}
					</List>
				) : (
					<Text variant="small" tone="secondary">
						Coaches listed only as backups are not required. A backup who also
						has a program coaching assignment remains required.
					</Text>
				)}
				<Text variant="small" tone="secondary">
					Existing rounds keep their reviewer snapshot. If this policy changes,
					start a new round before finalizing; previous submissions remain in
					history.
				</Text>
				{task.error ? <Text tone="danger">{task.error}</Text> : undefined}
			</Stack>
		</Dialog>
	);
};
const ReviewersContent = ({
	service,
}: {
	service: DevelopmentPolicyService;
}): ReactElement => {
	const { account } = useApp();
	const review = useReviewFlow();
	const [open, setOpen] = useState(review === "reviewer-policy");
	return (
		<>
			<Row justify="between" wrap>
				<Text variant="small" tone="secondary">
					{service.requiredIds.length} required reviewers
					{service.requiredIds.length
						? ` · ${service.coaches
								.filter((coach) => service.requiredIds.includes(coach.id))
								.map((coach) => coach.name)
								.join(", ")}`
						: " · Choose reviewers before starting a round"}
				</Text>
				{account.admin ? (
					<Button
						label="Reviewers"
						variant="ghost"
						isDisabled={!service.policy}
						onPress={(): void => setOpen(true)}
					/>
				) : undefined}
			</Row>
			{open && service.policy && account.admin ? (
				<ReviewerEditor
					service={service}
					policy={service.policy}
					onClose={(): void => setOpen(false)}
				/>
			) : undefined}
		</>
	);
};
const LiveReviewers = (): ReactElement => (
	<ReviewersContent service={useDevelopmentPolicy()} />
);
const PreviewReviewers = (): ReactElement => (
	<ReviewersContent service={usePreviewDevelopmentPolicy()} />
);
export const DevelopmentReviewers = (): ReactElement =>
	useApp().source === "convex" ? <LiveReviewers /> : <PreviewReviewers />;
