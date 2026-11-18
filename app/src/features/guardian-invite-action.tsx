import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { RoleScope } from "../design-system";
import type { Member } from "../domain/app-types";
import { GuardianInviteLive } from "./guardian-invite-live";
import { GuardianInvitePreview } from "./guardian-invite-preview";

export const GuardianInviteAction = ({
	member,
}: {
	member: Member;
}): ReactElement | undefined => {
	const { source, account } = useApp();
	if (!account.admin || member.archived || member.mergedInto) return undefined;
	return (
		<RoleScope tone="admin">
			{source === "convex" ? (
				<GuardianInviteLive member={member} />
			) : (
				<GuardianInvitePreview member={member} />
			)}
		</RoleScope>
	);
};
