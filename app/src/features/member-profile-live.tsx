import type { ReactElement } from "react";
import { useLiveMemberProfile } from "../backend/use-member-profile";
import type { Member } from "../domain/app-types";
import { MemberProfileCard } from "./member-profile-card";
import { MemberProfileDialog } from "./member-profile-dialog";

export const MemberProfileLive = ({
	member,
	editor,
}: {
	member: Member;
	editor?: { onClose: () => void };
}): ReactElement | undefined => {
	const state = useLiveMemberProfile(member);
	return editor ? (
		<MemberProfileDialog
			name={member.name}
			state={state}
			onClose={editor.onClose}
		/>
	) : (
		<MemberProfileCard member={member} state={state} />
	);
};
