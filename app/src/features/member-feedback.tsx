import type { ReactElement } from "react";
import { Stack } from "../design-system";
import type { Member } from "../domain/app-types";
import { PersonalClips } from "./personal-clips";
import { SessionPerformance } from "./session-performance";

export const MemberFeedback = ({
	member,
}: {
	member: Member;
}): ReactElement => (
	<Stack gap="lg">
		<SessionPerformance member={member} inlineNotes visibleKind="coach" />
		<PersonalClips member={member} />
	</Stack>
);
