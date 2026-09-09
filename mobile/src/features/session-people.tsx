import type { ReactElement } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	ContentRow,
	Divider,
	Row,
	Stack,
	StaffSection,
	Surface,
	Text,
} from "../design-system";
import { canCoach, canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { AttendanceControl } from "./attendance-control";
import { AttendanceFlagControl } from "./attendance-flag-control";
import { AttendanceFlagProvider } from "./attendance-flag-provider";

export const SessionPeople = ({
	event,
}: {
	event: ClubEvent;
}): ReactElement => {
	const { data, account } = useApp();
	const staff = account.admin || canCoach(account, event.program);
	const members = data.members.filter((member) => canRegister(member, event));
	const going = members.filter(
		(member) => eventResponse(data, event.id, member.id).response === "going",
	).length;
	const expected = members.filter((member) => {
		const response = eventResponse(data, event.id, member.id);
		return response.response === "going";
	});
	const others = members.filter((member) => !expected.includes(member));
	const groups = [
		{ id: "going", label: `${going} going`, members: expected },
		{ id: "others", label: "Other players", members: others },
	];
	return (
		<AttendanceFlagProvider eventId={event.id}>
			<StaffSection
				staffRole={staff ? (canCoach(account) ? "coach" : "admin") : undefined}
			>
				<Stack gap="lg">
					{groups
						.filter((group) => group.members.length > 0)
						.map((group) => (
							<Stack key={group.id} gap="sm">
								<Text variant="label" tone="secondary">
									{group.label}
								</Text>
								<Surface padding="sm">
									<Stack gap="sm">
										{group.members.map((member, index) => {
											const response = eventResponse(data, event.id, member.id);
											const label =
												response.response === "going"
													? "Going"
													: response.response === "waiting"
														? "Waitlist"
														: response.response === "unavailable"
															? "Can’t go"
															: "No reply";
											return (
												<Stack key={member.id} gap="sm">
													{index > 0 ? <Divider /> : undefined}
													<ContentRow
														title={member.name}
														identity={staff ? undefined : member.name}
														description={
															staff && response.response !== "going"
																? label
																: undefined
														}
														control={
															staff ? (
																<Row wrap>
																	<AttendanceControl
																		eventId={event.id}
																		personId={member.id}
																		name={member.name}
																		value={response.attendance}
																		disabled={event.cancelled}
																	/>
																	<AttendanceFlagControl
																		personId={member.id}
																		name={member.name}
																		disabled={event.cancelled}
																	/>
																</Row>
															) : (
																<Badge label={label} />
															)
														}
													/>
												</Stack>
											);
										})}
									</Stack>
								</Surface>
							</Stack>
						))}
					{!members.length ? (
						<Text tone="secondary">No players</Text>
					) : undefined}
				</Stack>
			</StaffSection>
		</AttendanceFlagProvider>
	);
};
