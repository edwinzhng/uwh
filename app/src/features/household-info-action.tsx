import type { ReactElement } from "react";
import type { Member } from "../domain/app-types";
import { MemberProfile } from "./member-profile";

export const HouseholdInfoAction = ({
	person,
	onClose,
}: {
	person: Member;
	onClose: () => void;
}): ReactElement => <MemberProfile member={person} editor={{ onClose }} />;
