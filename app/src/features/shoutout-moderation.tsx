import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import { ActionMenu } from "../design-system";
import { ConfirmationDialog } from "./confirmation-dialog";

export const ShoutoutModeration = ({
	id,
}: {
	id: string;
}): ReactElement | undefined => {
	const { account, dispatch } = useApp();
	const { busy } = useAppStatus();
	const [confirming, setConfirming] = useState(false);
	if (!account.admin) return undefined;
	return (
		<>
			<ActionMenu
				label="Admin options"
				accessibilityLabel="Shoutout admin options"
				icon="more"
				isDisabled={busy}
				groups={[
					{
						id: "moderation",
						label: "Admin moderation",
						items: [
							{
								id: "remove",
								label: "Remove shoutout",
								icon: "trash",
								tone: "danger",
								onSelect: (): void => setConfirming(true),
							},
						],
					},
				]}
			/>
			{confirming ? (
				<ConfirmationDialog
					title="Remove shoutout?"
					description="This admin action removes the shoutout from the recipient’s profile."
					confirmLabel="Remove shoutout"
					danger
					isDisabled={busy}
					onConfirm={(): Promise<boolean> =>
						dispatch({ type: "delete-feedback", id })
					}
					onClose={(): void => setConfirming(false)}
				/>
			) : undefined}
		</>
	);
};
