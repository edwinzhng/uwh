import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import { Button, Dialog, Text } from "../design-system";

export const FeedbackDelete = ({ id }: { id: string }): ReactElement => {
	const { dispatch, busy } = useApp();
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				label="Delete"
				variant="ghost"
				onPress={(): void => setOpen(true)}
			/>
			<Dialog
				staffRole="coach"
				title="Delete this note?"
				isOpen={open}
				onOpenChange={setOpen}
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
