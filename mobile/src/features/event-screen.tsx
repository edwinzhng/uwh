import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp } from "../demo/app-state";
import {
	Badge,
	Button,
	Dialog,
	Row,
	SegmentedControl,
	Stack,
	StaffSection,
	Surface,
	Text,
} from "../design-system";
import { canCoach, formatDate, formatTime } from "../domain/app-rules";
import { ClubShell } from "./club-shell";
import { EventEditor } from "./event-editor";
import { ResponseControl } from "./response-control";
import { SessionCoaching } from "./session-coaching";
import { SessionPeople } from "./session-people";
import { TeamPanel } from "./team-panel";

export const EventScreen = (): ReactElement => {
	const {
		event: eventId,
		id: legacyId,
		tab: selectedTab,
	} = useLocalSearchParams<{
		id?: string;
		event?: string;
		tab?: string;
	}>();
	const id = eventId ?? legacyId;
	const { data, account, dispatch, busy } = useApp();
	const router = useRouter();
	const event = data.events.find((entry) => entry.id === id);
	const tab = selectedTab ?? "overview";
	const setTab = (tab: string): void => router.setParams({ tab });
	const [cancel, setCancel] = useState(false);
	const [edit, setEdit] = useState(false);
	const coach = event ? canCoach(account, event.program) : false;
	const activeTab =
		tab === "people"
			? "people"
			: tab === "coaching" && coach
				? "coaching"
				: "overview";
	return (
		<ClubShell
			title={event?.title ?? "Event not found"}
			subtitle={
				event
					? formatDate(event.date) +
						" · " +
						formatTime(event.start) +
						"–" +
						formatTime(event.end)
					: undefined
			}
			back={
				<Row>
					<Button
						label="Schedule"
						prefix="arrowLeft"
						variant="ghost"
						onPress={(): void => router.navigate("/schedule")}
					/>
				</Row>
			}
			action={
				account.admin && event && !event.cancelled ? (
					<Row gap="xs">
						<Button
							label="Edit"
							staffRole="admin"
							prefix="edit"
							variant="secondary"
							onPress={(): void => setEdit(true)}
						/>
						<Button
							label="Cancel event"
							variant="ghost"
							onPress={(): void => setCancel(true)}
						/>
					</Row>
				) : undefined
			}
		>
			{event ? (
				<>
					<SegmentedControl
						label="Event"
						hideLabel
						value={activeTab}
						onValueChange={setTab}
						options={[
							{ value: "overview", label: "Overview" },
							{
								value: "people",
								label: "Attendance",
							},
							...(coach ? [{ value: "coaching", label: "Coaching" }] : []),
						]}
					/>
					{activeTab === "overview" ? (
						<Stack>
							<Surface>
								<Stack>
									<Row gap="xs" wrap>
										<Badge
											label={
												data.seasons.find(
													(season) =>
														season.id === (event.seasonId ?? "2026-2027"),
												)?.name ?? "2026–2027"
											}
										/>
										{event.seriesId ? <Badge label="Recurring" /> : undefined}
									</Row>
									<Text variant="h4">{event.venue}</Text>
									<Text variant="small">{event.description}</Text>
									<Text variant="caption" tone="secondary">
										Calgary time
									</Text>
									<ResponseControl event={event} />
								</Stack>
							</Surface>
							<TeamPanel event={event} readOnly />
						</Stack>
					) : activeTab === "people" ? (
						<SessionPeople event={event} />
					) : (
						<StaffSection staffRole="coach">
							<SessionCoaching event={event} />
						</StaffSection>
					)}
					<Dialog
						title="Cancel this event?"
						isOpen={cancel}
						onOpenChange={setCancel}
						footer={
							<Row>
								<Button
									label="Keep event"
									variant="ghost"
									onPress={(): void => setCancel(false)}
								/>
								<Button
									label="Cancel event"
									variant="danger"
									isLoading={busy}
									onPress={(): void => {
										void dispatch({
											type: "cancel-event",
											eventId: event.id,
										}).then((saved) => {
											if (saved) setCancel(false);
										});
									}}
								/>
							</Row>
						}
					>
						<Text variant="small">
							{event.title} · {formatDate(event.date)}. Attendance history will
							be kept.
						</Text>
					</Dialog>
					{edit && account.admin ? (
						<EventEditor
							key={event.id}
							event={event}
							open
							onClose={(): void => setEdit(false)}
						/>
					) : undefined}
				</>
			) : (
				<Text tone="secondary">Choose another event from Schedule.</Text>
			)}
		</ClubShell>
	);
};
