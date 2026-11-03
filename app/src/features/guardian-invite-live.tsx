import type { ReactElement } from "react";
import { useLiveHousehold } from "../backend/use-household";
import type { Member } from "../domain/app-types";
import { GuardianInviteForm } from "./guardian-invite-form";

export const GuardianInviteLive = ({
	member,
}: {
	member: Member;
}): ReactElement | undefined => (
	<GuardianInviteForm member={member} service={useLiveHousehold()} />
);
