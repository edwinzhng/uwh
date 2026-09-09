import { type ReactElement, useState } from "react";
import { useBackend } from "../backend/context";
import { newId, useApp } from "../demo/app-state";
import { Button, Dialog, Field, Stack, Text, Toggle } from "../design-system";
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
	const { dispatch, busy } = useApp();
	const backend = useBackend();
	const task = useTask();
	const [id] = useState(newId);
	const [email, setEmail] = useState("");
	const [name, setName] = useState("");
	const [player, setPlayer] = useState(true);
	const [fee, setFee] = useState("160");
	const save = async (): Promise<void> => {
		if (email.trim()) {
			if (
				await task.run(async (): Promise<void> => {
					if (!backend.invites)
						throw new Error("Connect to the club to send invites.");
					await backend.invites.create({
						email,
						profile: {
							id,
							name,
							player,
							charge: Math.round(Number(fee) * 100),
						},
					});
				})
			) {
				onInvited?.();
				onClose();
			}
			return;
		}
		if (
			await dispatch({
				type: "add-member",
				member: {
					id,
					name: name.trim(),
					programs: player ? ["club"] : [],
					position: player ? "Player" : "Member",
					rating: 3,
					registration: "missing",
					goal: "Set a first development goal",
					steps: 0,
				},
				charge: Math.round(Number(fee) * 100),
			})
		) {
			setName("");
			onClose();
		}
	};
	return (
		<Dialog
			staffRole="admin"
			title="New member"
			isOpen={open}
			onOpenChange={(value): void => {
				if (!value && !busy && !task.busy) onClose();
			}}
			footer={
				<Button
					label={email.trim() ? "Send invite" : "Add member"}
					isLoading={busy || task.busy}
					isDisabled={
						!name.trim() || !Number.isFinite(Number(fee)) || Number(fee) < 0
					}
					onPress={(): void => {
						void save();
					}}
				/>
			}
		>
			<Stack>
				<Field label="Full name" value={name} onValueChange={setName} />
				<Field
					label="Email (optional)"
					inputMode="email"
					autoComplete="email"
					value={email}
					onValueChange={setEmail}
					hint="Send a signup invite to this club."
				/>
				<Toggle label="Player" value={player} onValueChange={setPlayer} />
				<Field label="Season fee (CAD)" value={fee} onValueChange={setFee} />
				{task.error ? (
					<Text variant="small" tone="danger">
						{task.error}
					</Text>
				) : undefined}
			</Stack>
		</Dialog>
	);
};
