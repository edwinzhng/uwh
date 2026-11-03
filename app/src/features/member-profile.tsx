import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import type { Member } from "../domain/app-types";
import { MemberProfileLive } from "./member-profile-live";
import { MemberProfilePreview } from "./member-profile-preview";

export const MemberProfile = ({
	member,
	editor,
}: {
	member: Member;
	editor?: { onClose: () => void };
}): ReactElement | undefined => {
	const { source } = useApp();
	return source === "convex" ? (
		<MemberProfileLive member={member} editor={editor} />
	) : (
		<MemberProfilePreview member={member} editor={editor} />
	);
};
