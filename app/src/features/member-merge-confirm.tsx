import { useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import type { MemberMergeService } from "../backend/use-member-merge";
import { Button, Field, Row, Stack, Text } from "../design-system";
import type { MemberMergePreview } from "../domain/member-merge";
import { MemberMergeSummary } from "./member-merge-summary";
import { useFormTask } from "./use-form-task";
import { useOperationKey } from "./use-operation-key";

export const MemberMergeConfirm = ({
	preview,
	service,
	fillEmptyProfile,
	onClose,
	onBusyChange,
}: {
	preview: MemberMergePreview;
	service: MemberMergeService;
	fillEmptyProfile: boolean;
	onClose: () => void;
	onBusyChange: (busy: boolean) => void;
}): ReactElement => {
	const [reviewed, setReviewed] = useState(preview);
	const [confirmation, setConfirmation] = useState("");
	const task = useFormTask();
	const key = useOperationKey();
	const router = useRouter();
	const stale = preview.token !== reviewed.token;
	const submit = (): void => {
		void task.submit(
			() =>
				confirmation.trim() === reviewed.target.name
					? undefined
					: "Type the active member’s full name to confirm.",
			async (): Promise<void> => {
				onBusyChange(true);
				try {
					const command = {
						sourceId: reviewed.source.id,
						targetId: reviewed.target.id,
						token: reviewed.token,
						fillEmptyProfile,
						confirmation,
						key: key(`${reviewed.token}:${confirmation}`),
					};
					const targetId = await service.merge(command);
					onClose();
					router.replace({
						pathname: "/member",
						params: { id: targetId, tab: "admin" },
					});
				} finally {
					onBusyChange(false);
				}
			},
		);
	};
	return (
		<Stack>
			<MemberMergeSummary preview={reviewed} />
			{stale ? (
				<Stack>
					<Text variant="small" tone="warning">
						A record changed after this preview. Review the latest changes
						before merging.
					</Text>
					<Button
						label="Review latest changes"
						variant="secondary"
						isDisabled={task.busy}
						onPress={(): void => {
							setReviewed(preview);
							task.clear();
						}}
					/>
				</Stack>
			) : undefined}
			{!reviewed.conflicts.length ? (
				<Field
					label={`Type ${reviewed.target.name} to confirm`}
					value={confirmation}
					onValueChange={setConfirmation}
					isDisabled={task.busy}
					onSubmit={stale ? undefined : submit}
				/>
			) : undefined}
			{task.error ? (
				<Text variant="small" tone="danger">
					{task.error}
				</Text>
			) : undefined}
			<Row justify="end" wrap>
				<Button
					label="Cancel"
					variant="ghost"
					isDisabled={task.busy}
					onPress={onClose}
				/>
				<Button
					label="Merge profiles"
					isLoading={task.busy}
					isDisabled={stale || reviewed.conflicts.length > 0}
					onPress={submit}
				/>
			</Row>
		</Stack>
	);
};
