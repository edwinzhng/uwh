import { type ReactElement, useState } from "react";
import type { MemberProfileState } from "../backend/use-member-profile";
import type { MemberProfile } from "../domain/member-profile";
import { MemberProfileForm } from "./member-profile-form";

export const MemberProfileSession = ({
	profile,
	state,
	onClose,
	photoOnly,
}: {
	profile: MemberProfile;
	state: MemberProfileState;
	onClose: () => void;
	photoOnly?: boolean;
}): ReactElement => {
	const [snapshot] = useState(profile);
	return (
		<MemberProfileForm
			profile={snapshot}
			state={state}
			onClose={onClose}
			photoOnly={photoOnly}
		/>
	);
};
