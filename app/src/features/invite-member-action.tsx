import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import {
	actionToast,
	Button,
	Dialog,
	Field,
	Stack,
	Text,
} from "../design-system";
import { inviteEmail, inviteEmailError } from "../domain/invitations";
import { useFormTask } from "./use-form-task";

export const InviteMemberAction = ({
	personId,
	name,
}: {
	personId: string;
	name: string;
}): ReactElement => {
	const backend = useBackend();
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const task = useFormTask();
	const submit = (): void => {
		void task.submit(
			() => inviteEmailError(email),
			async (): Promise<void> => {
				if (!backend.invites)
					throw new Error("Connect to the club to send invites.");
				const address = inviteEmail(email);
				await backend.invites.create({ email: address, profile: { personId } });
				actionToast("sentInvite", "success", { subject: address });
				setOpen(false);
				setEmail("");
			},
		);
	};
	return (
		<>
			<Button
				label="Invite to app"
				prefix="plus"
				variant="secondary"
				onPress={(): void => {
					task.clear();
					setOpen(true);
				}}
			/>
			<Dialog
				intent="form"
				isDismissDisabled={task.busy}
				title={`Connect an account for ${name}`}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Button label="Send invite" isLoading={task.busy} onPress={submit} />
				}
			>
				<Stack>
					<Field
						label="Email"
						inputMode="email"
						autoComplete="email"
						value={email}
						onValueChange={setEmail}
						onSubmit={submit}
						isDisabled={task.busy}
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
