import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { newId } from "../demo/app-state";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

export const MemberEditor = ({
	open,
	onClose,
	onInvited,
}: {
	open: boolean;
	onClose: () => void;
	onInvited?: () => void;
}): ReactElement => {
	const backend = useBackend();
	const task = useTask("sentInvite");
	const [id] = useState(newId);
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const valid = Boolean(
		name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
	);
	const save = async (): Promise<void> => {
		if (!valid || task.busy) return;
		if (
			await task.run(async (): Promise<void> => {
				if (!backend.invites)
					throw new Error("Connect to the club to send invites.");
				await backend.invites.create({
					email: email.trim(),
					profile: { id, name: name.trim(), player: true, charge: 0 },
				});
			})
		) {
			onInvited?.();
			onClose();
		}
	};
	return (
		<Dialog
			staffRole="admin"
			title="Invite member"
			isOpen={open}
			onOpenChange={(value): void => {
				if (!value && !task.busy) onClose();
			}}
			footer={
				<Button
					label="Send invite"
					isLoading={task.busy}
					validationError={!valid ? "Check the required fields" : undefined}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Field label="Name" value={name} onValueChange={setName} />
				<Field
					label="Email"
					inputMode="email"
					autoComplete="email"
					value={email}
					onValueChange={setEmail}
				/>
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
