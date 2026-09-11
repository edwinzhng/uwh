import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

export const AccountNameAction = ({
	onSaved,
}: {
	onSaved: (status: string) => void;
}): ReactElement => {
	const backend = useBackend();
	const task = useTask("savedName");
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const changeOpen = (value: boolean): void => {
		if (task.busy) return;
		setName(backend.accountInfo?.name ?? "");
		task.clear();
		setOpen(value);
	};
	return (
		<>
			<Button
				label="Edit name"
				variant="secondary"
				onPress={(): void => changeOpen(true)}
			/>
			<Dialog
				title="Edit name"
				isOpen={open}
				onOpenChange={changeOpen}
				footer={
					<Button
						label="Save"
						isLoading={task.busy}
						validationError={
							!name.trim() ? "Check the required fields" : undefined
						}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								if (!backend.updateName)
									throw new Error("Connect to your account first.");
								await backend.updateName(name);
								setOpen(false);
								onSaved("Name updated.");
							});
						}}
					/>
				}
			>
				<Stack>
					<Field
						label="Name"
						value={name}
						onValueChange={setName}
						maxLength={80}
						isDisabled={task.busy}
						autoComplete="name"
					/>
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
