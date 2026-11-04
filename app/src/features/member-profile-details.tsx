import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { EmptyState, Stack, Surface, Text } from "../design-system";
import { canReadProgress } from "../domain/app-rules";
import type { Member } from "../domain/app-types";
import { MemberProfile } from "./member-profile";

export const MemberProfileDetails = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { account } = useApp();
	return (
		<Stack gap="lg">
			<MemberProfile member={member} />
			{canReadProgress(account, member) ? (
				<Surface header={<Text variant="h4">Current goal</Text>}>
					{member.goal ? (
						<Text>{member.goal}</Text>
					) : (
						<EmptyState title="No goal" />
					)}
				</Surface>
			) : undefined}
		</Stack>
	);
};
