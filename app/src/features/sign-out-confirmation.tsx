import type { ReactElement } from "react";
import { useBackend } from "../backend/context";
import { ConfirmationDialog } from "./confirmation-dialog";

export const SignOutConfirmation = ({
	onClose,
}: {
	onClose: () => void;
}): ReactElement => {
	const backend = useBackend();
	return (
		<ConfirmationDialog
			title="Sign out?"
			description="Sign out of your account on this device?"
			confirmLabel="Sign out"
			isDisabled={!backend.signOut}
			onClose={onClose}
			onConfirm={async (): Promise<void> => {
				if (backend.signOut) await backend.signOut();
			}}
		/>
	);
};
