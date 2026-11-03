import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import { Button, Dialog, Text } from "../design-system";

export const FeedbackDelete = ({ id }: { id: string }): ReactElement => {
	const { dispatch } = useApp();
	const { busy } = useAppStatus();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label="Delete"
				variant="ghost"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				intent="confirmation"
				isDismissDisabled={busy}
				title="Delete this note?"
				isOpen={open}
				onOpenChange={(value): void => {
					if (!busy) setOpen(value);
				}}
				footer={
					<Button
						label="Delete"
						variant="danger"
						isLoading={busy}
						onPress={(): void => {
							void dispatch({ type: "delete-feedback", id }).then((saved) => {
								if (saved) setOpen(false);
							});
						}}
					/>
				}
			>
				<Text variant="small">This can’t be undone.</Text>
			</Dialog>
		</>
	);
};
