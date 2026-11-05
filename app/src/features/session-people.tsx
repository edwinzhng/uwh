import { type ReactElement, useContext } from "react";
import { useApp } from "../demo/app-state";
import {
	ContentRow,
	Divider,
	EmptyState,
	Row,
	Stack,
	Surface,
	Text,
} from "../design-system";
import { canCoach, canRegister, eventResponse } from "../domain/app-rules";
import type { ClubEvent } from "../domain/app-types";
import { effectiveAttendance } from "../domain/effective-attendance";
import { participatesInPart } from "../domain/practice-parts";
import { AttendanceControl } from "./attendance-control";
import { AttendanceFlagContext } from "./attendance-flag-context";
import { AttendanceFlagControl } from "./attendance-flag-control";
import { AttendanceFlagProvider } from "./attendance-flag-provider";
import { ShoutoutEditor } from "./shoutout-editor";

const SessionPeopleContent = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => {
	const { data, account } = useApp();
	const flags = useContext(AttendanceFlagContext);
	const staff = account.admin || canCoach(account, event.program);
	const members = data.members.filter((member) => canRegister(member, event));
	const expected = members.filter((member) => {
		const response = eventResponse(data, event.id, member.id);
		return (
			["present", "late"].includes(
				effectiveAttendance(event, response, partId),
			) ||
			(effectiveAttendance(event, response, partId) !== "absent" &&
				response.response === "going" &&
				participatesInPart(response, partId)) ||
			flags?.flags.some(
				(flag) => flag.personId === member.id && flag.kind === "addition",
			)
		);
	});
	const going = expected.length;
	const others = members.filter((member) => !expected.includes(member));
	const groups = [
		{ id: "going", label: `${going} going`, members: expected },
		{ id: "others", label: "Not going", members: others },
	];
	return (
		<Stack gap="xl">
			{groups
				.filter((group) => group.members.length > 0)
				.map((group) => (
					<Stack key={group.id} gap="sm">
						<Text variant="label" tone="secondary">
							{group.label}
						</Text>
						<Surface>
							<Stack gap="sm">
								{group.members.map((member, index) => {
									const response = eventResponse(data, event.id, member.id);
									return (
										<Stack key={member.id} gap="sm">
											{index > 0 ? <Divider /> : undefined}
											<ContentRow
												title={member.name}
												titleLines={1}
												identity={member.name}
												identityId={member.id}
												controlLayout={staff ? "responsive" : "inline"}
												headerAction={
													staff && group.id === "going" ? (
														<AttendanceFlagControl
															personId={member.id}
															name={member.name}
															disabled={event.cancelled}
														/>
													) : undefined
												}
												description={
													flags?.flags.find(
														(flag) => flag.personId === member.id,
													)?.kind === "addition"
														? "Late addition"
														: flags?.flags.find(
																	(flag) => flag.personId === member.id,
																)?.kind === "cancellation"
															? "Late cancellation"
															: undefined
												}
												control={
													<Row gap="xs" wrap>
														{canCoach(account, event.program) ? (
															<AttendanceControl
																eventId={event.id}
																personId={member.id}
																name={member.name}
																value={effectiveAttendance(
																	event,
																	response,
																	partId,
																)}
																defaultHere={group.id === "going"}
																partId={partId}
																disabled={event.cancelled}
																onLateAddition={
																	group.id === "others" && flags
																		? (): void =>
																				flags.set(member.id, "addition")
																		: undefined
																}
																onAbsent={
																	flags
																		? (): void => flags.set(member.id)
																		: undefined
																}
															/>
														) : undefined}
														{group.id === "going" ? (
															<ShoutoutEditor
																personId={member.id}
																event={event}
																label="Shoutout"
																compact
															/>
														) : undefined}
													</Row>
												}
											/>
										</Stack>
									);
								})}
							</Stack>
						</Surface>
					</Stack>
				))}
			{!members.length ? <EmptyState title="No eligible players" /> : undefined}
		</Stack>
	);
};

export const SessionPeople = ({
	event,
	partId,
}: {
	event: ClubEvent;
	partId?: string;
}): ReactElement => (
	<AttendanceFlagProvider eventId={event.id}>
		<SessionPeopleContent event={event} partId={partId} />
	</AttendanceFlagProvider>
);
