import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Grid, Stack, Surface, Text } from "../design-system";
import { canReadProgress } from "../domain/app-rules";
import type { Member } from "../domain/app-types";

export const MemberProfileDetails = ({
	member,
}: {
	member: Member;
}): ReactElement => {
	const { account } = useApp();
	return (
		<Stack gap="lg">
			<Surface header={<Text variant="h4">Player profile</Text>}>
				<Grid>
					<Stack gap="xxs">
						<Text variant="caption" tone="secondary">
							Programs
						</Text>
						<Text>
							{member.programs
								.map((program) =>
									program === "club"
										? "Club"
										: program === "youth"
											? "Youth"
											: program,
								)
								.join(" · ") || "No programs assigned"}
						</Text>
					</Stack>
					<Stack gap="xxs">
						<Text variant="caption" tone="secondary">
							Playing position
						</Text>
						<Text>{member.position || "Not set"}</Text>
					</Stack>
				</Grid>
			</Surface>
			{canReadProgress(account, member) ? (
				<Surface header={<Text variant="h4">Current goal</Text>}>
					<Text>{member.goal || "No goal set yet."}</Text>
				</Surface>
			) : undefined}
		</Stack>
	);
};
