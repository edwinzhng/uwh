import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { Button, Dialog, Field, Stack, Text } from "../design-system";
import { useTask } from "./use-task";

export const InviteMemberAction = ({
	personId,
	name,
}: {
	personId: string;
	name: string;
}): ReactElement => {
	const backend = useBackend();
	const task = useTask();
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [sent, setSent] = useState(false);
	return (
		<>
			<Button
				label="Invite"
				prefix="plus"
				variant="secondary"
				onPress={(): void => {
					task.clear();
					setOpen(true);
					setSent(false);
				}}
			/>
			<Dialog
				title={`Invite ${name}`}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Button
						label={sent ? "Done" : "Send invite"}
						isLoading={task.busy}
						isDisabled={!sent && !email.trim()}
						onPress={(): void => {
							if (sent) {
								setOpen(false);
								return;
							}
							void task.run(async (): Promise<void> => {
								if (!backend.invites)
									throw new Error("Connect to the club to send invites.");
								await backend.invites.create({ email, profile: { personId } });
								setSent(true);
							});
						}}
					/>
				}
			>
				<Stack>
					{sent ? (
						<Text>Invite queued. Check Members → Invites for delivery.</Text>
					) : (
						<Field
							label="Email"
							inputMode="email"
							autoComplete="email"
							value={email}
							onValueChange={setEmail}
							isDisabled={task.busy}
						/>
					)}
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
