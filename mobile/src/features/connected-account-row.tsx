import type { FunctionReturnType } from "convex/server";
import { type ReactElement, useState } from "react";
import type { api } from "../../convex/_generated/api";
import { useBackend } from "../backend/context";
import { Button, ContentRow, Dialog, Stack, Text } from "../design-system";
import { providerName, type SocialProvider } from "../domain/social-auth";
import { useTask } from "./use-task";

export const ConnectedAccountRow = ({
	provider,
	account,
}: {
	provider: SocialProvider;
	account?: FunctionReturnType<
		typeof api.connected_accounts.list
	>["accounts"][number];
}): ReactElement => {
	const social = useBackend().social;
	const task = useTask();
	const [open, setOpen] = useState(false);
	const name = providerName(provider);
	return (
		<Stack gap="sm">
			<ContentRow
				title={name}
				description={
					account
						? account.email || "Connected"
						: social?.info?.[provider]
							? "Not connected"
							: "Unavailable"
				}
				control={
					<Button
						label={account ? "Disconnect" : "Connect"}
						variant="ghost"
						isLoading={task.busy}
						isDisabled={
							account ? !account.canDisconnect : !social?.info?.[provider]
						}
						onPress={(): void => {
							if (account) setOpen(true);
							else
								void task.run(async (): Promise<void> => {
									await social?.connect(provider);
								});
						}}
					/>
				}
			/>
			<Dialog
				title={`Disconnect ${name}?`}
				isOpen={open}
				onOpenChange={(value): void => {
					if (!task.busy) setOpen(value);
				}}
				footer={
					<Button
						label="Disconnect"
						variant="danger"
						isLoading={task.busy}
						onPress={(): void => {
							void task.run(async (): Promise<void> => {
								if (account) await social?.disconnect(account.id);
								setOpen(false);
							});
						}}
					/>
				}
			>
				<Text>
					You’ll use your other sign-in method. Other devices will be signed
					out.
				</Text>
				{task.error ? (
					<Text tone="danger" variant="small">
						{task.error}
					</Text>
				) : undefined}
			</Dialog>
			{task.error && !open ? (
				<Text tone="danger" variant="small">
					{task.error}
				</Text>
			) : undefined}
		</Stack>
	);
};
