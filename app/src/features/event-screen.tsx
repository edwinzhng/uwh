import { useLocalSearchParams, useRouter } from "expo-router";
import { type ReactElement, useState } from "react";
import { useApp, useAppStatus } from "../demo/app-state";
import {
	ActionMenu,
	Badge,
	Button,
	Dialog,
	EmptyState,
	formatTimeLocation,
	Row,
	SegmentedControl,
	Stack,
	Surface,
	TabContent,
	Tabs,
	Text,
} from "../design-system";
import { canCoach, formatDate, formatTime } from "../domain/app-rules";
import { availableLoanPractice } from "../domain/equipment-loans";
import { eventTimeRange } from "../domain/event-card-presentation";
import { eventKindLabel, practiceEvent } from "../domain/event-types";
import { venueName } from "../domain/venue";
import { ClubShell } from "./club-shell";
import { EquipmentLoanDialog } from "./equipment-loan-dialog";
import { EventEditor } from "./event-editor";
import { PracticeOverview } from "./practice-overview";
import { ResponseControl } from "./response-control";
import { SessionCoaching } from "./session-coaching";
import { SessionDiscussionButton } from "./session-discussion-button";
import { SessionGuestManager } from "./session-guest-manager";
import { SessionPeople } from "./session-people";
import { SessionSeriesLink } from "./session-series-link";
import { TournamentPeople } from "./tournament-people";
import { TournamentSummary } from "./tournament-summary";

export const EventScreen = (): ReactElement => {
	const {
		event: eventId,
		id: legacyId,
		tab: selectedTab,
		part: selectedPart,
	} = useLocalSearchParams<{
		id?: string;
		event?: string;
		tab?: string;
		part?: string;
	}>();
	const id = eventId ?? legacyId;
	const { data, account, dispatch } = useApp();
	const { busy } = useAppStatus();
	const router = useRouter();
	const event = data.events.find((entry) => entry.id === id);
	const partId = event?.parts?.some((part) => part.id === selectedPart)
		? selectedPart
		: undefined;
	const tab = selectedTab ?? "overview";
	const setTab = (tab: string): void => router.setParams({ tab });
	const [cancel, setCancel] = useState(false);
	const [edit, setEdit] = useState(false);
	const [loan, setLoan] = useState(false);
	const coach = event
		? practiceEvent(event) && canCoach(account, event.program)
		: false;
	const activeTab =
		tab === "people"
			? "people"
			: tab === "coaching" && coach
				? "coaching"
				: "overview";
	return (
		<ClubShell
			roleTone={activeTab === "coaching" ? "coach" : undefined}
			actionPlacement="inline"
			tabs={
				<Tabs
					page
					label="Event"
					hideLabel
					value={activeTab}
					onValueChange={setTab}
					options={[
						{ value: "overview", label: "Overview" },
						{
							value: "people",
							label:
								event?.kind === "tournament" ? "Availability" : "Attendance",
						},
						...(coach
							? [
									{
										value: "coaching",
										label: "Coaching",
										roleTone: "coach" as const,
									},
								]
							: []),
					]}
				/>
			}
			title={event?.title ?? "Event not found"}
			subtitle={
				event
					? `${formatDate(event.date)} · ${formatTimeLocation(event.endDate && event.endDate !== event.date ? `${formatTime(event.start)}–${formatDate(event.endDate)} ${formatTime(event.end)}` : eventTimeRange(event.start, event.end), venueName(event.venue))}`
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
					<ActionMenu
						label="Event actions"
						accessibilityLabel={`Actions for ${event.title}`}
						icon="more"
						isDisabled={busy}
						groups={[
							{
								id: "edit",
								label: "Admin",
								items: [
									{
										id: "edit",
										label: "Edit event",
										icon: "edit",
										onSelect: (): void => setEdit(true),
									},
									...(availableLoanPractice(event, Date.now(), data.timeZone)
										? [
												{
													id: "loan",
													label: "Loan equipment",
													icon: "equipment" as const,
													onSelect: (): void => setLoan(true),
												},
											]
										: []),
								],
							},
							{
								id: "cancel",
								items: [
									{
										id: "cancel",
										label: "Cancel event",
										icon: "close",
										tone: "danger",
										onSelect: (): void => setCancel(true),
									},
								],
							},
						]}
					/>
				) : undefined
			}
		>
			{event ? (
				<>
					<TabContent value={activeTab}>
						{activeTab === "overview" ? (
							practiceEvent(event) ? (
								<PracticeOverview event={event} />
							) : (
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
												<Badge label={eventKindLabel(event.kind)} />
												{event.seriesId ? (
													<Badge label="Recurring" />
												) : undefined}
											</Row>
											<Text variant="h4">{event.venue}</Text>
											<Text variant="small">{event.description}</Text>
											{event.parts?.map((part) => (
												<Text key={part.id} variant="small" tone="secondary">
													{part.title} · {formatTime(part.start)}–
													{formatTime(part.end)}
												</Text>
											))}
											<ResponseControl event={event} />
											<SessionDiscussionButton event={event} />
											{account.admin && event.seriesId ? (
												<SessionGuestManager event={event} />
											) : undefined}
											{event.seriesId ? (
												<SessionSeriesLink seriesId={event.seriesId} />
											) : undefined}
										</Stack>
									</Surface>
									{event.kind === "tournament" ? (
										<TournamentSummary event={event} />
									) : undefined}
								</Stack>
							)
						) : activeTab === "people" ? (
							event.kind === "tournament" ? (
								<TournamentPeople event={event} />
							) : (
								<Stack>
									{event.parts?.length ? (
										<SegmentedControl
											label="Practice part"
											value={partId ?? "all"}
											onValueChange={(part): void => router.setParams({ part })}
											options={[
												{ value: "all", label: "All" },
												...event.parts.map((part) => ({
													value: part.id,
													label: part.title,
												})),
											]}
										/>
									) : undefined}
									<SessionPeople
										key={`${event.id}:${partId}`}
										event={event}
										partId={partId}
									/>
								</Stack>
							)
						) : (
							<SessionCoaching key={event.id} event={event} />
						)}
					</TabContent>
					<Dialog
						intent="confirmation"
						isDismissDisabled={busy}
						title="Cancel this event?"
						isOpen={cancel}
						onOpenChange={(value): void => {
							if (!busy) setCancel(value);
						}}
						footer={
							<Row>
								<Button
									label="Keep event"
									variant="ghost"
									isDisabled={busy}
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
					{loan && account.admin ? (
						<EquipmentLoanDialog
							practice={event}
							onClose={(): void => setLoan(false)}
						/>
					) : undefined}
				</>
			) : (
				<EmptyState title="Event unavailable" />
			)}
		</ClubShell>
	);
};
