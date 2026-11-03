import type { ReactElement } from "react";
import { usePreviewMemberProfile } from "../backend/use-member-profile";
import type { Member } from "../domain/app-types";
import { MemberProfileCard } from "./member-profile-card";
import { MemberProfileDialog } from "./member-profile-dialog";

export const MemberProfilePreview = ({
	member,
	editor,
}: {
	member: Member;
	editor?: { onClose: () => void };
}): ReactElement | undefined => {
	const state = usePreviewMemberProfile(member);
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
