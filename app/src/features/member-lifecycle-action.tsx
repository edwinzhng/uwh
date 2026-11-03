import type { ReactElement } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import type { Member } from "../domain/app-types";
import { ConfirmButton } from "./confirm-button";

export const MemberLifecycleAction = ({
	member,
	compact = false,
}: {
	member: Member;
	compact?: boolean;
}): ReactElement => {
	const { dispatch } = useApp();
	const { busy } = useAppStatus();
	return (
		<ConfirmButton
			label={member.archived ? "Restore member" : "Archive member"}
			icon={compact ? (member.archived ? "reply" : "archive") : undefined}
			variant="ghost"
			title={
				member.archived ? `Restore ${member.name}?` : `Archive ${member.name}?`
			}
			description={
				member.archived
					? "Return this profile to the active roster. Their history and account access are preserved."
					: "End future session commitments and move this profile out of the active roster. Their history and account access are preserved."
			}
			confirmLabel={member.archived ? "Restore member" : "Archive member"}
			isDisabled={busy}
			onConfirm={(): Promise<boolean> =>
				dispatch({
					type: "set-member-archived",
					personId: member.id,
					archived: !member.archived,
				})
			}
		/>
	);
};
