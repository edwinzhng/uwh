import type { ReactElement } from "react";
import { Button, Dialog, Row, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

export type ConfirmationProps = {
	title: string;
	description: string;
	confirmLabel: string;
	danger?: boolean;
	isDisabled?: boolean;
	onConfirm: (() => Promise<boolean>) | (() => Promise<void>);
};

export const ConfirmationDialog = ({
	title,
	description,
	confirmLabel,
	danger,
	isDisabled,
	onConfirm,
	onClose,
}: ConfirmationProps & { onClose: () => void }): ReactElement => {
	const task = useTask();
	const confirm = async (): Promise<void> => {
		if (isDisabled) return;
		await task.run(async (): Promise<void> => {
			if ((await onConfirm()) === false)
				throw new Error("Couldn’t complete this action. Try again.");
			onClose();
		});
	};
	return (
		<Dialog
			title={title}
			isOpen
			onOpenChange={(open): void => {
				if (!open && !task.busy) onClose();
			}}
			footer={
				<Row gap="xs">
					<Button
						label="Cancel"
						variant="secondary"
						isDisabled={task.busy}
						onPress={onClose}
					/>
					<Button
						label={confirmLabel}
						variant={danger ? "danger" : "solid"}
						isLoading={task.busy}
						isDisabled={isDisabled}
						onPress={(): void => {
							void confirm();
						}}
					/>
				</Row>
			}
		>
			<Stack gap="sm">
				<Text variant="small">{description}</Text>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
