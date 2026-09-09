import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import { Row, SectionHeading, Stack, Surface, Text } from "../design-system";
import type { Member } from "../domain/app-types";
import { TrackerField } from "./tracker-field";
export const MemberTrackers = ({
	member,
	editable,
}: {
	member: Member;
	editable: boolean;
}): ReactElement => {
	const { data } = useApp();
	const trackers = data.trackers.filter(
		(tracker) => tracker.id !== "membership",
	);
	return (
		<>
			{trackers.length ? (
				<Stack gap="sm">
					<SectionHeading>Member details</SectionHeading>
					<Surface>
						<Stack>
							{trackers.map((tracker) =>
								editable ? (
									<TrackerField
										key={tracker.id + member.id}
										member={member}
										tracker={tracker}
									/>
								) : (
									<Row key={tracker.id} justify="between" wrap>
										<Text variant="small">{tracker.name}</Text>
										<Text variant="small" tone="secondary">
											{tracker.kind === "check"
												? data.trackerValues[`${tracker.id}:${member.id}`] ===
													"yes"
													? "Yes"
													: "No"
												: data.trackerValues[`${tracker.id}:${member.id}`] ||
													"Missing"}
										</Text>
									</Row>
								),
							)}
						</Stack>
					</Surface>
				</Stack>
			) : undefined}
		</>
	);
};
