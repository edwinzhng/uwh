import type { ReactElement } from "react";
import { usePreviewHousehold } from "../backend/use-household";
import type { Member } from "../domain/app-types";
import { GuardianInviteForm } from "./guardian-invite-form";

export const GuardianInvitePreview = ({
	member,
}: {
	member: Member;
}): ReactElement | undefined => (
	<GuardianInviteForm member={member} service={usePreviewHousehold()} />
);
